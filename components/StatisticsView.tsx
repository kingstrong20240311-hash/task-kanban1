import React from 'react';
import { X, CheckCircle2, Clock, Flame } from 'lucide-react';
import { CompletionRecord } from '../types';

interface StatisticsViewProps {
  isOpen: boolean;
  onClose: () => void;
  completions: CompletionRecord[];
}

const isToday = (ts: number) => {
  const d = new Date(ts);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
};

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const fmtDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  isOpen,
  onClose,
  completions,
}) => {
  if (!isOpen) return null;

  const todayItems = completions.filter(c => isToday(c.completedAt));

  // Group by session number, preserving insertion order of groups
  const groupOrder: (number | null)[] = [];
  const grouped: Map<number | null, CompletionRecord[]> = new Map();

  todayItems
    .slice()
    .sort((a, b) => a.completedAt - b.completedAt)
    .forEach(c => {
      if (!grouped.has(c.sessionNumber)) {
        grouped.set(c.sessionNumber, []);
        groupOrder.push(c.sessionNumber);
      }
      grouped.get(c.sessionNumber)!.push(c);
    });

  // Sessions (non-null) in ascending order, then "no session" group last
  const sessionKeys = groupOrder.filter(k => k !== null) as number[];
  const hasNoSession = grouped.has(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Today's Progress</h2>
            <p className="text-xs text-slate-400 mt-0.5">{fmtDate()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none">{todayItems.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">tasks completed</p>
            </div>
          </div>
          {sessionKeys.length > 0 && (
            <div className="flex items-center gap-3 ml-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Flame size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 leading-none">
                  {sessionKeys.length}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sessionKeys.length === 1 ? 'session' : 'sessions'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
          {todayItems.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300 space-y-2">
              <Clock size={32} strokeWidth={1.5} className="opacity-40" />
              <p className="text-sm">No tasks completed today yet</p>
            </div>
          ) : (
            <>
              {/* Pomodoro sessions */}
              {sessionKeys.map(sn => (
                <div key={sn}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🍅</span>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Session {sn}
                    </p>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] text-slate-400">
                      {fmtTime(grouped.get(sn)![0].completedAt)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {grouped.get(sn)!.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{c.taskTitle}</span>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-3">
                          {fmtTime(c.completedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Tasks completed outside any session */}
              {hasNoSession && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Outside sessions
                    </p>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <div className="space-y-1.5">
                    {grouped.get(null)!.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full flex-shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{c.taskTitle}</span>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-3">
                          {fmtTime(c.completedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
