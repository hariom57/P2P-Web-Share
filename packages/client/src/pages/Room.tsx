import { useEffect, useCallback, useRef, useState } from 'react';
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
  const hasNavigatedRef = useRef(false);
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

    const handlePeerJoined = async () => {
      setPeerConnected(true);
      setRoomPhase('connecting');
      if (isSender) {
        if (webrtcSignalingCleanupRef.current) {
          webrtcSignalingCleanupRef.current();
          webrtcSignalingCleanupRef.current = null;
        }
        const signalingCleanup = await startConnection();
        if (signalingCleanup) webrtcSignalingCleanupRef.current = signalingCleanup;
      }
    };

    const handleRoomJoined = (data: { roomId: string; peerCount: number }) => {
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
      if (webrtcSignalingCleanupRef.current) {
        webrtcSignalingCleanupRef.current();
        webrtcSignalingCleanupRef.current = null;
      }
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

  const [copied, setCopied] = useState(false);

  const copyRoomLink = useCallback(() => {
    const link = `${window.location.origin}/room/${roomIdFull}${window.location.hash}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomIdFull]);

  const status = () => {
    if (roomPhase === 'expired')
      return { text: 'Room expired', color: 'text-red-400', dot: 'bg-red-500' };
    if (error || roomError)
      return { text: error || roomError || 'Error', color: 'text-red-400', dot: 'bg-red-500' };
    if (roomPhase === 'connected')
      return { text: 'Connected', color: 'text-emerald-400', dot: 'bg-emerald-500' };
    if (peerConnected)
      return {
        text: 'Peer connected, connecting...',
        color: 'text-amber-400',
        dot: 'bg-amber-500 animate-pulse',
      };
    if (roomPhase === 'waiting')
      return {
        text: 'Waiting for peer...',
        color: 'text-amber-400',
        dot: 'bg-amber-500 animate-pulse-slow',
      };
    if (roomPhase === 'connecting')
      return {
        text: 'Connecting...',
        color: 'text-amber-400',
        dot: 'bg-amber-500 animate-pulse',
      };
    return { text: 'Initializing...', color: 'text-gray-400', dot: 'bg-gray-500' };
  };

  const fingerprint = keyFingerprint(window.location.hash);
  const s = status();

  if (roomPhase === 'connecting') {
    return (
      <div className="text-white flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 font-light">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="text-center max-w-lg w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide uppercase mb-4">
          {isSender ? 'Sender' : 'Receiver'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 animate-slide-up tracking-tight">Share Link</h2>
        <p
          className="text-gray-400 mb-6 text-sm animate-slide-up font-light"
          style={{ animationDelay: '0.05s' }}
        >
          Share this link with the person you want to transfer to
        </p>

        {isSender && (
          <div
            className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl p-1 mb-4 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="flex-1 min-w-0 px-3">
              <code className="block text-indigo-300 font-mono text-sm truncate">
                {`${window.location.origin}/room/${roomIdFull}`}
              </code>
            </div>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 whitespace-nowrap ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              onClick={copyRoomLink}
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </span>
              ) : 'Copy'}
            </button>
          </div>
        )}

        {isSender && (
          <div
            className="flex flex-col items-center gap-2 mb-4 animate-slide-up"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <QRCode
                text={`${window.location.origin}/room/${roomIdFull}${window.location.hash}`}
              />
            </div>
            <p className="text-xs text-gray-500">Scan to join</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
          <span className={`${s.color} text-sm font-medium`}>{s.text}</span>
        </div>

        {fingerprint && (
          <div className="animate-slide-up bg-white/[0.03] border border-white/[0.06] rounded-xl p-3" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Encryption fingerprint</p>
            <code className="font-mono text-xs text-gray-400 tracking-widest select-all">
              {fingerprint}
            </code>
          </div>
        )}

        {isSender && fileState && (
          <div className="text-gray-500 text-sm mt-4">
            {fileState.files && fileState.files.length > 1 ? (
              <p>
                Sending: <span className="text-gray-300 font-medium">{fileState.files.length} files</span>
              </p>
            ) : fileState.fileName ? (
              <p>
                Sending: <span className="text-gray-300 font-medium">{fileState.fileName}</span>
              </p>
            ) : null}
          </div>
        )}

        <button
          className="mt-8 text-gray-500 hover:text-gray-300 text-sm transition-colors inline-flex items-center gap-1.5"
          onClick={() => { navigate('/'); }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {resumeAction === 'prompt' && roomIdFull && (
          <ResumePrompt roomId={roomIdFull} onResume={handleResume} />
        )}
      </div>
    </div>
  );
}

export default Room;
