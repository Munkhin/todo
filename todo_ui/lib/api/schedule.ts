/**
 * scheduling API operations
 */

import { api } from './client';

export interface ScheduleConfig {
  work_hours_start: number;
  work_hours_end: number;
  focus_block_min: number;
  strategy: 'earliest_finish' | 'least_fragmentation' | 'balanced';
  criteria: string;
  days_ahead: number;
  min_importance: number;
  deadline_buffer_min: number;
}

export interface ScheduledTask {
  task_id: string;
  task_name: string;
  scheduled_start: string;
  scheduled_end: string;
  deadline: string;
  importance: number;
  duration: number;
}

export interface UnschedulableTask {
  task_id: string;
  task_name: string;
  deadline: string;
  duration: number;
  reason: string;
}

// run scheduling algorithm
export const runSchedule = async (config: Partial<ScheduleConfig> = {}) => {
  return api.post<{
    scheduled: ScheduledTask[];
    scheduled_count: number;
    unschedulable: UnschedulableTask[];
    unschedulable_count: number;
    summary: string;
  }>('/api/schedule/run', config);
};

// preview schedule without saving
export const previewSchedule = async (config: Partial<ScheduleConfig> = {}) => {
  return api.post<{
    scheduled: ScheduledTask[];
    unschedulable: UnschedulableTask[];
    preview_only: boolean;
  }>('/api/schedule/preview', config);
};

// get scheduled tasks
export const getScheduledTasks = async (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);

  const query = queryParams.toString();
  return api.get<{ scheduled_tasks: any[]; count: number }>(
    `/api/schedule/scheduled${query ? `?${query}` : ''}`
  );
};

// clear auto-scheduled events from calendar
export const clearSchedule = async () => {
  return api.delete<{ message: string; deleted_count: number }>(
    '/api/schedule/clear'
  );
};

// get scheduling status
export const getScheduleStatus = async () => {
  return api.get<{
    total_tasks: number;
    scheduled_tasks: number;
    unscheduled_tasks: number;
    sources: Record<string, number>;
    last_updated: string;
  }>('/api/schedule/status');
};
