import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket } from '../services/socket';
import { useRoomStore } from '../stores/roomStore';
import { setActiveFile, setEncryptionKey } from '../services/data-channel-registry';
import { generateEncryptionKey, exportKey } from '../services/encryption';

function Landing() {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setRoomPhase } = useRoomStore();

  const handleFiles = useCallback((files: FileList) => {
    setCreateError(null);
    if (files.length > 0) setSelectedFile(files[0]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  }, [handleFiles]);

  const createRoom = useCallback(async () => {
    if (isCreating || !selectedFile) return;
    setIsCreating(true);
    setCreateError(null);
    setRoomPhase('creating');

    const key = await generateEncryptionKey();
    setEncryptionKey(key);
    const keyBase64 = await exportKey(key);

    const socket = connectSocket();
    if (!socket.connected) socket.connect();

    socket.once('room-created', (data: { roomId: string }) => {
      setActiveFile(selectedFile);
      setRoomPhase('waiting');
      navigate(`/room/${data.roomId}#key=${keyBase64}`, {
        state: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
      });
    });

    socket.once('room-error', (data: { message: string }) => {
      setCreateError(data.message);
      setRoomPhase('idle');
      setIsCreating(false);
    });

    socket.emit('create-room');
  }, [isCreating, selectedFile, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg w-full">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          P2P Web Share
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Direct browser-to-browser file transfer. No uploads. No servers.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          className={`border-2 border-dashed rounded-xl p-12 transition-colors cursor-pointer mb-6 ${
            isDragOver
              ? 'border-blue-500 bg-blue-500/10'
              : selectedFile
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 hover:border-blue-500'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={!selectedFile ? handleFileSelect : undefined}
        >
          {selectedFile ? (
            <div>
              <p className="text-green-400 text-lg font-semibold">{selectedFile.name}</p>
              <p className="text-gray-500 text-sm mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                className="mt-3 text-sm text-gray-500 hover:text-gray-300 underline"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 text-lg">Drop your file here</p>
              <p className="text-gray-600 text-sm mt-2">or click to browse</p>
            </div>
          )}
        </div>

        {createError && (
          <p className="text-red-400 text-sm mb-4">{createError}</p>
        )}

        <button
          className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all ${
            selectedFile && !isCreating
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!selectedFile || isCreating}
          onClick={createRoom}
        >
          {isCreating ? 'Creating room...' : 'Create Share Link'}
        </button>
      </div>
    </div>
  );
}

export default Landing;
