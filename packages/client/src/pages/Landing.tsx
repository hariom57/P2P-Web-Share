import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFileSize } from '@p2p-share/shared';
import { connectSocket } from '../services/socket.js';
import { useRoomStore } from '../stores/roomStore.js';
import { setActiveFile, setActiveFiles, setEncryptionKey } from '../services/data-channel-registry.js';
import { generateEncryptionKey, exportKey } from '../services/encryption.js';

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
    <div className="text-white flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="text-center max-w-lg w-full animate-fade-in">
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide uppercase">
          P2P Encrypted
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent animate-gradient-shift leading-tight">
          P2P Web Share
        </h1>
        <p className="text-gray-400 mb-8 text-base sm:text-lg animate-fade-in font-light">
          Direct browser-to-browser file transfer. <br className="hidden sm:block" />No uploads. No servers.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          className={`relative rounded-2xl p-12 sm:p-16 transition-all duration-300 cursor-pointer mb-6 border-2 border-dashed ${
            isDragOver
              ? 'border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
              : selectedFiles.length > 0
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={selectedFiles.length === 0 ? handleFileSelect : undefined}
        >
          {selectedFiles.length > 0 ? (
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-emerald-400 text-lg font-semibold mb-3">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5 mb-3 px-2">
                {selectedFiles.map((f, i) => (
                  <div key={`${f.name}-${f.size}`} className="flex items-center justify-between text-sm py-1 px-3 rounded-lg bg-white/[0.04]">
                    <span className="text-gray-300 truncate mr-2 text-left flex-1">{f.name}</span>
                    <span className="text-gray-500 whitespace-nowrap text-xs">{formatFileSize(f.size)}</span>
                    <button
                      className="ml-2 text-gray-600 hover:text-red-400 transition-colors p-1"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}
              >
                Clear All
              </button>
            </div>
          ) : (
          <div>
            <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg font-medium">Drop your files here</p>
            <p className="text-gray-600 text-sm mt-2">or click to browse &middot; folders supported</p>
          </div>
          )}
        </div>

        {createError && (
          <p className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-lg px-4 py-2 border border-red-500/20">{createError}</p>
        )}

        <button
          className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-200 tracking-wide ${
            selectedFiles.length > 0 && !isCreating
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 active:scale-[0.98]'
              : 'bg-white/[0.06] text-gray-500 cursor-not-allowed'
          }`}
          disabled={selectedFiles.length === 0 || isCreating}
          onClick={createRoom}
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating room...
            </span>
          ) : 'Create Share Link'}
        </button>

        <div className="mt-6">
          <button
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1.5"
            onClick={() => navigate('/history')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Transfer History
          </button>
        </div>
      </div>
    </div>
  );
}

export default Landing;
