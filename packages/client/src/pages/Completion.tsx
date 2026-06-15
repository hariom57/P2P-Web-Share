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
    <div className="text-white flex flex-col items-center min-h-screen p-4 sm:p-6">
      <div className="text-center max-w-lg w-full">
        {phase === 'complete' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5 animate-scale-in">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 animate-slide-up tracking-tight" style={{ animationDelay: '0.1s' }}>Transfer Complete</h2>
            <p className="text-gray-400 mb-6 animate-fade-in font-light" style={{ animationDelay: '0.2s' }}>
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
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Transfer Failed</h2>
            <p className="text-red-400 mb-6 font-light">{errorMsg || 'An error occurred during transfer.'}</p>
          </>
        )}

        {phase === 'cancelled' && (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Transfer Cancelled</h2>
            <p className="text-gray-400 mb-6 font-light">The transfer was cancelled.</p>
          </>
        )}

        {canPreview && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-400 mb-3 font-medium">Preview</p>
            {fileType.startsWith('image/') ? (
              <img
                src={previewUrl!}
                alt="File preview"
                className="max-w-full max-h-80 mx-auto rounded-xl object-contain"
              />
            ) : fileType === 'application/pdf' ? (
              <embed
                src={previewUrl!}
                type="application/pdf"
                className="w-full h-80 rounded-xl"
              />
            ) : (
              <PreviewText url={previewUrl!} />
            )}
          </div>
        )}

        <button
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg shadow-indigo-600/25"
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
    const abort = new AbortController();
    fetch(url, { signal: abort.signal })
      .then((r) => r.text())
      .then((t) => setText(t.slice(0, 5000)))
      .catch(() => {
        if (!abort.signal.aborted) setText('(unable to preview)');
      });
    return () => abort.abort();
  }, [url]);

  return (
    <pre className="text-left text-xs text-gray-300 max-h-80 overflow-auto whitespace-pre-wrap font-mono bg-gray-950/50 rounded-xl p-4">
      {text || 'Loading...'}
    </pre>
  );
}

export default Completion;
