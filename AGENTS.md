# AGENTS.md - Syntropy (凝序)

> PWA office system | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui

## Commands

```bash
# Package manager: pnpm (required)
pnpm install              # Install dependencies
pnpm dev                  # Dev server (localhost:3000)
pnpm build                # Production build
pnpm lint                 # ESLint check
pnpm format               # Prettier format

# Unit Tests (Vitest)
pnpm test                 # Watch mode
pnpm test:run             # Single run (CI)
pnpm test src/lib/parseCommand.test.ts       # Single file
npx vitest run -t "should parse delete"      # Pattern match

# E2E Tests (Playwright)
pnpm test:e2e             # All E2E tests
pnpm test:e2e:ui          # Playwright UI mode
pnpm test:e2e:headed      # With browser visible
```

## Project Structure

```
src/
├── app/                   # Next.js App Router pages
├── components/
│   ├── ui/               # shadcn/ui primitives (DO NOT MODIFY)
│   └── *.tsx             # App components
├── lib/                   # Utilities, AI service, db.ts
├── stores/               # Zustand stores (useXxxStore.ts)
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
└── test/                 # Test setup and mocks
e2e/                      # Playwright E2E tests
```

## Code Style

### TypeScript

- **Strict mode** - No `any`, no `@ts-ignore`, no `@ts-expect-error`
- ESLint: `@typescript-eslint/no-explicit-any: "error"`
- Path alias: `@/*` → `./src/*`
- Types in `@/types/index.ts` or `@/types/*.ts`

### Formatting (Prettier)

- Double quotes, semicolons, 2-space indent
- `printWidth: 100`, `trailingComma: "es5"`
- Tailwind class sorting via plugin

### Import Order

```typescript
// 1. React/Next.js
import { useState } from "react";
import { useRouter } from "next/navigation";
// 2. External libraries
import { create } from "zustand";
// 3. Internal (@/ alias)
import { useTaskStore } from "@/stores/useTaskStore";
import { Button } from "@/components/ui/button";
import type { SyntropyTask } from "@/types";
import { cn } from "@/lib/utils";
```

### React Components

```typescript
"use client"; // Required for client components

interface TaskCardProps {
  task: SyntropyTask;
  onEdit?: (taskId: string) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  // Functional components, named exports
}
```

### Zustand Stores

```typescript
// File: useXxxStore.ts | Export: useXxxStore
export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  loadTasks: async () => {
    set({ isLoading: true }); /* ... */
  },
}));
```

### Error Handling

```typescript
try {
  await someAsyncOperation();
} catch (error) {
  // NEVER empty catch blocks
  console.error("操作失败:", error);
  set({ error: error instanceof Error ? error.message : "未知错误" });
}
```

### UI / Styling

- Use shadcn/ui from `@/components/ui/`
- Tailwind CSS for styling
- Use `cn()` for conditional classes: `cn("base", condition && "extra")`

### Comments

- JSDoc in Chinese for public APIs
- Inline comments: Chinese or English

## ID Formats

| Entity  | Format          | Example         |
| ------- | --------------- | --------------- |
| Task    | `SYN-YYYY-XXXX` | `SYN-2026-0001` |
| Project | `PROJ-XXXX`     | `PROJ-0001`     |
| Device  | `DEV-xxxxxxxx`  | `DEV-a1b2c3d4`  |

## Testing

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from "vitest";

describe("parseCommand", () => {
  it("should parse delete command", async () => {
    const result = await parseCommand("删除任务");
    expect(result.action).toBe("DELETE");
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("should load home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/凝序|Syntropy/i);
});
```

## Key Patterns

1. **Local-first**: IndexedDB (Dexie.js), sync to cloud
2. **Soft delete**: Use `deletedAt` field, never hard delete
3. **Lamport clock**: Conflict resolution in sync
4. **5-second undo**: All operations reversible
5. **PWA ready**: Offline support, installable

## Tech Stack

| Layer     | Technology               |
| --------- | ------------------------ |
| Framework | Next.js 14 (App Router)  |
| UI        | Tailwind CSS + shadcn/ui |
| State     | Zustand                  |
| Storage   | IndexedDB (Dexie.js)     |
| Auth      | Supabase Auth            |
| AI        | OpenAI / DeepSeek (BYOK) |
| Testing   | Vitest + Playwright      |

## Do Not

- Modify `@/components/ui/*` (shadcn primitives)
- Use `any` type or `@ts-ignore`
- Hard delete data (use `deletedAt`)
- Commit API keys or secrets
- Skip error handling in async operations
- Empty catch blocks
