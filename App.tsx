import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Layout, BarChart2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskMap, AppState, CompletionRecord } from './types';
import { TaskColumn } from './components/TaskColumn';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PomodoroTimer } from './components/PomodoroTimer';
import { StatisticsView } from './components/StatisticsView';

// Initial state persistence helper
const loadState = (): AppState => {
  const saved = localStorage.getItem('fractal-task-state');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved state", e);
    }
  }
  // Default Initial State
  const rootId = uuidv4();
  return {
    tasks: {
      [rootId]: {
        id: rootId,
        title: "My First Project",
        description: "",
        completed: false,
        children: [],
        parentId: null,
        createdAt: Date.now()
      }
    },
    rootTaskIds: [rootId]
  };
};

const loadCompletions = (): CompletionRecord[] => {
  try {
    const saved = localStorage.getItem('pomodoro-completions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [completions, setCompletions] = useState<CompletionRecord[]>(loadCompletions);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Ref so toggleTask can read the current tasks map without stale closure
  const tasksRef = useRef(state.tasks);
  useEffect(() => { tasksRef.current = state.tasks; }, [state.tasks]);

  // Active pomodoro session number (null when no session running)
  const activeSessionRef = useRef<number | null>(null);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('fractal-task-state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('pomodoro-completions', JSON.stringify(completions));
  }, [completions]);

  // Called by PomodoroTimer whenever a work session starts or ends
  const handleSessionChange = useCallback((sessionNumber: number | null) => {
    activeSessionRef.current = sessionNumber;
  }, []);

  // --- Actions ---

  const addRootTask = () => {
    const id = uuidv4();
    const newTask: Task = {
      id,
      title: "New Project",
      description: "",
      completed: false,
      children: [],
      parentId: null,
      createdAt: Date.now()
    };
    setState(prev => ({
      tasks: { ...prev.tasks, [id]: newTask },
      rootTaskIds: [...prev.rootTaskIds, id]
    }));
  };

  const addTask = useCallback((parentId: string, title: string) => {
    setState(prev => {
      const parent = prev.tasks[parentId];
      if (!parent) return prev;

      const newId = uuidv4();
      const newTask: Task = {
        id: newId,
        title,
        description: "",
        completed: false,
        children: [],
        parentId,
        createdAt: Date.now()
      };

      const updatedTasks = {
        ...prev.tasks,
        [newId]: newTask,
        [parentId]: {
          ...parent,
          children: [...parent.children, newId],
          completed: false
        }
      };

      let currId: string | null = parent.parentId;
      while (currId) {
        const currTask = updatedTasks[currId];
        if (!currTask.completed) break;
        updatedTasks[currId] = { ...currTask, completed: false };
        currId = currTask.parentId;
      }

      return { ...prev, tasks: updatedTasks };
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setState(prev => {
      const task = prev.tasks[taskId];
      if (!task) return prev;

      const newCompleted = !task.completed;
      const tasksCopy = { ...prev.tasks };

      const updateDescendants = (id: string, status: boolean) => {
        const t = tasksCopy[id];
        if (!t) return;
        tasksCopy[id] = { ...t, completed: status };
        t.children.forEach(childId => updateDescendants(childId, status));
      };

      updateDescendants(taskId, newCompleted);

      let currId: string | null = task.parentId;
      while (currId) {
        const parent = tasksCopy[currId];
        if (!parent) break;

        if (newCompleted) {
          const allChildrenComplete = parent.children.every(cid => tasksCopy[cid].completed);
          if (allChildrenComplete) {
            tasksCopy[currId] = { ...parent, completed: true };
          } else {
            if (parent.completed) tasksCopy[currId] = { ...parent, completed: false };
            else break;
          }
        } else {
          if (!parent.completed) break;
          tasksCopy[currId] = { ...parent, completed: false };
        }
        currId = parent.parentId;
      }

      return { ...prev, tasks: tasksCopy };
    });
  }, []);

  // Wrapper that records a completion record before delegating to toggleTask
  const handleToggleTask = useCallback((taskId: string) => {
    const task = tasksRef.current[taskId];
    if (task && !task.completed) {
      // Task is about to become complete — record it
      setCompletions(prev => [
        ...prev,
        {
          id: uuidv4(),
          taskId,
          taskTitle: task.title,
          completedAt: Date.now(),
          sessionNumber: activeSessionRef.current,
        },
      ]);
    }
    toggleTask(taskId);
  }, [toggleTask]);

  // Internal function to actually perform deletion
  const executeDeleteTask = useCallback((taskId: string) => {
    setState(prev => {
      const tasksCopy = { ...prev.tasks };
      const taskToDelete = tasksCopy[taskId];

      const idsToDelete = new Set<string>();
      const collect = (id: string) => {
        idsToDelete.add(id);
        const t = tasksCopy[id];
        if (t) t.children.forEach(collect);
      };
      collect(taskId);

      if (taskToDelete?.parentId) {
        const parent = tasksCopy[taskToDelete.parentId];
        if (parent) {
          tasksCopy[parent.id] = {
            ...parent,
            children: parent.children.filter(cid => cid !== taskId)
          };

          const newChildren = tasksCopy[parent.id].children;
          if (newChildren.length > 0 && newChildren.every(cid => tasksCopy[cid].completed)) {
            let currId: string | null = parent.id;
            while (currId) {
              const p = tasksCopy[currId];
              if (p.children.every(c => tasksCopy[c].completed)) {
                tasksCopy[currId] = { ...p, completed: true };
                currId = p.parentId;
              } else {
                break;
              }
            }
          }
        }
      }

      idsToDelete.forEach(id => { delete tasksCopy[id]; });

      return {
        ...prev,
        tasks: tasksCopy,
        rootTaskIds: prev.rootTaskIds.filter(id => id !== taskId)
      };
    });
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [id]: { ...prev.tasks[id], ...updates }
      }
    }));
  }, []);

  const reorderTasks = useCallback((parentId: string, newChildIds: string[]) => {
    setState(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [parentId]: { ...prev.tasks[parentId], children: newChildIds }
      }
    }));
  }, []);

  // --- Modal Handlers ---

  const initiateDelete = (taskId: string) => {
    setTaskToDelete(taskId);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      executeDeleteTask(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const cancelDelete = () => {
    setTaskToDelete(null);
  };

  const getDeleteMessage = () => {
    if (!taskToDelete) return "";
    const task = state.tasks[taskToDelete];
    const isProject = state.rootTaskIds.includes(taskToDelete);

    if (isProject) {
      return `Are you sure you want to delete the project "${task?.title}"? This will permanently delete all tasks within it. This action cannot be undone.`;
    }
    return `Are you sure you want to delete "${task?.title}"? Any subtasks will also be permanently deleted.`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="flex-none h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-md">
            <Layout size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Fractal<span className="text-indigo-600">Task</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Statistics button */}
          <button
            onClick={() => setIsStatsOpen(true)}
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg font-medium text-sm transition-all"
            title="Today's statistics"
          >
            <BarChart2 size={18} />
            <span className="hidden sm:inline">Statistics</span>
          </button>

          <button
            onClick={addRootTask}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md active:scale-95"
          >
            <Plus size={18} />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Main Board Area */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex items-start gap-6 p-6 min-w-max">
          {state.rootTaskIds.map(rootId => (
            <TaskColumn
              key={rootId}
              rootId={rootId}
              tasks={state.tasks}
              onAddTask={addTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={initiateDelete}
              onUpdateTask={updateTask}
              onDeleteRoot={initiateDelete}
              onReorderTasks={reorderTasks}
            />
          ))}

          {/* Add Column Placeholder/Button */}
          <button
            onClick={addRootTask}
            className="flex flex-col items-center justify-center h-[200px] w-[60px] rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex-shrink-0"
            title="Add another project column"
          >
            <Plus size={24} />
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!taskToDelete}
        title="Delete Task"
        message={getDeleteMessage()}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />

      {/* Pomodoro Timer (floating) */}
      <PomodoroTimer
        completions={completions}
        onSessionChange={handleSessionChange}
      />

      {/* Statistics View */}
      <StatisticsView
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        completions={completions}
      />
    </div>
  );
};

export default App;
