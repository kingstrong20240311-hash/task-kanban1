import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronRight, Trash2, Sparkles, Loader2, Pencil } from 'lucide-react';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  childCount: number;
  completedCount: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  onGenerateSubtasks: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
  isGenerating: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  childCount,
  completedCount,
  onToggle,
  onDelete,
  onNavigate,
  onGenerateSubtasks,
  onUpdate,
  isGenerating
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  const handleGenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerateSubtasks(task.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(task.title);
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate(task.id, editTitle.trim());
    } else {
      setEditTitle(task.title); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(task.title);
    }
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      onClick={() => !isEditing && onNavigate(task.id)}
      className={`
        group flex items-center justify-between p-3 mb-2 rounded-lg border 
        transition-all duration-200 cursor-pointer hover:shadow-md
        ${task.completed 
          ? 'bg-slate-50 border-slate-200' 
          : 'bg-white border-slate-200 hover:border-indigo-300'
        }
      `}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`
            flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors
            ${task.completed 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'bg-white border-slate-300 group-hover:border-indigo-400'
            }
          `}
        >
          {task.completed && <Check size={14} strokeWidth={3} />}
        </button>
        
        <div className="flex-1 min-w-0 mr-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={handleInputClick}
              className="w-full bg-white border border-indigo-300 rounded px-1 py-0.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          ) : (
            <>
              <h3 className={`font-medium truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {task.title}
              </h3>
              {childCount > 0 && (
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className={completedCount === childCount && childCount > 0 ? 'text-emerald-600 font-medium' : ''}>
                    {completedCount}/{childCount} done
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`flex items-center gap-1 transition-opacity ${isEditing ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
        {/* Magic / AI Generate */}
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="Auto-generate subtasks with AI"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        </button>

        {/* Edit */}
        <button 
          onClick={handleEditClick}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="Edit task"
        >
          <Pencil size={16} />
        </button>

        {/* Delete */}
        <button 
          onClick={handleDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {!isEditing && (
        <div className="pl-2 text-slate-300 group-hover:text-indigo-400">
          <ChevronRight size={18} />
        </div>
      )}
    </div>
  );
};
