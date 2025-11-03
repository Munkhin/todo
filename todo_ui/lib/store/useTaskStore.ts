import { create } from 'zustand';
import { Task, listTasks, createTask, updateTask, deleteTask, completeTask } from '@/lib/api/tasks';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  // actions
  fetchTasks: (_filters?: { source?: string; include_completed?: boolean }) => Promise<void>;
  addTask: (_taskData: Omit<Task, 'task_id'>) => Promise<void>;
  editTask: (_taskId: string, _updates: Partial<Task>) => Promise<void>;
  removeTask: (_taskId: string) => Promise<void>;
  markComplete: (_taskId: string) => Promise<void>;
  clearTasks: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  // fetch tasks from API
  fetchTasks: async (filters) => {
    set({ loading: true, error: null });
    try {
      const response = await listTasks(filters);
      set({ tasks: response.tasks, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        loading: false
      });
    }
  },

  // create new task
  addTask: async (taskData) => {
    set({ loading: true, error: null });
    try {
      await createTask(taskData as any);
      // refetch tasks after creating
      await get().fetchTasks();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
        loading: false
      });
    }
  },

  // update existing task
  editTask: async (taskId, updates) => {
    set({ loading: true, error: null });
    try {
      await updateTask(taskId, updates);
      // refetch tasks after updating
      await get().fetchTasks();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
        loading: false
      });
    }
  },

  // delete task
  removeTask: async (taskId) => {
    set({ loading: true, error: null });
    try {
      await deleteTask(taskId);
      // remove from local state
      set({
        tasks: get().tasks.filter(t => String(t.id) !== taskId),
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
        loading: false
      });
    }
  },

  // mark task as completed
  markComplete: async (taskId) => {
    set({ loading: true, error: null });
    try {
      await completeTask(taskId);
      // remove from active tasks or refetch
      await get().fetchTasks();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete task',
        loading: false
      });
    }
  },

  // clear all tasks from state
  clearTasks: () => set({ tasks: [], error: null }),
}));
