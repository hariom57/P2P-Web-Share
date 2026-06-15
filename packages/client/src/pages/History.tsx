import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHistoryStore, type RoleFilter, type StatusFilter } from '../stores/historyStore.js';

function History() {
  const navigate = useNavigate();
  const {
    rawEntries, isLoading,
    filterRole, filterStatus,
    loadEntries, removeEntry, clearAll,
    setFilterRole, setFilterStatus,
  } = useHistoryStore();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const filtered = useMemo(() => rawEntries.filter((e) => {
    if (filterRole !== 'all' && e.role !== filterRole) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  }), [rawEntries, filterRole, filterStatus]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    error: 'text-red-400 bg-red-500/10 border-red-500/20',
    cancelled: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    interrupted: 'text-gray-400 bg-white/[0.04] border-white/[0.08]',
  };

  const statusLabels: Record<string, string> = {
    completed: 'Completed',
    error: 'Error',
    cancelled: 'Cancelled',
    interrupted: 'Interrupted',
  };

  return (
    <div className="text-white min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/[0.06]"
              onClick={() => navigate('/')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Transfer History</h1>
          </div>
          {rawEntries.length > 0 && (
            <button
              className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              onClick={() => setConfirmClear(true)}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          <select
            className="bg-white/[0.06] text-sm rounded-xl px-3.5 py-2 border border-white/[0.08] text-gray-300 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as RoleFilter)}
          >
            <option value="all">All Roles</option>
            <option value="sender">Sender</option>
            <option value="receiver">Receiver</option>
          </select>
          <select
            className="bg-white/[0.06] text-sm rounded-xl px-3.5 py-2 border border-white/[0.08] text-gray-300 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500 animate-fade-in">
            <svg className="animate-spin h-6 w-6 text-indigo-400 mr-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg font-medium mb-1">No transfers yet</p>
            <p className="text-gray-600 text-sm">Completed transfers will appear here</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <div
              key={entry.id}
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.10] animate-slide-up"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium truncate">{entry.fileName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColors[entry.status] || 'text-gray-400 bg-white/[0.04] border-white/[0.08]'}`}>
                    {statusLabels[entry.status] || entry.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatSize(entry.fileSize)}</span>
                  <span className="flex items-center gap-1">
                    {entry.role === 'sender' ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                      </svg>
                    )}
                    {entry.role === 'sender' ? 'Sent' : 'Received'}
                  </span>
                  <span>{formatDate(entry.startedAt)}</span>
                  {entry.chunksTransferred > 0 && entry.totalChunks > 0 && (
                    <span className="text-gray-600">{Math.round((entry.chunksTransferred / entry.totalChunks) * 100)}%</span>
                  )}
                </div>
              </div>
              <button
                className="text-gray-600 hover:text-red-400 text-sm transition-colors shrink-0 p-2 rounded-lg hover:bg-red-500/10"
                onClick={() => removeEntry(entry.id)}
                title="Delete entry and associated data"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {confirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/[0.08] animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-center">Clear all history?</h3>
              <p className="text-gray-400 text-sm mb-6 text-center font-light">
                This will delete all transfer history entries. Associated checkpoint data will also be cleaned up.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-medium transition-all duration-200 active:scale-95 text-sm"
                  onClick={() => { clearAll(); setConfirmClear(false); }}
                >
                  Clear
                </button>
                <button
                  className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.10] rounded-xl font-medium transition-all duration-200 active:scale-95 text-sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
