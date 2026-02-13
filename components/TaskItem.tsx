import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  childCount: number;
  completedCount: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  childCount,
  completedCount,
  onToggle,
  onDelete,
  onNavigate,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
  };

  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle) {
      onUpdate(task.id, { 
        title: trimmedTitle,
        description: editDescription.trim()
      });
    } else {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
    }
    setIsEditing(false);
  };

  // Handle click outside to save
  const handleContainerBlur = (e: React.FocusEvent) => {
    // If the new focus target is NOT inside the current container, save and close
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      handleSave();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
       // Allow Enter in textarea to make new line?
       // Usually Enter in title should go to desc, Enter in desc should new line.
       // Ctrl+Enter to save.
       if ((e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
          // Ideally move focus to textarea, but simple save is okay too if no description intended.
          // Let's just save for simplicity or maybe focus next.
          // For now, let's allow Enter to save if in Title, or keep default behavior.
          // Better UX: Enter in Title -> Save. 
          handleSave();
       }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(task.title);
      setEditDescription(task.description || '');
    }
  };
  
  const handleKeyDownTextArea = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
        setIsEditing(false);
        setEditTitle(task.title);
        setEditDescription(task.description || '');
    }
    // Allow standard Enter for new lines in textarea
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      ref={containerRef}
      onBlur={isEditing ? handleContainerBlur : undefined}
      onClick={() => !isEditing && onNavigate(task.id)}
      className={`
        group flex items-start justify-between p-3 mb-2 rounded-lg border 
        transition-all duration-200 cursor-pointer hover:shadow-md
        ${task.completed 
          ? 'bg-slate-50 border-slate-200' 
          : 'bg-white border-slate-200 hover:border-indigo-300'
        }
      `}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`
            flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors
            ${task.completed 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'bg-white border-slate-300 group-hover:border-indigo-400'
            }
          `}
        >
          {task.completed && <Check size={14} strokeWidth={3} />}
        </button>
        
        <div className="flex-1 min-w-0 mr-2 space-y-1">
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onClick={handleInputClick}
                  placeholder="Task title"
                  className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleKeyDownTextArea}
                  onClick={handleInputClick}
                  placeholder="Add a description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[60px]"
                />
                <div className="text-[10px] text-slate-400 text-right">Click outside to save</div>
            </div>
          ) : (
            <>
              <h3 className={`font-medium leading-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {task.title}
              </h3>
              
              {task.description && (
                <p className={`text-xs whitespace-pre-wrap leading-relaxed ${task.completed ? 'text-slate-300' : 'text-slate-500'}`}>
                  {task.description}
                </p>
              )}

              {childCount > 0 && (
                <div className="text-xs text-slate-400 pt-1 flex items-center gap-1">
                  <span className={completedCount === childCount && childCount > 0 ? 'text-emerald-600 font-medium' : ''}>
                    {completedCount}/{childCount} subtasks
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`flex items-start gap-1 transition-opacity ${isEditing ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
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
        <div className="pl-2 mt-0.5 text-slate-300 group-hover:text-indigo-400">
          <ChevronRight size={18} />
        </div>
      )}
    </div>
  );
};
