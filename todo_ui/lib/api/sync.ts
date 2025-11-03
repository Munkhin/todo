/**
 * sync API operations for sources
 */

import { api } from './client';
import { Task } from './tasks';

export interface SyncRequest {
  session_id: string;
  criteria?: string;
  days_ahead?: number;
  min_importance?: number;
}

export interface SyncResponse {
  source: string;
  tasks_found: number;
  tasks_saved: number;
  tasks: Task[];
}

export interface SyncAllResponse {
  total_tasks_found: number;
  tasks_saved: number;
  sources: Record<string, { tasks_found?: number; status: string; error?: string }>;
  tasks: Task[];
}

// sync Gmail tasks
export const syncGmail = async (request: SyncRequest) => {
  return api.post<SyncResponse>('/api/sync/gmail', request);
};

// sync Google Classroom tasks
export const syncClassroom = async (request: SyncRequest) => {
  return api.post<SyncResponse>('/api/sync/classroom', request);
};

// sync all sources
export const syncAll = async (request: SyncRequest) => {
  return api.post<SyncAllResponse>('/api/sync/all', request);
};

// get sync status
export const getSyncStatus = async (sessionId: string) => {
  return api.get<{
    total_tasks: number;
    sources: Record<string, { count: number; latest_created: string | null }>;
    checked_at: string;
  }>(`/api/sync/status?session_id=${sessionId}`);
};
