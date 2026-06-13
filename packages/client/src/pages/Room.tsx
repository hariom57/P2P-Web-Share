import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { connectSocket } from '../services/socket';
import { useRoomStore } from '../stores/roomStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { setActiveDataChannel } from '../services/data-channel-registry';

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const hasJoinedRef = useRef(false);

  const fileState = location.state as { fileName?: string; fileSize?: number; fileType?: string } | null;
  const isSender = !!fileState?.fileName;
  const roomIdFull = roomId || '';

  const { roomPhase, roomError, peerConnected } = useRoomStore();
  const { setRoomPhase, setPeerConnected, setRoomError, setPeerId } = useRoomStore();

  const onDataChannel = useCallback((channel: RTCDataChannel) => {
    setActiveDataChannel(channel);
    navigate(`/transfer/${roomIdFull}`, { state: fileState || undefined });
  }, [roomIdFull, navigate, fileState]);

  const { startConnection, error } = useWebRTC({
    roomId: roomIdFull,
    isSender,
    onDataChannel,
  });

  useEffect(() => {
    if (!roomIdFull || hasJoinedRef.current) return;

    const socket = connectSocket();
    if (!socket.connected) socket.connect();

    setRoomPhase('waiting');
    setRoomError(null);
    hasJoinedRef.current = true;

    socket.emit('join-room', { roomId: roomIdFull });

    const handlePeerJoined = () => {
      setPeerConnected(true);
      setRoomPhase('connecting');
      if (isSender) startConnection();
    };

    const handleRoomJoined = (data: { peerId: string }) => {
      setPeerId(data.peerId);
      if (!isSender) startConnection();
    };

    const handleRoomError = (data: { message: string }) => {
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
    };
  }, [roomIdFull, isSender, startConnection]);

  useEffect(() => {
    return () => {
      setActiveDataChannel(null);
    };
  }, []);

  const copyRoomLink = useCallback(() => {
    const link = `${window.location.origin}/room/${roomIdFull}`;
    navigator.clipboard.writeText(link);
  }, [roomIdFull]);

  const status = () => {
    if (roomPhase === 'expired') return { text: 'Room expired', color: 'text-red-400', dot: 'bg-red-500' };
    if (error || roomError) return { text: error || roomError || 'Error', color: 'text-red-400', dot: 'bg-red-500' };
    if (roomPhase === 'connected') return { text: 'Connected', color: 'text-green-400', dot: 'bg-green-500' };
    if (peerConnected) return { text: 'Peer connected, connecting...', color: 'text-yellow-400', dot: 'bg-yellow-500 animate-pulse' };
    if (roomPhase === 'waiting') return { text: 'Waiting for peer...', color: 'text-yellow-400', dot: 'bg-yellow-500 animate-pulse' };
    return { text: 'Initializing...', color: 'text-gray-400', dot: 'bg-gray-500' };
  };

  const s = status();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-2">Share Link</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Share this link with the person you want to transfer to
        </p>

        {isSender && (
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3 mb-6">
            <code className="flex-1 text-blue-400 font-mono text-sm truncate">
              {`${window.location.origin}/room/${roomIdFull}`}
            </code>
            <button
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
              onClick={copyRoomLink}
            >
              Copy
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${s.dot}`} />
          <span className={s.color}>{s.text}</span>
        </div>

        {isSender && fileState?.fileName && (
          <p className="text-gray-500 text-sm mt-4">
            Sending: <span className="text-gray-300">{fileState.fileName}</span>
          </p>
        )}

        <button
          className="mt-8 text-gray-500 hover:text-gray-300 text-sm underline"
          onClick={() => { navigate('/'); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default Room;
