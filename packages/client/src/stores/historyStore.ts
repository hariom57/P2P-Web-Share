import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HistoryEntry } from '../services/history-store';
import {
  getAllHistoryEntries,
  saveHistoryEntry,
  deleteHistoryEntry,
  clearAllHistory,
} from '../services/history-store';
import { deleteCheckpoint, deleteRoomChunks } from '../services/checkpoint-store';

export type RoleFilter = 'all' | 'sender' | 'receiver';
export type StatusFilter = 'all' | 'completed' | 'error' | 'cancelled' | 'interrupted';

export interface HistoryState {
  entries: HistoryEntry[];
  isLoading: boolean;
  filterRole: RoleFilter;
  filterStatus: StatusFilter;

  loadEntries: () => Promise<void>;
  addEntry: (entry: HistoryEntry) => Promise<void>;
  removeEntry: (roomId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setFilterRole: (role: RoleFilter) => void;
  setFilterStatus: (status: StatusFilter) => void;
}

const initialState = {
  entries: [] as HistoryEntry[],
  isLoading: false,
  filterRole: 'all' as RoleFilter,
  filterStatus: 'all' as StatusFilter,
};

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      loadEntries: async () => {
        set({ isLoading: true });
        const { filterRole, filterStatus } = get();
        let entries = await getAllHistoryEntries();
        if (filterRole !== 'all') {
          entries = entries.filter((e) => e.role === filterRole);
        }
        if (filterStatus !== 'all') {
          entries = entries.filter((e) => e.status === filterStatus);
        }
        set({ entries, isLoading: false });
      },

      addEntry: async (entry) => {
        await saveHistoryEntry(entry);
        await get().loadEntries();
      },

      removeEntry: async (roomId) => {
        await deleteCheckpoint(roomId);
        await deleteRoomChunks(roomId);
        await deleteHistoryEntry(roomId);
        set((state) => ({
          entries: state.entries.filter((e) => e.roomId !== roomId),
        }));
      },

      clearAll: async () => {
        await clearAllHistory();
        set({ entries: [] });
      },

      setFilterRole: (role) => set({ filterRole: role }),

      setFilterStatus: (status) => set({ filterStatus: status }),
    }),
    { name: 'p2p-history' },
  ),
);
