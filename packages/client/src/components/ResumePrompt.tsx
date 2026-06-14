import { useCallback, useRef } from 'react';
import { useResumeStore } from '../stores/resumeStore';
import { deleteCheckpoint, deleteRoomChunks } from '../services/checkpoint-store';
import { setActiveFile } from '../services/data-channel-registry';

interface ResumePromptProps {
  roomId: string;
  onResume?: () => void;
}

function ResumePrompt({ roomId, onResume }: ResumePromptProps) {
  const {
    role,
    fileName,
    fileSize,
    totalChunks,
    lastReceivedChunk,
    lastActivity,
    setResumeAction,
    clearResumableTransfer,
  } = useResumeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressPercent =
    totalChunks > 0 ? Math.min(Math.round((lastReceivedChunk / totalChunks) * 100), 99) : 0;

  const timeAgo = lastActivity
    ? `${Math.max(1, Math.floor((Date.now() - lastActivity) / 1000))}s ago`
    : 'unknown';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleResume = useCallback(() => {
    if (role === 'sender') {
      fileInputRef.current?.click();
    } else {
      setResumeAction('resuming');
      onResume?.();
    }
  }, [role, setResumeAction, onResume]);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name !== fileName || file.size !== fileSize) {
        alert(`File mismatch: expected "${fileName}" (${formatSize(fileSize)}), got "${file.name}" (${formatSize(file.size)}). Please select the correct file.`);
        e.target.value = '';
        return;
      }
      setActiveFile(file);
      setResumeAction('resuming');
      onResume?.();
    }
  }, [setResumeAction, onResume, fileName, fileSize]);

  const handleDiscard = useCallback(async () => {
    await deleteCheckpoint(roomId);
    await deleteRoomChunks(roomId);
    setResumeAction('discarded');
    clearResumableTransfer();
  }, [roomId, setResumeAction, clearResumableTransfer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-800">
        <h3 className="text-lg font-semibold mb-2">Resume previous transfer?</h3>

        <div className="space-y-2 text-sm text-gray-400 mb-4">
          <div className="flex justify-between">
            <span>File</span>
            <span className="text-white font-medium truncate ml-4 max-w-[200px]">{fileName}</span>
          </div>
          <div className="flex justify-between">
            <span>Size</span>
            <span className="text-white font-medium">{formatSize(fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span>Progress</span>
            <span className="text-white font-medium">{progressPercent}%</span>
          </div>
          <div className="flex justify-between">
            <span>Activity</span>
            <span className="text-white font-medium">{timeAgo}</span>
          </div>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            onClick={handleResume}
          >
            Resume
          </button>
          <button
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            onClick={handleDiscard}
          >
            Start Over
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-3">
          {role === 'sender'
            ? 'Select the original file to resume sending'
            : 'Continue receiving the file'}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
}

export default ResumePrompt;
