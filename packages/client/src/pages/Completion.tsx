import { useNavigate, useParams, useLocation } from 'react-router-dom';

function Completion() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const state = location.state as { phase?: string; fileName?: string | null; error?: string | null } | null;

  const phase = state?.phase || 'complete';
  const fileName = state?.fileName;
  const errorMsg = state?.error;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        {phase === 'complete' && (
          <>
            <div className="text-6xl mb-4 text-green-400">&#10003;</div>
            <h2 className="text-2xl font-bold mb-2">Transfer Complete</h2>
            <p className="text-gray-400 mb-6">
              {fileName ? `${fileName} transferred successfully.` : 'File has been transferred successfully.'}
            </p>
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

export default Completion;
