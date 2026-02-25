export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  children: string[]; // Array of child Task IDs
  parentId: string | null;
  createdAt: number;
}

export interface TaskMap {
  [id: string]: Task;
}

// Using a normalized state structure for easier updates
export interface AppState {
  tasks: TaskMap;
  rootTaskIds: string[]; // top-level project IDs
  rootThreadIds: string[]; // top-level thread IDs
}

export type SubtaskSuggestion = string;

export interface CompletionRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: number; // ms timestamp
  sessionNumber: number | null; // active pomodoro session when completed
}
