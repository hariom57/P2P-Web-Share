import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeMessage, decodeMessage, ProtocolError } from '@p2p-share/shared';
import { MessageType, PROTOCOL_CONSTANTS } from '@p2p-share/shared';
import type { DataChannelMessage, FileMetaMessage } from '@p2p-share/shared';
import { FileChunker } from '../services/file-chunker';
import { useTransferStore } from '../stores/transferStore';
import { useUIStore } from '../stores/uiStore';

interface UseFileTransferOptions {
  dataChannel: RTCDataChannel | null;
}

export function useFileTransfer({ dataChannel }: UseFileTransferOptions) {
  const [error, setError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [receivedFileMeta, setReceivedFileMeta] = useState<FileMetaMessage | null>(null);

  const chunkerRef = useRef<FileChunker | null>(null);
  const inFlightRef = useRef<Set<number>>(new Set());
  const windowSizeRef = useRef(PROTOCOL_CONSTANTS.MIN_WINDOW_SIZE);
  const cancelledRef = useRef(false);
  const sendResolveRef = useRef<((value: boolean) => void) | null>(null);
  const fileMetaRef = useRef<FileMetaMessage | null>(null);

  const transferStore = useTransferStore();
  const addNotification = useUIStore((s) => s.addNotification);

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

    const fileHash = new Uint8Array(32);
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

    transferStore.setTransferPhase('transferring');
    inFlightRef.current.clear();
    windowSizeRef.current = PROTOCOL_CONSTANTS.MIN_WINDOW_SIZE;

    while (!cancelledRef.current) {
      const chunk = await chunker.readNextChunk();
      if (!chunk) break;

      const encoded = encodeMessage({
        type: MessageType.CHUNK,
        sequence: chunk.sequence,
        data: chunk.data,
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
  }, [dataChannel, transferStore]);

  useEffect(() => {
    if (!dataChannel) return;

    dataChannel.binaryType = 'arraybuffer';
    const receivedChunks = new Map<number, Uint8Array>();

    const handleMessage = (event: MessageEvent) => {
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
          if (meta) {
            const allChunks: Uint8Array[] = [];
            for (let i = 0; i < meta.totalChunks; i++) {
              const chunk = receivedChunks.get(i);
              if (chunk) allChunks.push(chunk);
            }
          }
          dataChannel.send(encodeMessage({
            type: MessageType.VERIFY_RESPONSE,
            match: true,
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
