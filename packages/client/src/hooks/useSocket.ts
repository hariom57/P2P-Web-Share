import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useRoomStore } from '../stores/roomStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useTransferStore } from '../stores/transferStore';

export function useSocket() {
  const {
    setRoomId,
    setPeerConnected,
    setRoomError,
    setRoomPhase,
  } = useRoomStore();

  const { setConnectionState } = useConnectionStore();
  const { setFileMetadata, setTransferPhase, setTransferError } = useTransferStore();

  const cleanup = useCallback(() => {
    disconnectSocket();
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('room-created', (data: { roomId: string; expiresAt: number }) => {
      setRoomId(data.roomId);
      setRoomPhase('waiting');
    });

    socket.on('room-joined', (data: { roomId: string; peerCount: number }) => {
      setRoomId(data.roomId);
      setRoomPhase('connecting');
    });

    socket.on('peer-joined', () => {
      setPeerConnected(true);
      setRoomPhase('connecting');
    });

    socket.on('peer-disconnected', () => {
      setPeerConnected(false);
      setConnectionState('disconnected');
    });

    socket.on('file-metadata', (data: { fileName: string; fileSize: number; fileType: string }) => {
      setFileMetadata(data);
    });

    socket.on('room-error', (data: { code: string; message: string }) => {
      setRoomError(data.message);
    });

    socket.on('room-expired', () => {
      setRoomPhase('expired');
    });

    socket.on('transfer-complete', () => {
      setTransferPhase('complete');
    });

    socket.on('transfer-error', (data: { error: string }) => {
      setTransferError(data.error);
      setTransferPhase('error');
    });

    return cleanup;
  }, []);

  return { cleanup };
}
