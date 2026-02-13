export interface Task {
  id: string;
  title: string;
  completed: boolean;
  children: string[]; // Array of child Task IDs
  parentId: string | null;
  createdAt: number;
}

export interface TaskMap {
  [id: string]: Task;
}

export type SubtaskSuggestion = string;

// Using a normalized state structure for easier updates
export interface AppState {
  tasks: TaskMap;
  rootTaskIds: string[];
}
