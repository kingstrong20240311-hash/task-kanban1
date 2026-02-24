# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server at http://localhost:3000
pnpm build      # TypeScript compile + Vite build
pnpm preview    # Preview production build
```

No test runner is configured. There is no lint script in package.json.

**Environment:** Requires a `.env.local` file with `GEMINI_API_KEY` set for the AI subtask generation feature to work.

## Architecture

FractalTask is a React 19 + TypeScript + Vite PWA. It is a kanban-style task manager where tasks form an **infinite hierarchy** (fractal structure) — each task can have subtasks, and each subtask can have its own subtasks, navigated by drilling in/out within the same column.

### State Model (`types.ts`)

All state lives in a single normalized `AppState` object stored in `localStorage` under key `fractal-task-state`:

```ts
AppState = {
  tasks: TaskMap       // flat map of id → Task
  rootTaskIds: string[] // top-level project IDs
}
```

Each `Task` stores `children: string[]` (child IDs) and `parentId: string | null`. This normalized structure means completion cascading must be manually propagated both up and down the tree — see `toggleTask` and `addTask` in `App.tsx`.

### Component Tree

```
App.tsx                   — root state owner, all mutations live here
  └── TaskColumn.tsx       — one column per root task; owns drill-down navigation
        └── TaskItem.tsx   — single task row; inline editing, toggle, delete, navigate
  └── ConfirmationModal.tsx — modal for delete confirmation
```

`TaskColumn` keeps a local `navStack: string[]` to implement breadcrumb-style drill-down within a column. The top of the stack is the currently displayed task level.

### AI Integration (`services/geminiService.ts`)

`generateSubtasks(taskTitle)` calls the Gemini API (`gemini-3-flash-preview` model) to suggest 3–5 subtask names as a JSON array. The API key is injected at build time via Vite's `define` from `GEMINI_API_KEY` in `.env.local`.

### Key Invariants

- **Completion cascading:** Toggling a task complete/incomplete recursively updates all descendants, then propagates upward — a parent is auto-completed only when all its children are complete.
- **Tasks sorted by completion:** `TaskColumn` renders incomplete tasks first, completed tasks last.
- **No type aliasing on `@`:** The `@` path alias resolves to the project root (`.`), so imports like `@/types` work.
