import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Source {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

export interface SyncSchedule {
  enabled: boolean;
  times: string[]; // e.g., ['06:00', '18:00']
}

interface SourceStore {
  sources: Source[];
  sessions: Record<string, string>; // sourceId -> sessionId
  syncSchedule: SyncSchedule;
  toggleConnection: (_id: string) => Promise<void>;
  setSourceSession: (_sourceId: string, _sessionId: string) => void;
  getSourceSession: (_sourceId: string) => string | null;
  disconnectSource: (_sourceId: string) => void;
  getConnectedSources: () => Source[];
  updateSyncSchedule: (_schedule: SyncSchedule) => void;
}

export const useSourceStore = create<SourceStore>()(
  persist(
    (set, get) => ({
      sources: [
        { id: 'gmail', name: 'Gmail', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg', connected: false },
        { id: 'google-classroom', name: 'Google Classroom', icon: 'https://www.gstatic.com/classroom/logo_square_48.svg', connected: false },
      ],
      sessions: {},
      syncSchedule: {
        enabled: true,
        times: ['06:00', '18:00'],
      },
      toggleConnection: async (id: string) => {
        const currentSource = get().sources.find((s) => s.id === id);
        const willBeConnected = currentSource ? !currentSource.connected : false;

        set((state) => ({
          sources: state.sources.map((source) =>
            source.id === id ? { ...source, connected: !source.connected } : source
          ),
        }));

        // trigger sync when connecting a source
        if (willBeConnected) {
          try {
            await fetch(`/api/sources/${id}/sync`, {
              method: 'POST',
            });
          } catch (error) {
            console.error(`Failed to sync ${id}:`, error);
          }
        }
      },
      setSourceSession: (sourceId: string, sessionId: string) => {
        set((state) => ({
          sessions: { ...state.sessions, [sourceId]: sessionId },
          sources: state.sources.map((source) =>
            source.id === sourceId ? { ...source, connected: true } : source
          ),
        }));
      },
      getSourceSession: (sourceId: string) => {
        return get().sessions[sourceId] || null;
      },
      disconnectSource: (sourceId: string) => {
        set((state) => {
          const newSessions = { ...state.sessions };
          delete newSessions[sourceId];
          return {
            sessions: newSessions,
            sources: state.sources.map((source) =>
              source.id === sourceId ? { ...source, connected: false } : source
            ),
          };
        });
      },
      getConnectedSources: () => get().sources.filter((s) => s.connected),
      updateSyncSchedule: (schedule: SyncSchedule) =>
        set({ syncSchedule: schedule }),
    }),
    {
      name: 'source-storage',
    }
  )
);
