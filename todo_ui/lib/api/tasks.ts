/**
 * task API operations
 */

import { api } from './client';

export interface TaskEvent {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  source: string;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  estimated_duration?: number;
  difficulty?: number;
  priority: string;  // 'low' | 'medium' | 'high'
  due_date?: string;
  description?: string;
  status: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at: string;
  updated_at: string;
  events?: TaskEvent[];
}

export interface TaskCreateData {
  user_id: number;
  title: string;
  estimated_duration?: number;
  difficulty?: number;
  priority?: string;
  due_date?: string;
  description?: string;
  status?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

export interface TaskUpdateData {
  title?: string;
  estimated_duration?: number;
  difficulty?: number;
  priority?: string;
  due_date?: string;
  description?: string;
  status?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

// list all tasks with optional filters
export const listTasks = async (params?: {
  user_id?: number;
  include_completed?: boolean;
  source?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.user_id !== undefined) {
    queryParams.append('user_id', String(params.user_id));
  }
  if (params?.include_completed !== undefined) {
    queryParams.append('include_completed', String(params.include_completed));
  }
  if (params?.source) queryParams.append('source', params.source);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);

  const query = queryParams.toString();
  return api.get<{ tasks: Task[]; count: number }>(
    `/api/tasks${query ? `?${query}` : ''}`
  );
};

// create new task
export const createTask = async (data: TaskCreateData) => {
  return api.post<{ task_id: string; message: string }>('/api/tasks', data);
};

// update task
export const updateTask = async (taskId: string, data: TaskUpdateData) => {
  return api.put<{ message: string }>(`/api/tasks/${taskId}`, data);
};

// delete task
export const deleteTask = async (taskId: string) => {
  return api.delete<{ message: string }>(`/api/tasks/${taskId}`);
};
