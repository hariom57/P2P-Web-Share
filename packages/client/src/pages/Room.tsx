import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { connectSocket } from '../services/socket';
import { useRoomStore } from '../stores/roomStore';
import { useWebRTC } from '../hooks/useWebRTC';
import {
  setActiveDataChannel,
  getActiveDataChannel,
  setEncryptionKey,
  setResumeAfterConnect,
  getResumeAfterConnect,
  getActiveFile,
} from '../services/data-channel-registry';
import { importKey } from '../services/encryption';
import { getCheckpoint, deleteRoomChunks } from '../services/checkpoint-store';
import { useResumeStore } from '../stores/resumeStore';
import ResumePrompt from '../components/ResumePrompt';
import QRCode from '../components/QRCode';

function keyFingerprint(hash: string): string | null {
  const match = hash.match(/key=([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  try {
    const raw = atob(match[1]);
    const hex = Array.from(raw)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    return `${hex.slice(0, 4).toUpperCase()} ${hex.slice(4, 8).toUpperCase()} ${hex.slice(8, 12).toUpperCase()} ${hex.slice(12, 16).toUpperCase()}`;
  } catch {
    return null;
  }
}

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const hasJoinedRef = useRef(false);
  // Tracks whether we've navigated to /transfer yet (so we don't call cleanup on navigate)
  const hasNavigatedRef = useRef(false);
  // Cleanup function returned by startConnection (removes offer/answer/ice listeners)
  const webrtcSignalingCleanupRef = useRef<(() => void) | null>(null);

  const fileState = location.state as {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    files?: { fileName: string; fileSize: number; fileType: string }[];
  } | null;
  const isSender = !!(fileState?.fileName || fileState?.files);
  const roomIdFull = roomId || '';

  const { roomPhase, roomError, peerConnected } = useRoomStore();
  const { setRoomPhase, setPeerConnected, setRoomError } = useRoomStore();

  // Called when the RTCDataChannel actually opens (not at creation time).
  // This is the correct moment to navigate to /transfer.
  const onDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      setActiveDataChannel(channel);
      hasNavigatedRef.current = true;
      const navState: Record<string, unknown> = { isResuming: getResumeAfterConnect() };
      if (fileState?.files && fileState.files.length > 0) {
        navState.files = fileState.files;
      } else if (fileState?.fileName) {
        navState.fileName = fileState.fileName;
        navState.fileSize = fileState.fileSize;
        navState.fileType = fileState.fileType;
      }
      navigate(`/transfer/${roomIdFull}`, { state: navState });
    },
    [roomIdFull, navigate, fileState],
  );

  const { startConnection, error, cleanup } = useWebRTC({
    roomId: roomIdFull,
    isSender,
    onDataChannel,
  });

  useEffect(() => {
    if (!roomIdFull) return;
    getCheckpoint(roomIdFull).then((cp) => {
      if (cp && cp.lastReceivedChunk > 0) {
        useResumeStore.getState().setResumableTransfer({
          role: cp.role,
          fileName: cp.fileName,
          fileSize: cp.fileSize,
          totalChunks: cp.totalChunks,
          lastReceivedChunk: cp.lastReceivedChunk,
          lastActivity: cp.timestamp,
        });
      }
    });
  }, [roomIdFull]);

  const handleResume = useCallback(() => {
    setResumeAfterConnect(true);
  }, []);

  const { resumeAction } = useResumeStore();

  useEffect(() => {
    if (!roomIdFull || hasJoinedRef.current) return;

    const socket = connectSocket();
    if (!socket.connected) socket.connect();

    setRoomPhase('waiting');
    setRoomError(null);
    hasJoinedRef.current = true;

    // RECEIVER: Register WebRTC signaling listeners BEFORE emitting join-room.
    // This ensures we don't miss an offer that arrives immediately after room-joined.
    if (!isSender) {
      startConnection().then((signalingCleanup) => {
        if (signalingCleanup) webrtcSignalingCleanupRef.current = signalingCleanup;
      });
    }

    console.log('[ROOM]', 'isSender=', isSender, 'fileState=', fileState, 'room=', roomIdFull);

    if (!isSender) {
      console.log('[EMIT JOIN]', roomIdFull);
      socket.emit('join-room', { roomId: roomIdFull });
    }

    // peer-joined is sent by the server to the SENDER when the receiver joins.
    const handlePeerJoined = async () => {
      setPeerConnected(true);
      setRoomPhase('connecting');
      if (isSender) {
        // Clean up any previous signaling listeners before starting fresh
        if (webrtcSignalingCleanupRef.current) {
          webrtcSignalingCleanupRef.current();
          webrtcSignalingCleanupRef.current = null;
        }
        const signalingCleanup = await startConnection();
        if (signalingCleanup) webrtcSignalingCleanupRef.current = signalingCleanup;
      }
    };

    // room-joined is sent back to whoever just joined (both sender and receiver).
    // Server sends: { roomId, peerCount }
    const handleRoomJoined = (data: { roomId: string; peerCount: number }) => {
      // If peerCount >= 2 when the receiver joins, the sender is already waiting.
      // The sender will get peer-joined and send the offer. Our signaling listeners
      // were registered before this event (above), so we'll catch the offer.
      if (!isSender && data.peerCount >= 2) {
        setPeerConnected(true);
        setRoomPhase('connecting');
      }
    };

    const handleRoomError = (data: { code: string; message: string }) => {
      setRoomError(data.message);
    };

    const handleRoomExpired = () => {
      setRoomPhase('expired');
    };

    socket.on('peer-joined', handlePeerJoined);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-error', handleRoomError);
    socket.on('room-expired', handleRoomExpired);

    return () => {
      socket.off('peer-joined', handlePeerJoined);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-error', handleRoomError);
      socket.off('room-expired', handleRoomExpired);
      // Clean up signaling listeners
      if (webrtcSignalingCleanupRef.current) {
        webrtcSignalingCleanupRef.current();
        webrtcSignalingCleanupRef.current = null;
      }
      // Only close the RTCPeerConnection if we have NOT navigated to /transfer.
      // If we did navigate, Transfer.tsx now owns the connection.
      if (!hasNavigatedRef.current) {
        cleanup();
      }
    };
  }, [roomIdFull, isSender, startConnection, cleanup]);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/key=([A-Za-z0-9+/=]+)/);
    if (match) {
      importKey(match[1]).then(setEncryptionKey);
    }
  }, []);

  const copyRoomLink = useCallback(() => {
    const link = `${window.location.origin}/room/${roomIdFull}${window.location.hash}`;
    navigator.clipboard.writeText(link);
  }, [roomIdFull]);

  const status = () => {
    if (roomPhase === 'expired')
      return { text: 'Room expired', color: 'text-red-400', dot: 'bg-red-500' };
    if (error || roomError)
      return { text: error || roomError || 'Error', color: 'text-red-400', dot: 'bg-red-500' };
    if (roomPhase === 'connected')
      return { text: 'Connected', color: 'text-green-400', dot: 'bg-green-500' };
    if (peerConnected)
      return {
        text: 'Peer connected, connecting...',
        color: 'text-yellow-400',
        dot: 'bg-yellow-500 animate-pulse',
      };
    if (roomPhase === 'waiting')
      return {
        text: 'Waiting for peer...',
        color: 'text-yellow-400',
        dot: 'bg-yellow-500 animate-pulse',
      };
    if (roomPhase === 'connecting')
      return {
        text: 'Connecting...',
        color: 'text-yellow-400',
        dot: 'bg-yellow-500 animate-pulse',
      };
    return { text: 'Initializing...', color: 'text-gray-400', dot: 'bg-gray-500' };
  };

  const fingerprint = keyFingerprint(window.location.hash);
  const s = status();

  if (roomPhase === 'connecting') {
    return (
      <div className="text-white flex items-center justify-center min-h-screen">
        Connecting...
      </div>
    );
  }

  return (
    <div className="text-white flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-2 animate-slide-up">Share Link</h2>
        <p
          className="text-gray-400 mb-6 text-sm animate-slide-up"
          style={{ animationDelay: '0.05s' }}
        >
          Share this link with the person you want to transfer to
        </p>

        {isSender && (
          <div
            className="flex items-center gap-2 bg-gray-900 rounded-lg p-3 mb-4 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="flex-1 min-w-0">
              <code className="block text-blue-400 font-mono text-sm truncate">
                {`${window.location.origin}/room/${roomIdFull}`}
              </code>
            </div>
            <button
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-all duration-200 active:scale-95 whitespace-nowrap"
              onClick={copyRoomLink}
            >
              Copy
            </button>
          </div>
        )}

        {isSender && (
          <div
            className="flex flex-col items-center gap-2 mb-4 animate-slide-up"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="bg-gray-900 rounded-lg p-3">
              <QRCode
                text={`${window.location.origin}/room/${roomIdFull}${window.location.hash}`}
              />
            </div>
            <p className="text-xs text-gray-500">Scan to join</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${s.dot}`} />
          <span className={s.color}>{s.text}</span>
        </div>

        {fingerprint && (
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs text-gray-600 mb-1">Encryption fingerprint</p>
            <code className="font-mono text-xs text-gray-500 tracking-widest select-all">
              {fingerprint}
            </code>
          </div>
        )}

        {isSender && fileState && (
          <div className="text-gray-500 text-sm mt-4">
            {fileState.files && fileState.files.length > 1 ? (
              <p>
                Sending: <span className="text-gray-300">{fileState.files.length} files</span>
              </p>
            ) : fileState.fileName ? (
              <p>
                Sending: <span className="text-gray-300">{fileState.fileName}</span>
              </p>
            ) : null}
          </div>
        )}

        <button
          className="mt-8 text-gray-500 hover:text-gray-300 text-sm underline"
          onClick={() => {
            navigate('/');
          }}
        >
          Cancel
        </button>

        {resumeAction === 'prompt' && roomIdFull && (
          <ResumePrompt roomId={roomIdFull} onResume={handleResume} />
        )}
      </div>
    </div>
  );
}

export default Room;
