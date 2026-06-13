import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeMessage, decodeMessage, ProtocolError } from '@p2p-share/shared';
import { MessageType, PROTOCOL_CONSTANTS } from '@p2p-share/shared';
import type { DataChannelMessage, FileMetaMessage } from '@p2p-share/shared';
import { FileChunker } from '../services/file-chunker';
import { computeSHA256, computeSHA256FromChunks, areHashesEqual } from '../services/sha256';
import { reassembleFile, triggerDownload } from '../services/file-download';
import { encryptChunk, decryptChunk } from '../services/encryption';
import { getEncryptionKey } from '../services/data-channel-registry';
import { saveCheckpoint, deleteCheckpoint, getCheckpoint } from '../services/checkpoint-store';
import { useTransferStore } from '../stores/transferStore';
import { useUIStore } from '../stores/uiStore';

interface UseFileTransferOptions {
  dataChannel: RTCDataChannel | null;
  roomId?: string;
}

export function useFileTransfer({ dataChannel, roomId = '' }: UseFileTransferOptions) {
  const [error, setError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [receivedFileMeta, setReceivedFileMeta] = useState<FileMetaMessage | null>(null);

  const chunkerRef = useRef<FileChunker | null>(null);
  const inFlightRef = useRef<Set<number>>(new Set());
  const windowSizeRef = useRef(PROTOCOL_CONSTANTS.MIN_WINDOW_SIZE);
  const cancelledRef = useRef(false);
  const sendResolveRef = useRef<((value: boolean) => void) | null>(null);
  const fileMetaRef = useRef<FileMetaMessage | null>(null);
  const lastSaveRef = useRef(0);
  const roomIdRef = useRef('');

  const transferStore = useTransferStore();
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const sendMessage = useCallback((msg: ArrayBuffer) => {
    if (dataChannel?.readyState !== 'open') return false;
    if (dataChannel.bufferedAmount > PROTOCOL_CONSTANTS.MAX_BUFFERED_AMOUNT) return false;
    try {
      dataChannel.send(msg);
      return true;
    } catch {
      return false;
    }
  }, [dataChannel]);

  const waitForBufferedAmountLow = useCallback(() => {
    if (!dataChannel || dataChannel.bufferedAmount <= PROTOCOL_CONSTANTS.MAX_BUFFERED_AMOUNT) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const handler = () => {
        dataChannel.removeEventListener('bufferedamountlow', handler);
        resolve();
      };
      dataChannel.addEventListener('bufferedamountlow', handler);
    });
  }, [dataChannel]);

  const sendFile = useCallback(async (file: File) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      setError('DataChannel not open');
      return;
    }

    cancelledRef.current = false;
    setIsTransferring(true);
    setError(null);

    transferStore.setTransferPhase('hashing');

    const fileBuffer = await file.arrayBuffer();
    const fileHash = await computeSHA256(fileBuffer);

    transferStore.setSha256Hash(Array.from(fileHash).map((b) => b.toString(16).padStart(2, '0')).join(''));

    const chunker = new FileChunker(file);
    chunkerRef.current = chunker;

    const totalChunks = chunker.getTotalChunks();
    const chunkSize = chunker.getChunkSize();

    transferStore.setFileMetadata({
      fileName: chunker.getFileName(),
      fileSize: chunker.getFileSize(),
      fileType: chunker.getFileType(),
    });
    transferStore.setTransferPhase('meta');
    transferStore.setProgress({
      totalChunks,
      chunkSizeBytes: chunkSize,
    });
    const metaMsg: FileMetaMessage = {
      type: MessageType.FILE_META,
      fileName: chunker.getFileName(),
      fileSize: BigInt(chunker.getFileSize()),
      mimeType: chunker.getFileType(),
      sha256Hash: fileHash,
      totalChunks,
      chunkSize,
    };

    dataChannel.send(encodeMessage(metaMsg));

    const metaAck = await new Promise<boolean>((resolve) => {
      sendResolveRef.current = resolve;
      setTimeout(() => resolve(false), PROTOCOL_CONSTANTS.META_ACK_TIMEOUT_MS);
    });

    if (!metaAck) {
      setError('File metadata not acknowledged');
      setIsTransferring(false);
      return;
    }

    if (roomId) {
      await saveCheckpoint(roomId, {
        role: 'sender',
        fileName: chunker.getFileName(),
        fileSize: chunker.getFileSize(),
        totalChunks,
        lastSentChunk: 0,
        lastReceivedChunk: 0,
        lastAcknowledgedChunk: 0,
        totalBytesSent: 0,
        timestamp: Date.now(),
      });
    }

    transferStore.setTransferPhase('transferring');
    inFlightRef.current.clear();
    windowSizeRef.current = PROTOCOL_CONSTANTS.MIN_WINDOW_SIZE;

    if (roomId) {
      const cp = await getCheckpoint(roomId);
      if (cp && cp.lastAcknowledgedChunk > 0) {
        chunker.seek(cp.lastAcknowledgedChunk + 1);
        const skippedBytes = (cp.lastAcknowledgedChunk + 1) * chunkSize;
        transferStore.setProgress({
          chunksSent: cp.lastAcknowledgedChunk + 1,
          chunksAcknowledged: cp.lastAcknowledgedChunk + 1,
          bytesTransferred: skippedBytes,
          lastAcknowledgedChunk: cp.lastAcknowledgedChunk,
        });
        inFlightRef.current.clear();
      }
    }

    while (!cancelledRef.current) {
      const chunk = await chunker.readNextChunk();
      if (!chunk) break;

      const key = getEncryptionKey();
      const chunkData = key ? await encryptChunk(chunk.data, key, chunk.sequence) : chunk.data;

      const encoded = encodeMessage({
        type: MessageType.CHUNK,
        sequence: chunk.sequence,
        data: chunkData,
      });

      await waitForBufferedAmountLow();

      while (inFlightRef.current.size >= windowSizeRef.current && !cancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      if (cancelledRef.current) break;

      if (sendMessage(encoded)) {
        inFlightRef.current.add(chunk.sequence);
        transferStore.incrementChunksSent();
        transferStore.updateSpeed(chunk.data.length, 100);
        transferStore.setProgress({ lastAcknowledgedChunk: -1 });
        if (roomId && chunk.sequence % 10 === 0) {
          const p = transferStore;
          saveCheckpoint(roomId, {
            role: 'sender',
            fileName: chunker.getFileName(),
            fileSize: chunker.getFileSize(),
            totalChunks,
            lastSentChunk: chunk.sequence,
            lastReceivedChunk: 0,
            lastAcknowledgedChunk: p.lastAcknowledgedChunk,
            totalBytesSent: p.bytesTransferred,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (cancelledRef.current) {
      setIsTransferring(false);
      return;
    }

    while (inFlightRef.current.size > 0 && !cancelledRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (cancelledRef.current) {
      setIsTransferring(false);
      return;
    }

    transferStore.setTransferPhase('verifying');

    dataChannel.send(encodeMessage({
      type: MessageType.VERIFY_REQUEST,
      senderHash: fileHash,
    }));

    const verifyResult = await new Promise<boolean>((resolve) => {
      sendResolveRef.current = (match: boolean) => resolve(match);
      setTimeout(() => resolve(false), PROTOCOL_CONSTANTS.VERIFY_TIMEOUT_MS);
    });

    if (verifyResult) {
      transferStore.setTransferPhase('complete');
      addNotification({ type: 'success', title: 'Transfer complete', durationMs: 5000 });
    } else {
      transferStore.setTransferPhase('error');
      transferStore.setTransferError('File verification failed');
      setError('File verification failed');
    }

    setIsTransferring(false);
    if (roomIdRef.current) {
      deleteCheckpoint(roomIdRef.current);
    }
  }, [dataChannel, transferStore, addNotification, sendMessage, waitForBufferedAmountLow]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    chunkerRef.current?.abort();
    if (dataChannel?.readyState === 'open') {
      try {
        dataChannel.send(encodeMessage({
          type: MessageType.CANCEL,
          reason: 0x0001,
          message: 'User cancelled transfer',
        }));
      } catch {
        /* ignore */
      }
    }
    transferStore.setTransferPhase('cancelled');
    setIsTransferring(false);
    if (roomIdRef.current) {
      deleteCheckpoint(roomIdRef.current);
    }
  }, [dataChannel, transferStore]);

  useEffect(() => {
    if (!dataChannel) return;

    dataChannel.binaryType = 'arraybuffer';
    const receivedChunks = new Map<number, Uint8Array>();

    const handleMessage = async (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;

      let msg: DataChannelMessage;
      try {
        msg = decodeMessage(event.data);
      } catch (err: unknown) {
        if (err instanceof ProtocolError) {
          console.warn('[file-transfer] protocol error:', err.message);
        }
        return;
      }

      switch (msg.type) {
        case MessageType.FILE_META: {
          fileMetaRef.current = msg;
          setReceivedFileMeta(msg);
          dataChannel.send(encodeMessage({
            type: MessageType.CHUNK_ACK,
            sequence: 0,
            status: 0x00,
          }));
          break;
        }

        case MessageType.CHUNK: {
          receivedChunks.set(msg.sequence, msg.data);
          dataChannel.send(encodeMessage({
            type: MessageType.CHUNK_ACK,
            sequence: msg.sequence,
            status: 0x00,
          }));
          break;
        }

        case MessageType.CHUNK_ACK: {
          inFlightRef.current.delete(msg.sequence);
          transferStore.incrementChunksAcknowledged();
          transferStore.setProgress({ lastAcknowledgedChunk: msg.sequence });
          if (sendResolveRef.current && msg.sequence === 0) {
            sendResolveRef.current(true);
            sendResolveRef.current = null;
          }
          break;
        }

        case MessageType.VERIFY_REQUEST: {
          const meta = fileMetaRef.current;
          const key = getEncryptionKey();
          let match = false;
          if (meta) {
            const allChunks: Uint8Array[] = [];
            for (let i = 0; i < meta.totalChunks; i++) {
              const raw = receivedChunks.get(i);
              if (raw) {
                const decrypted = key ? await decryptChunk(raw, key, i) : raw;
                allChunks.push(decrypted);
              }
            }
            if (allChunks.length === meta.totalChunks) {
              const receiverHash = await computeSHA256FromChunks(allChunks);
              match = areHashesEqual(receiverHash, msg.senderHash);
              if (match) {
                transferStore.setTransferPhase('complete');
                const decryptedChunks = new Map<number, Uint8Array>();
                for (let i = 0; i < meta.totalChunks; i++) {
                  decryptedChunks.set(i, allChunks[i]);
                }
                const blob = reassembleFile(decryptedChunks, meta.totalChunks, meta.mimeType);
                triggerDownload(blob, meta.fileName);
                addNotification({ type: 'success', title: `Downloaded: ${meta.fileName}`, durationMs: 5000 });
              } else {
                transferStore.setReceiverHash(
                  Array.from(receiverHash).map((b) => b.toString(16).padStart(2, '0')).join(''),
                );
                transferStore.setTransferPhase('error');
                transferStore.setTransferError('Hash mismatch');
              }
            }
          }
          dataChannel.send(encodeMessage({
            type: MessageType.VERIFY_RESPONSE,
            match,
          }));
          break;
        }

        case MessageType.VERIFY_RESPONSE: {
          if (sendResolveRef.current) {
            sendResolveRef.current(msg.match);
            sendResolveRef.current = null;
          }
          break;
        }

        case MessageType.CANCEL: {
          transferStore.setTransferPhase('cancelled');
          setIsTransferring(false);
          break;
        }

        case MessageType.ERROR: {
          setError(msg.message);
          transferStore.setTransferError(msg.message);
          transferStore.setTransferPhase('error');
          setIsTransferring(false);
          break;
        }
      }
    };

    dataChannel.addEventListener('message', handleMessage);
    return () => {
      dataChannel.removeEventListener('message', handleMessage);
    };
  }, [dataChannel, transferStore]);

  return {
    sendFile,
    cancel,
    isTransferring,
    error,
    receivedFileMeta,
  };
}
