import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFileSize } from '@p2p-share/shared';
import { connectSocket } from '../services/socket';
import { useRoomStore } from '../stores/roomStore';
import { setActiveFile, setActiveFiles, setEncryptionKey } from '../services/data-channel-registry';
import { generateEncryptionKey, exportKey } from '../services/encryption';

function Landing() {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setRoomPhase } = useRoomStore();

  const handleFiles = useCallback((files: FileList) => {
    setCreateError(null);
    if (files.length > 0) {
      setSelectedFiles(prev => {
        const existing = new Set(prev.map(f => f.name + f.size));
        const newFiles = Array.from(files).filter(f => !existing.has(f.name + f.size));
        return [...prev, ...newFiles];
      });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const items = e.dataTransfer.items;
    if (items) {
      const filePromises: Promise<File[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as unknown as { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ?? null;
        if (entry?.isDirectory) {
          filePromises.push(traverseDirectory(entry as FileSystemDirectoryEntry));
        }
      }
      if (filePromises.length > 0) {
        Promise.all(filePromises).then((nested) => {
          const allFiles = nested.flat();
          if (allFiles.length > 0) {
            setSelectedFiles(prev => {
              const existing = new Set(prev.map(f => f.name + f.size));
              const newFiles = allFiles.filter(f => !existing.has(f.name + f.size));
              return [...prev, ...newFiles];
            });
          }
        });
      } else if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    } else if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  function traverseDirectory(entry: FileSystemDirectoryEntry): Promise<File[]> {
    return new Promise((resolve) => {
      const reader = entry.createReader();
      const allEntries: FileSystemEntry[] = [];
      function readBatch() {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            Promise.all(
              allEntries.map((e) => {
                if (e.isFile) {
                  return new Promise<File[]>((res) => {
                    (e as FileSystemFileEntry).file((f) => res([f]), () => res([]));
                  });
                }
                return traverseDirectory(e as FileSystemDirectoryEntry);
              }),
            ).then((nested) => resolve(nested.flat()));
          } else {
            allEntries.push(...entries);
            readBatch();
          }
        }, () => resolve([]));
      }
      readBatch();
    });
  }

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const createRoom = useCallback(async () => {
    if (isCreating || selectedFiles.length === 0) return;
    setIsCreating(true);
    setCreateError(null);
    setRoomPhase('creating');

    try {
      const key = await generateEncryptionKey();
      setEncryptionKey(key);
      const keyBase64 = await exportKey(key);

      const socket = connectSocket();
      if (!socket.connected) socket.connect();

      socket.once('room-created', (data: { roomId: string }) => {
        setActiveFiles(selectedFiles);
        setActiveFile(null);
        setRoomPhase('waiting');
        navigate(`/room/${data.roomId}#key=${keyBase64}`, {
          state: {
            files: selectedFiles.map((f) => ({
              fileName: f.name,
              fileSize: f.size,
              fileType: f.type,
            })),
          },
        });
      });

      socket.once('room-error', (data: { message: string }) => {
        setCreateError(data.message);
        setRoomPhase('idle');
        setIsCreating(false);
      });

      socket.emit('create-room');

      setTimeout(() => {
        if (isCreating) {
          setCreateError('Room creation timed out. Please try again.');
          setRoomPhase('idle');
          setIsCreating(false);
        }
      }, 15000);
    } catch (err) {
      setCreateError('Failed to create room. Please check your connection.');
      setRoomPhase('idle');
      setIsCreating(false);
    }
  }, [isCreating, selectedFiles, navigate]);

  return (
    <div className="text-white flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-lg w-full">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 bg-clip-text text-transparent animate-gradient-shift">
          P2P Web Share
        </h1>
        <p className="text-gray-400 mb-8 text-lg animate-fade-in">
          Direct browser-to-browser file transfer. No uploads. No servers.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          className={`border-2 border-dashed rounded-xl p-12 transition-colors cursor-pointer mb-6 ${
            isDragOver
              ? 'border-blue-500 bg-blue-500/10'
              : selectedFiles.length > 0
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 hover:border-blue-500'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={selectedFiles.length === 0 ? handleFileSelect : undefined}
        >
          {selectedFiles.length > 0 ? (
            <div>
              <p className="text-green-400 text-lg font-semibold mb-2">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                {selectedFiles.map((f, i) => (
                  <div key={`${f.name}-${f.size}`} className="flex items-center justify-between text-sm px-2">
                    <span className="text-gray-300 truncate mr-2 text-left flex-1">{f.name}</span>
                    <span className="text-gray-500 whitespace-nowrap">{formatFileSize(f.size)}</span>
                    <button
                      className="ml-2 text-gray-600 hover:text-red-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="text-sm text-gray-500 hover:text-gray-300 underline"
                onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}
              >
                Clear All
              </button>
            </div>
          ) : (
          <div>
            <div className="text-4xl mb-3 text-gray-600">&#8682;</div>
            <p className="text-gray-500 text-lg">Drop your files here</p>
            <p className="text-gray-600 text-sm mt-2">or click to browse (folders supported)</p>
          </div>
          )}
        </div>

        {createError && (
          <p className="text-red-400 text-sm mb-4">{createError}</p>
        )}

        <div className="mb-4">
          <button
            className="text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
            onClick={() => navigate('/history')}
          >
            Transfer History
          </button>
        </div>

        <button
          className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
            selectedFiles.length > 0 && !isCreating
              ? 'bg-blue-600 hover:bg-blue-700 text-white hover:animate-glow-pulse active:scale-[0.98]'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
          disabled={selectedFiles.length === 0 || isCreating}
          onClick={createRoom}
        >
          {isCreating ? 'Creating room...' : 'Create Share Link'}
        </button>
      </div>
    </div>
  );
}

export default Landing;
