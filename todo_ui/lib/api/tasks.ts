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
  topic: string;
  estimated_minutes: number;
  difficulty: number;
  due_date: string;
  description?: string;
  status: string;
  scheduled_start?: string;
  scheduled_end?: string;
  review_count: number;
  confidence_score: number;
  events?: TaskEvent[];
}

export interface TaskCreateData {
  user_id: number;
  topic: string;
  estimated_minutes: number;
  difficulty?: number;
  due_date: string;
  description?: string;
  source_text?: string;
  confidence_score?: number;
}

export interface TaskUpdateData {
  topic?: string;
  estimated_minutes?: number;
  difficulty?: number;
  due_date?: string;
  description?: string;
  status?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

// list all tasks with optional filters
export const listTasks = async (params?: {
  include_completed?: boolean;
  source?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const queryParams = new URLSearchParams();
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

// get single task
export const getTask = async (taskId: string) => {
  return api.get<{ task: Task }>(`/api/tasks/${taskId}`);
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

// mark task as completed
export const completeTask = async (taskId: string) => {
  return api.post<{ message: string }>(`/api/tasks/${taskId}/complete`);
};
