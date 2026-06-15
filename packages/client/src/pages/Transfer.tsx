import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { formatFileSize } from '@p2p-share/shared';
import { useFileTransfer } from '../hooks/useFileTransfer.js';
import { useTransferStore } from '../stores/transferStore.js';
import { useResumeStore } from '../stores/resumeStore.js';
import {
  getActiveDataChannel,
  getActiveFiles,
  getActiveFile,
  setActiveFile,
  getResumeAfterConnect,
  setResumeAfterConnect,
} from '../services/data-channel-registry.js';

function Transfer() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fileState = location.state as {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    files?: { fileName: string; fileSize: number; fileType: string }[];
    isResuming?: boolean;
  } | null;
  const isSender = !!(fileState?.fileName || fileState?.files?.length);
  const isResuming = fileState?.isResuming || getResumeAfterConnect();
  const [waitingForFile, setWaitingForFile] = useState(isSender && isResuming && !getActiveFile());
  const hasStartedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { resumeAction, clearResumableTransfer } = useResumeStore();

  const dataChannel = getActiveDataChannel();
  const [channelOpen, setChannelOpen] = useState(() => dataChannel?.readyState === 'open');

  useEffect(() => {
    if (!dataChannel) return;
    if (dataChannel.readyState === 'open') {
      setChannelOpen(true);
      return;
    }
    const handleOpen = () => setChannelOpen(true);
    const handleClose = () => setChannelOpen(false);
    dataChannel.addEventListener('open', handleOpen);
    dataChannel.addEventListener('close', handleClose);
    return () => {
      dataChannel.removeEventListener('open', handleOpen);
      dataChannel.removeEventListener('close', handleClose);
    };
  }, [dataChannel]);

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

  const { sendFiles, cancel, isTransferring, error } = useFileTransfer({ dataChannel, roomId });

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
  const fileSize = useTransferStore((s) => s.fileSize);
  const bytesTransferred = useTransferStore((s) => s.bytesTransferred);
  const batchFiles = useTransferStore((s) => s.batchFiles);
  const currentFileIndex = useTransferStore((s) => s.currentFileIndex);
  const previewUrl = useTransferStore((s) => s.previewUrl);

  const totalFiles = fileState?.files?.length || (fileState?.fileName ? 1 : 0);

  useEffect(() => {
    if (
      transferPhase === 'complete' ||
      transferPhase === 'error' ||
      transferPhase === 'cancelled'
    ) {
      const timer = setTimeout(() => {
        const completedNames =
          batchFiles.length > 0 ? batchFiles.map((f) => f.name) : fileName ? [fileName] : [];
        const completedError =
          transferPhase === 'error' ? useTransferStore.getState().transferError : null;
        navigate(`/complete/${roomId}`, {
          state: {
            phase: transferPhase,
            fileName,
            files: completedNames,
            error: completedError,
            previewUrl,
            fileType: useTransferStore.getState().fileType,
          },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [transferPhase, roomId, navigate, fileName, batchFiles]);

  useEffect(() => {
    if (isSender && dataChannel && channelOpen && !hasStartedRef.current) {
      const files = getActiveFiles();
      if (files && files.length > 0) {
        hasStartedRef.current = true;
        setWaitingForFile(false);
        sendFiles(files);
      } else {
        const file = getActiveFile();
        if (file) {
          hasStartedRef.current = true;
          setWaitingForFile(false);
          sendFiles([file]);
        } else if (isResuming) {
          setWaitingForFile(true);
        }
      }
    }
  }, [isSender, dataChannel, channelOpen, sendFiles, isResuming]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && channelOpen) {
        setActiveFile(file);
        setWaitingForFile(false);
        hasStartedRef.current = true;
        sendFiles([file]);
      }
    },
    [channelOpen, sendFiles],
  );

  if (!dataChannel) {
    return (
      <div className="text-white flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">Connection lost. Please restart.</p>
          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
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
      case 'hashing':
        return 'Hashing file...';
      case 'meta':
        return 'Exchanging metadata...';
      case 'transferring':
        return 'Transferring...';
      case 'verifying':
        return 'Verifying integrity...';
      case 'complete':
        return 'Complete!';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      default:
        return channelOpen ? 'Preparing...' : 'Waiting for connection...';
    }
  };

  const phaseColors: Record<string, string> = {
    hashing: 'bg-indigo-500',
    meta: 'bg-indigo-500',
    transferring: 'bg-indigo-500',
    verifying: 'bg-amber-500',
    complete: 'bg-emerald-500',
    error: 'bg-red-500',
    cancelled: 'bg-gray-500',
  };

  return (
    <div className="text-white flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="text-center max-w-lg w-full animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide uppercase mb-4">
          {isSender ? 'Sending' : 'Receiving'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
          {isSender ? 'Sending' : 'Receiving'}
        </h2>
        {totalFiles > 1 && (
          <p className="text-gray-500 text-xs mb-1 font-medium">
            File {currentFileIndex + 1} of {totalFiles}
          </p>
        )}
        {fileName && <p className="text-gray-400 mb-6 text-sm font-light">{fileName}</p>}

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
          <div className="flex justify-between text-sm text-gray-400 mb-3">
            <span className="font-medium">{phaseText()}</span>
            <span className="font-semibold text-white">{Math.round(progress)}%</span>
          </div>

          <div className="w-full bg-white/[0.06] rounded-full h-2.5 mb-5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                transferPhase === 'complete'
                  ? 'bg-emerald-500'
                  : transferPhase === 'error'
                    ? 'bg-red-500'
                    : transferPhase === 'cancelled'
                      ? 'bg-gray-500'
                      : phaseColors[transferPhase] || 'bg-indigo-500'
              } ${transferPhase === 'transferring' ? 'animate-progress-stripe' : ''}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 text-sm">
            <div className="text-left">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Speed</div>
              <div className="text-white font-semibold">{formatSpeed(currentSpeed)}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">ETA</div>
              <div className="text-white font-semibold">{formatEta(etaMs)}</div>
            </div>
            <div className="text-left">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Average</div>
              <div className="text-white font-semibold">{formatSpeed(averageSpeed)}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Chunks</div>
              <div className="text-white font-semibold">
                {isSender ? chunksAcknowledged : chunksReceived}/{totalChunks}
              </div>
            </div>
          </div>
          {fileSize !== null && fileSize > 0 && (
            <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-white/[0.06]">
              {formatFileSize(bytesTransferred)} / {formatFileSize(fileSize)}
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4 bg-red-500/10 rounded-xl px-4 py-2.5 border border-red-500/20">{error}</p>
        )}

        {isTransferring && (
          <button
            className="mt-6 px-6 py-2.5 bg-red-600/90 hover:bg-red-600 rounded-xl font-medium transition-all duration-200 text-sm active:scale-95 inline-flex items-center gap-2"
            onClick={cancel}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Transfer
          </button>
        )}

        {waitingForFile && (
          <div className="mt-6 p-6 border-2 border-dashed border-indigo-400/40 rounded-2xl bg-indigo-500/5">
            <p className="text-indigo-300 font-semibold mb-2">Resume Transfer</p>
            <p className="text-gray-400 text-sm mb-4 font-light">Select the original file to resume sending</p>
            <button
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all duration-200 text-sm active:scale-95"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Transfer;
