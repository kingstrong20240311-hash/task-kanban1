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
  rootTaskIds: string[];
}

export type SubtaskSuggestion = string;