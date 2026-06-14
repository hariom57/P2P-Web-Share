import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { useTransferStore } from '../stores/transferStore';
import { useResumeStore } from '../stores/resumeStore';
import { getActiveDataChannel, getActiveFile, setActiveFile, getResumeAfterConnect, setResumeAfterConnect } from '../services/data-channel-registry';

function Transfer() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fileState = location.state as { fileName?: string; fileSize?: number; fileType?: string; isResuming?: boolean } | null;
  const isSender = !!fileState?.fileName;
  const isResuming = fileState?.isResuming || getResumeAfterConnect();
  const [waitingForFile, setWaitingForFile] = useState(isSender && isResuming && !getActiveFile());
  const hasStartedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { resumeAction, clearResumableTransfer } = useResumeStore();

  const dataChannel = getActiveDataChannel();

  useEffect(() => {
    return () => {
      setActiveFile(null);
      setResumeAfterConnect(false);
    };
  }, []);

  useEffect(() => {
    if (resumeAction === 'resuming') {
      clearResumableTransfer();
    }
  }, [resumeAction, clearResumableTransfer]);

  const { sendFile, cancel, isTransferring, error } = useFileTransfer({ dataChannel, roomId });

  const transferPhase = useTransferStore((s) => s.transferPhase);
  const progress = useTransferStore((s) => s.progressPercent);
  const currentSpeed = useTransferStore((s) => s.currentSpeedBps);
  const averageSpeed = useTransferStore((s) => s.averageSpeedBps);
  const chunksSent = useTransferStore((s) => s.chunksSent);
  const chunksAcknowledged = useTransferStore((s) => s.chunksAcknowledged);
  const chunksReceived = useTransferStore((s) => s.chunksReceived);
  const totalChunks = useTransferStore((s) => s.totalChunks);
  const etaMs = useTransferStore((s) => s.etaMs);
  const fileName = useTransferStore((s) => s.fileName);

  useEffect(() => {
    if (transferPhase === 'complete' || transferPhase === 'error' || transferPhase === 'cancelled') {
      const timer = setTimeout(() => {
        navigate(`/complete/${roomId}`, {
          state: { phase: transferPhase, fileName, error: transferPhase === 'error' ? useTransferStore.getState().transferError : null },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [transferPhase, roomId, navigate, fileName]);

  useEffect(() => {
    if (isSender && dataChannel && dataChannel.readyState === 'open' && !hasStartedRef.current) {
      const file = getActiveFile();
      if (file) {
        hasStartedRef.current = true;
        setWaitingForFile(false);
        sendFile(file);
      } else if (isResuming) {
        setWaitingForFile(true);
      }
    }
  }, [isSender, dataChannel, sendFile, isResuming]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && dataChannel?.readyState === 'open') {
      setActiveFile(file);
      setWaitingForFile(false);
      hasStartedRef.current = true;
      sendFile(file);
    }
  }, [dataChannel, sendFile]);

  if (!dataChannel) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
        <p className="text-gray-400">Connection lost. Please restart.</p>
        <button className="mt-4 text-blue-400 underline" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    );
  }

  const formatSpeed = (bps: number) => {
    if (bps === 0) return '-- MB/s';
    const mbps = bps / 1024 / 1024;
    return mbps >= 1 ? `${mbps.toFixed(2)} MB/s` : `${(bps / 1024).toFixed(1)} KB/s`;
  };

  const formatEta = (ms: number) => {
    if (ms <= 0 || !isFinite(ms)) return '--';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remSecs = seconds % 60;
    return `${minutes}m ${remSecs}s`;
  };

  const phaseText = () => {
    switch (transferPhase) {
      case 'hashing': return 'Hashing file...';
      case 'meta': return 'Exchanging metadata...';
      case 'transferring': return 'Transferring...';
      case 'verifying': return 'Verifying integrity...';
      case 'complete': return 'Complete!';
      case 'error': return 'Error';
      case 'cancelled': return 'Cancelled';
      default: return 'Preparing...';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-2">
          {isSender ? 'Sending' : 'Receiving'}
        </h2>
        {fileName && (
          <p className="text-gray-400 mb-6 text-sm">{fileName}</p>
        )}

        <div className="bg-gray-900 rounded-lg p-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{phaseText()}</span>
            <span>{Math.round(progress)}%</span>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                transferPhase === 'complete' ? 'bg-green-500' :
                transferPhase === 'error' ? 'bg-red-500' :
                transferPhase === 'cancelled' ? 'bg-gray-500' :
                'bg-blue-600'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-left text-gray-500">
              <div>Speed</div>
              <div className="text-white font-medium">{formatSpeed(currentSpeed)}</div>
            </div>
            <div className="text-right text-gray-500">
              <div>ETA</div>
              <div className="text-white font-medium">{formatEta(etaMs)}</div>
            </div>
            <div className="text-left text-gray-500">
              <div>Chunks</div>
              <div className="text-white font-medium">
                {isSender ? chunksAcknowledged : chunksReceived}/{totalChunks}
              </div>
            </div>
            <div className="text-right text-gray-500">
              <div>Avg Speed</div>
              <div className="text-white font-medium">{formatSpeed(averageSpeed)}</div>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        {isTransferring && (
          <button
            className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            onClick={cancel}
          >
            Cancel
          </button>
        )}

        {waitingForFile && (
          <div className="mt-6 p-6 border-2 border-dashed border-blue-500/50 rounded-xl bg-blue-500/5">
            <p className="text-blue-400 font-medium mb-2">Resume Transfer</p>
            <p className="text-gray-400 text-sm mb-4">
              Select the original file to resume sending
            </p>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Transfer;
