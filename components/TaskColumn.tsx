import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, MoreVertical, Layout, CheckCircle2, Pencil } from 'lucide-react';
import { Task, TaskMap } from '../types';
import { TaskItem } from './TaskItem';
import { generateSubtasks } from '../services/geminiService';

interface TaskColumnProps {
  rootId: string;
  tasks: TaskMap;
  onAddTask: (parentId: string, title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteRoot: (id: string) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  rootId,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onDeleteRoot
}) => {
  // Navigation stack: array of task IDs, starting with the rootId
  const [navStack, setNavStack] = useState<string[]>([rootId]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  
  // Header editing state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerEditTitle, setHeaderEditTitle] = useState('');
  const headerInputRef = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // The ID of the task currently being viewed (top of stack)
  const currentViewId = navStack[navStack.length - 1];
  const currentTask = tasks[currentViewId];

  useEffect(() => {
    if (isEditingHeader && headerInputRef.current) {
      headerInputRef.current.focus();
    }
  }, [isEditingHeader]);

  // If the root task is deleted externally, this component might receive undefined currentTask
  // Handled by rendering nothing or a placeholder.
  if (!currentTask) return null;

  // Breadcrumbs logic
  const handleBack = () => {
    if (navStack.length > 1) {
      setNavStack(prev => prev.slice(0, -1));
    }
  };

  const handleNavigate = (taskId: string) => {
    setNavStack(prev => [...prev, taskId]);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(currentViewId, newTaskTitle.trim());
    setNewTaskTitle('');
  };

  const handleGenerateSubtasks = async (taskId: string) => {
    if (generatingIds.has(taskId)) return;
    
    setGeneratingIds(prev => new Set(prev).add(taskId));
    const targetTask = tasks[taskId];
    
    try {
      const suggestions = await generateSubtasks(targetTask.title);
      suggestions.forEach(title => {
        onAddTask(taskId, title);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleTaskTitleUpdate = (id: string, newTitle: string) => {
    onUpdateTask(id, { title: newTitle });
  };

  const startHeaderEdit = () => {
    setHeaderEditTitle(currentTask.title);
    setIsEditingHeader(true);
  };

  const saveHeaderEdit = () => {
    if (headerEditTitle.trim()) {
      onUpdateTask(currentViewId, { title: headerEditTitle.trim() });
    }
    setIsEditingHeader(false);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveHeaderEdit();
    } else if (e.key === 'Escape') {
      setIsEditingHeader(false);
    }
  };

  // Calculate progress for current view
  const children = currentTask.children.map(id => tasks[id]).filter(Boolean);
  const totalChildren = children.length;
  const completedChildren = children.filter(c => c.completed).length;
  const progress = totalChildren === 0 ? 0 : (completedChildren / totalChildren) * 100;

  // Root task specific styles vs nested styles
  const isRootView = navStack.length === 1;

  return (
    <div className="flex flex-col h-full w-[360px] flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
      
      {/* Header Area */}
      <div className={`p-4 ${isRootView ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
        <div className="flex items-center justify-between mb-2">
           {isRootView ? (
             <div className="flex items-center gap-2 text-slate-500">
                <Layout size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Project</span>
             </div>
           ) : (
             <button 
               onClick={handleBack}
               className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
             >
               <ArrowLeft size={16} />
               Back
             </button>
           )}
           
           {isRootView && (
             <button 
                onClick={() => onDeleteRoot(rootId)} 
                className="text-slate-300 hover:text-red-500 transition-colors"
                title="Delete Project"
             >
               <MoreVertical size={16} />
             </button>
           )}
        </div>

        <div className="flex items-start gap-2 group/header">
          {isEditingHeader ? (
             <input 
                ref={headerInputRef}
                value={headerEditTitle}
                onChange={(e) => setHeaderEditTitle(e.target.value)}
                onBlur={saveHeaderEdit}
                onKeyDown={handleHeaderKeyDown}
                className="flex-1 text-xl font-bold text-slate-800 bg-white border border-indigo-300 rounded px-1 -ml-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
             />
          ) : (
             <>
               <h2 
                 onClick={startHeaderEdit}
                 className="text-xl font-bold text-slate-800 leading-tight break-words cursor-pointer hover:text-indigo-900 transition-colors flex-1"
               >
                 {currentTask.title}
               </h2>
               <button 
                  onClick={startHeaderEdit}
                  className="opacity-0 group-hover/header:opacity-100 text-slate-400 hover:text-indigo-600 p-1 transition-all"
                  title="Edit title"
               >
                 <Pencil size={14} />
               </button>
             </>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-400 tabular-nums">
            {completedChildren}/{totalChildren}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {children.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 text-sm space-y-2 pb-12">
            <CheckCircle2 size={32} strokeWidth={1.5} className="opacity-20" />
            <p>No tasks yet</p>
          </div>
        ) : (
          children.map(child => {
             const subChildIds = child.children || [];
             const subCompleted = subChildIds.map(id => tasks[id]?.completed).filter(Boolean).length;
             return (
               <TaskItem
                 key={child.id}
                 task={child}
                 childCount={subChildIds.length}
                 completedCount={subCompleted}
                 onToggle={onToggleTask}
                 onDelete={onDeleteTask}
                 onNavigate={handleNavigate}
                 onGenerateSubtasks={handleGenerateSubtasks}
                 onUpdate={handleTaskTitleUpdate}
                 isGenerating={generatingIds.has(child.id)}
               />
             );
          })
        )}
      </div>

      {/* Footer Add Task */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <form onSubmit={handleAddTaskSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a new task..."
            className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm"
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
