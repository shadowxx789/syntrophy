# AGENTS.md - Syntropy (凝序)

> PWA office system built on "negative entropy" philosophy
> Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui

## Build & Development Commands

```bash
# Package manager: pnpm (required)
pnpm install              # Install dependencies

# Development
pnpm dev                  # Start dev server (http://localhost:3000)
pnpm build                # Production build
pnpm start                # Start production server

# Linting & Formatting
pnpm lint                 # ESLint check
pnpm format               # Prettier format all src files

# Unit Tests (Vitest)
pnpm test                 # Run in watch mode
pnpm test:run             # Single run (CI mode)
pnpm test:ui              # Vitest UI
pnpm test:coverage        # Coverage report

# Run single test file
pnpm test src/lib/parseCommand.test.ts

# Run tests matching pattern
npx vitest run -t "should parse delete command"

# E2E Tests (Playwright)
pnpm test:e2e             # Run all E2E tests
pnpm test:e2e:ui          # Playwright UI mode
pnpm test:e2e:headed      # Run with browser visible
```

## Project Structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── page.tsx          # Main home page
│   ├── settings/         # Settings page
│   ├── quick/            # Quick mode page
│   ├── auth/             # Auth pages (login, register, reset)
│   ├── profile/          # User profile
│   └── actions/          # Server Actions
├── components/
│   ├── ui/               # shadcn/ui primitives (DO NOT MODIFY)
│   └── *.tsx             # App components
├── lib/
│   ├── db.ts             # Dexie IndexedDB instance
│   ├── ai/               # AI service (parseCommand, prompts)
│   └── *.ts              # Utilities
├── stores/               # Zustand stores
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── test/                 # Test setup and mocks
e2e/                      # Playwright E2E tests
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - No `any`, no `@ts-ignore`
- ESLint rule: `@typescript-eslint/no-explicit-any: "error"`
- Use path alias: `@/*` maps to `./src/*`
- Define types in `@/types/index.ts` or `@/types/*.ts`

### Formatting (Prettier)

```json
{
  "semi": true,
  "singleQuote": false, // Use double quotes
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Imports

```typescript
// 1. React/Next.js imports
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import { create } from "zustand";

// 3. Internal imports with @/ alias
import { useTaskStore } from "@/stores/useTaskStore";
import { Button } from "@/components/ui/button";
import type { SyntropyTask } from "@/types";
import { cn } from "@/lib/utils";
```

### React Components

```typescript
"use client"; // Required for client components

import { useState } from "react";
import type { SyntropyTask } from "@/types";

interface TaskCardProps {
  task: SyntropyTask;
  onEdit?: (taskId: string) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  // Functional components only
  // Use named exports
}
```

### Zustand Stores

```typescript
// Naming: useXxxStore
export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,

  loadTasks: async (projectId?: string) => {
    set({ isLoading: true });
    // ...
  },
}));
```

### Comments & Documentation

- **JSDoc comments in Chinese** for public APIs
- Inline comments can be in Chinese or English

```typescript
/**
 * 生成任务 ID
 * 格式: SYN-YYYY-XXXX (年份 + 4位自增序号)
 */
export async function generateTaskId(): Promise<string> {
  // Implementation
}
```

### ID Formats

| Entity    | Format           | Example         |
| --------- | ---------------- | --------------- |
| Task      | `SYN-YYYY-XXXX`  | `SYN-2026-0001` |
| Project   | `PROJ-XXXX`      | `PROJ-0001`     |
| Device    | `DEV-xxxxxxxx`   | `DEV-a1b2c3d4`  |
| Operation | `OP-{ts}-{rand}` | `OP-lx5k2-3f9a` |

### Error Handling

```typescript
try {
  const result = await someAsyncOperation();
} catch (error) {
  // Always handle errors, never empty catch blocks
  console.error("操作失败:", error);
  set({
    error: error instanceof Error ? error.message : "未知错误",
  });
}
```

### UI Components

- Use **shadcn/ui** components from `@/components/ui/`
- Tailwind CSS for styling
- Use `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-classes"
)} />
```

## Testing Patterns

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from "vitest";
import { parseCommand } from "@/lib/ai";

describe("parseCommand", () => {
  it("should parse delete command with targetId", async () => {
    const result = await parseCommand("删除 修复登录页面", config, []);
    expect(result.action).toBe("DELETE");
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/凝序|Syntropy/i);
  });
});
```

## Key Technologies

| Layer     | Technology               |
| --------- | ------------------------ |
| Framework | Next.js 14 (App Router)  |
| UI        | Tailwind CSS + shadcn/ui |
| State     | Zustand                  |
| Storage   | IndexedDB (Dexie.js)     |
| Auth      | Supabase Auth            |
| AI        | OpenAI / DeepSeek (BYOK) |
| Testing   | Vitest + Playwright      |

## Important Patterns

1. **Local-first**: Data stored in IndexedDB, synced to cloud
2. **Soft delete**: Use `deletedAt` field, never hard delete
3. **Lamport clock**: For conflict resolution in sync
4. **5-second undo**: All operations can be undone within 5s
5. **PWA ready**: Offline support, installable

## Do Not

- Modify files in `@/components/ui/` (shadcn primitives)
- Use `any` type or `@ts-ignore`
- Hard delete data (use soft delete with `deletedAt`)
- Commit API keys or secrets
- Skip error handling in async operations
