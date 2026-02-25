import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, X } from 'lucide-react';
import { CompletionRecord } from '../types';

const WORK_DURATION = 30 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;
const SESSIONS_BEFORE_LONG_BREAK = 4;

type Phase = 'work' | 'short-break' | 'long-break';

interface PomodoroTimerProps {
  completions: CompletionRecord[];
  onSessionChange: (sessionNumber: number | null) => void;
}

const PHASE_DURATION: Record<Phase, number> = {
  'work': WORK_DURATION,
  'short-break': SHORT_BREAK_DURATION,
  'long-break': LONG_BREAK_DURATION,
};

const PHASE_LABEL: Record<Phase, string> = {
  'work': 'WORK',
  'short-break': 'SHORT BREAK',
  'long-break': 'LONG BREAK',
};

const PHASE_COLOR: Record<Phase, { ring: string; btn: string; bg: string; text: string }> = {
  'work': {
    ring: '#6366f1',
    btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
  },
  'short-break': {
    ring: '#10b981',
    btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  'long-break': {
    ring: '#0ea5e9',
    btn: 'bg-sky-600 hover:bg-sky-700 shadow-sky-200',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
  },
};

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ completions, onSessionChange }) => {
  const [phase, setPhase] = useState<Phase>('work');
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);
  const [currentSessionNumber, setCurrentSessionNumber] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Ref so the interval always sees latest handlers without capturing stale closures
  const phaseCompleteRef = useRef<() => void>(() => {});

  const playNotificationSound = () => {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [880, 660];
    notes.forEach((frequency, index) => {
      const startAt = now + index * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.16);
    });
  };

  const handlePhaseComplete = () => {
    playNotificationSound();

    if (phase === 'work') {
      const newCount = completedWorkSessions + 1;
      setCompletedWorkSessions(newCount);
      const nextPhase: Phase =
        newCount % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'long-break' : 'short-break';
      setPhase(nextPhase);
      setTimeRemaining(PHASE_DURATION[nextPhase]);
      setIsRunning(true); // auto-start the break
      setSessionStartedAt(null);
      onSessionChange(null);
    } else {
      // Break finished — ready for next work session
      setPhase('work');
      setTimeRemaining(WORK_DURATION);
      setIsRunning(false);
    }
  };
  phaseCompleteRef.current = handlePhaseComplete;

  useEffect(
    () => () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    },
    [],
  );

  // Countdown interval
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Defer side effects outside the setState updater
          setTimeout(() => phaseCompleteRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const handleStartPause = () => {
    if (!isRunning) {
      if (phase === 'work') {
        if (timeRemaining === WORK_DURATION) {
          // Fresh work session
          const n = currentSessionNumber + 1;
          setCurrentSessionNumber(n);
          setSessionStartedAt(Date.now());
          onSessionChange(n);
        } else {
          // Resume paused session
          onSessionChange(currentSessionNumber || 1);
          if (!sessionStartedAt) setSessionStartedAt(Date.now());
        }
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
      if (phase === 'work') onSessionChange(null);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(PHASE_DURATION[phase]);
    if (phase === 'work') {
      onSessionChange(null);
      setSessionStartedAt(null);
    }
  };

  const handleSkipBreak = () => {
    setIsRunning(false);
    setPhase('work');
    setTimeRemaining(WORK_DURATION);
  };

  const total = PHASE_DURATION[phase];
  const progress = (total - timeRemaining) / total;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const colors = PHASE_COLOR[phase];
  const isBreak = phase !== 'work';
  const cycleProgress = completedWorkSessions % SESSIONS_BEFORE_LONG_BREAK;

  // Tasks completed during the current active work session
  const sessionTasks =
    sessionStartedAt !== null
      ? completions.filter(
          c => c.completedAt >= sessionStartedAt && c.sessionNumber === currentSessionNumber,
        )
      : [];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-72 overflow-hidden">
          {/* Panel header */}
          <div className={`px-4 py-3 flex items-center justify-between ${colors.bg}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🍅</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                {PHASE_LABEL[phase]}
                {phase === 'work' && currentSessionNumber > 0 && ` #${currentSessionNumber}`}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-md"
            >
              <X size={15} />
            </button>
          </div>

          {/* Timer */}
          <div className="px-6 pt-5 pb-4 flex flex-col items-center">
            {/* Circular progress */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={colors.ring}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-mono text-slate-800">
                  {fmt(timeRemaining)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                  {PHASE_LABEL[phase]}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Reset"
              >
                <RotateCcw size={17} />
              </button>

              <button
                onClick={handleStartPause}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md active:scale-95 transition-all ${colors.btn}`}
              >
                {isRunning ? <Pause size={15} /> : <Play size={15} />}
                {isRunning ? 'Pause' : 'Start'}
              </button>

              {isBreak ? (
                <button
                  onClick={handleSkipBreak}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Skip break"
                >
                  <SkipForward size={17} />
                </button>
              ) : (
                <div className="w-9" />
              )}
            </div>

            {/* Cycle progress dots */}
            <div className="flex items-center gap-1.5 mt-4">
              {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < cycleProgress ? 'bg-indigo-400' : 'bg-slate-200'
                  }`}
                />
              ))}
              <span className="ml-1 text-[10px] text-slate-400">→ long break</span>
            </div>
          </div>

          {/* Tasks completed this session */}
          {sessionTasks.length > 0 && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Completed this session
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                {sessionTasks.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                    <span className="truncate">{c.taskTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed floating pill */}
      <button
        onClick={() => setIsExpanded(p => !p)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border transition-all active:scale-95 ${
          isRunning
            ? `${colors.btn.split(' ')[0]} ${colors.btn.split(' ')[1]} border-transparent text-white`
            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
        }`}
      >
        <span className="text-base leading-none">🍅</span>
        <span className="font-mono text-sm font-semibold tracking-wider">{fmt(timeRemaining)}</span>
        {isRunning && <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />}
      </button>
    </div>
  );
};
