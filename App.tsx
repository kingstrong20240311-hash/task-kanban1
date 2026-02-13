import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layout } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskMap, AppState } from './types';
import { TaskColumn } from './components/TaskColumn';

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

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem('fractal-task-state', JSON.stringify(state));
  }, [state]);

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
      if (!parent) return prev; // Should not happen

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

      // When adding a new task to a completed parent, parent becomes incomplete
      // unless we want new tasks to be auto-completed (unlikely).
      // So we must uncheck parent and bubble up.
      
      const updatedTasks = {
        ...prev.tasks,
        [newId]: newTask,
        [parentId]: {
          ...parent,
          children: [...parent.children, newId],
          completed: false // Parent is now incomplete because it has a new incomplete child
        }
      };
      
      // Propagate incomplete status up
      let currId: string | null = parent.parentId;
      while (currId) {
        const currTask = updatedTasks[currId];
        if (!currTask.completed) break; // Already incomplete, stop
        updatedTasks[currId] = { ...currTask, completed: false };
        currId = currTask.parentId;
      }

      return {
        ...prev,
        tasks: updatedTasks
      };
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setState(prev => {
      const task = prev.tasks[taskId];
      if (!task) return prev;

      const newCompleted = !task.completed;
      const tasksCopy = { ...prev.tasks };

      // 1. Update the task itself
      // 2. If turning ON: Turn ON all descendants? Or just the task?
      //    UX: Usually checking a parent checks all children. 
      //    If turning OFF: Uncheck all children? Or just task?
      //    Prompt: "When grandson tasks all completed, child task also completed."
      //    This implies bottom-up automation.
      //    Let's implement: Toggling a task forces all descendants to match that state.
      
      const updateDescendants = (id: string, status: boolean) => {
        const t = tasksCopy[id];
        if (!t) return;
        tasksCopy[id] = { ...t, completed: status };
        t.children.forEach(childId => updateDescendants(childId, status));
      };

      updateDescendants(taskId, newCompleted);

      // 3. Propagate changes UP (Bottom-Up Logic)
      //    - If task is now Done, check if all siblings are done. If so, mark parent Done. Repeat.
      //    - If task is now Not Done, mark parent Not Done. Repeat.

      let currId: string | null = task.parentId;
      while (currId) {
        const parent = tasksCopy[currId];
        if (!parent) break;

        if (newCompleted) {
          // Check if all siblings are complete
          const allChildrenComplete = parent.children.every(cid => tasksCopy[cid].completed);
          if (allChildrenComplete) {
             tasksCopy[currId] = { ...parent, completed: true };
          } else {
             // If not all complete, parent must be incomplete (which it likely is)
             if (parent.completed) tasksCopy[currId] = { ...parent, completed: false };
             else break; // No change to parent state, stop bubbling
          }
        } else {
          // If child is incomplete, parent MUST be incomplete
          if (!parent.completed) break; // Already correct
          tasksCopy[currId] = { ...parent, completed: false };
        }
        currId = parent.parentId;
      }

      return { ...prev, tasks: tasksCopy };
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setState(prev => {
      const tasksCopy = { ...prev.tasks };
      const taskToDelete = tasksCopy[taskId];
      
      // Helper to recursively collect all ids to delete
      const idsToDelete = new Set<string>();
      const collect = (id: string) => {
        idsToDelete.add(id);
        const t = tasksCopy[id];
        if (t) t.children.forEach(collect);
      };
      collect(taskId);

      // Remove from parent's children list
      if (taskToDelete.parentId) {
        const parent = tasksCopy[taskToDelete.parentId];
        if (parent) {
          tasksCopy[parent.id] = {
            ...parent,
            children: parent.children.filter(cid => cid !== taskId)
          };
          
          // Re-evaluate parent completion? 
          // If I delete the only incomplete child, parent becomes complete.
          const newChildren = tasksCopy[parent.id].children; // Updated list
          if (newChildren.length > 0 && newChildren.every(cid => tasksCopy[cid].completed)) {
            // Propagate completion up
             let currId: string | null = parent.id;
             while(currId) {
                const p = tasksCopy[currId];
                if(p.children.every(c => tasksCopy[c].completed)) {
                    tasksCopy[currId] = {...p, completed: true};
                    currId = p.parentId;
                } else {
                    break;
                }
             }
          }
        }
      }

      // Delete the tasks
      idsToDelete.forEach(id => {
        delete tasksCopy[id];
      });

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
        
        <button 
          onClick={addRootTask}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
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
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onUpdateTask={updateTask}
              onDeleteRoot={deleteTask}
            />
          ))}
          
          {/* Add Column Placeholder/Button (Optional visual cue) */}
          <button 
            onClick={addRootTask}
            className="flex flex-col items-center justify-center h-[200px] w-[60px] rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex-shrink-0"
            title="Add another project column"
          >
            <Plus size={24} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
