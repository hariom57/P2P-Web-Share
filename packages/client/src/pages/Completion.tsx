import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

function isPreviewable(mime: string): boolean {
  return mime.startsWith('image/') || mime.startsWith('text/') || mime === 'application/pdf';
}

function Completion() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const state = location.state as {
    phase?: string;
    fileName?: string | null;
    files?: string[];
    error?: string | null;
    previewUrl?: string | null;
    fileType?: string;
  } | null;
  const previewUrlRef = useRef<string | null>(null);

  const phase = state?.phase || 'complete';
  const fileNames = state?.files;
  const errorMsg = state?.error;
  const previewUrl = state?.previewUrl;
  const fileType = state?.fileType || '';

  useEffect(() => {
    previewUrlRef.current = previewUrl || null;
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [previewUrl]);

  const formatList = (names: string[]) => {
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
  };

  const canPreview = previewUrl && isPreviewable(fileType);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4">
      <div className="text-center max-w-lg w-full">
        {phase === 'complete' && (
          <>
            <div className="text-6xl mb-4 text-green-400 animate-scale-in">&#10003;</div>
            <h2 className="text-2xl font-bold mb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>Transfer Complete</h2>
            <p className="text-gray-400 mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {fileNames && fileNames.length > 1
                ? `${fileNames.length} files transferred successfully.`
                : fileNames && fileNames.length === 1
                  ? `${fileNames[0]} transferred successfully.`
                  : 'File has been transferred successfully.'}
            </p>
            {fileNames && fileNames.length > 1 && (
              <p className="text-gray-500 text-sm mb-6">{formatList(fileNames)}</p>
            )}
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="text-6xl mb-4 text-red-400">&#10007;</div>
            <h2 className="text-2xl font-bold mb-2">Transfer Failed</h2>
            <p className="text-red-400 mb-6">{errorMsg || 'An error occurred during transfer.'}</p>
          </>
        )}

        {phase === 'cancelled' && (
          <>
            <div className="text-6xl mb-4 text-gray-400">&#9632;</div>
            <h2 className="text-2xl font-bold mb-2">Transfer Cancelled</h2>
            <p className="text-gray-400 mb-6">The transfer was cancelled.</p>
          </>
        )}

        {canPreview && (
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-3">Preview</p>
            {fileType.startsWith('image/') ? (
              <img
                src={previewUrl!}
                alt="File preview"
                className="max-w-full max-h-80 mx-auto rounded object-contain"
              />
            ) : fileType === 'application/pdf' ? (
              <embed
                src={previewUrl!}
                type="application/pdf"
                className="w-full h-80 rounded"
              />
            ) : (
              <PreviewText url={previewUrl!} />
            )}
          </div>
        )}

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          onClick={() => navigate('/')}
        >
          Share Another File
        </button>
      </div>
    </div>
  );
}

function PreviewText({ url }: { url: string }) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => setText(t.slice(0, 5000)))
      .catch(() => setText('(unable to preview)'));
  }, [url]);

  return (
    <pre className="text-left text-xs text-gray-300 max-h-80 overflow-auto whitespace-pre-wrap font-mono bg-gray-950 rounded p-3">
      {text || 'Loading...'}
    </pre>
  );
}

export default Completion;
