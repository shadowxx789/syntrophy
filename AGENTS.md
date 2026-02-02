# AGENTS.md - Syntropy (凝序)

> PWA office system | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

This file is for agentic coding tools working in this repo. Keep changes small, match existing patterns, and favor correctness over refactors.

## Commands

Notes: `package-lock.json` exists and `playwright.config.ts` uses `npm run dev`, so examples use `npm`. Scripts are package-manager agnostic; `pnpm run <script>` usually works too.

```bash
# Install
npm install
# Dev / build
npm run dev
npm run build
npm run start
# Lint / format
npm run lint
npm run format
# Unit tests (Vitest)
npm run test                 # Watch mode
npm run test:run             # Single run (CI)
npm run test:ui              # Vitest UI
npm run test:coverage
# Single unit test
npm run test -- src/lib/parseCommand.test.ts
npm run test:run -- -t "should parse delete"
# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
# Single E2E spec / filter
npm run test:e2e -- e2e/app.spec.ts
npx playwright test e2e/app.spec.ts -g "should do something"
npx playwright test --project=chromium
```

## Project Structure

```
src/
├── app/                   # Next.js App Router routes
├── components/
│   ├── ui/                 # shadcn/ui primitives (DO NOT MODIFY)
│   └── *.tsx               # App components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, services, db.ts
├── stores/                 # Zustand stores (useXxxStore.ts)
├── test/                   # Vitest setup + mocks
└── types/                  # Shared TypeScript types
e2e/                        # Playwright E2E tests
docs/                       # Specs (sync/security)
```

## Tooling & Config

- TypeScript: strict mode, path alias `@/*` (see `tsconfig.json`)
- ESLint: `next/core-web-vitals`, `next/typescript` (see `.eslintrc.json`)
  - `@typescript-eslint/no-explicit-any`: error
  - `@typescript-eslint/no-unused-vars`: warn, allow `_` prefix
  - `prefer-const`: warn
- Prettier: semicolons, double quotes, 2 spaces, `printWidth: 100` (see `.prettierrc`)
  - `trailingComma: "es5"`, `prettier-plugin-tailwindcss`
- Vitest: jsdom + `src/test/setup.ts` + `@` alias + Next.js module mocks (see `vitest.config.ts`)
- Playwright: baseURL `http://localhost:3000`, dev server via `npm run dev` (see `playwright.config.ts`)
- Env: copy `.env.example` to `.env.local` before running
- shadcn/ui: `components.json` uses `style: new-york`, `baseColor: neutral`, `cssVariables: true`

Cursor / Copilot rules: none found in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`.

## Code Style

- Formatting: run `npm run format` after edits; do not hand-format Tailwind class order; use double quotes + semicolons.
- Import order (preferred):

```ts
// 1) React/Next
import { useState } from "react";
import { useRouter } from "next/navigation";
// 2) External libraries
import { create } from "zustand";
// 3) Internal (@/ alias)
import { useTaskStore } from "@/stores/useTaskStore";
import { Button } from "@/components/ui/button";
import type { SyntropyTask } from "@/types";
import { cn } from "@/lib/utils";
```

TypeScript:

- Strict types only: no `any`, no `@ts-ignore`, no `@ts-expect-error`.
- Prefer `unknown` + narrowing to handle dynamic data.
- Prefer `import type { ... }` for types.
- Shared domain types live in `src/types/`.

React / Next.js (App Router):

- Default to Server Components; add `"use client";` only when needed.
- Keep client boundaries small (push stateful UI down into client components).
- Use named exports for components (`export function Foo() {}`) unless Next requires default exports.

Naming:

- Components: `PascalCase.tsx` (e.g., `src/components/TaskCard.tsx`)
- Hooks: `useXxx.ts` (e.g., `src/hooks/useUndo.ts`)
- Zustand stores: `useXxxStore.ts`, export `useXxxStore`
- Utilities: `camelCase.ts` in `src/lib/`

State management (Zustand):

- Keep async flows explicit with `isLoading` and `error`.
- Prefer store actions returning `Promise<...>` for async operations.

Error handling:

```ts
try {
  await someAsyncOperation();
} catch (error) {
  console.error("操作失败:", error);
  set({ error: error instanceof Error ? error.message : "未知错误" });
}
```

## Testing Notes

- Unit tests: `src/**/*.{test,spec}.{ts,tsx}` (Vitest)
- Test setup/mocks: `src/test/setup.ts`, plus Next mocks in `src/test/mocks/`
- E2E: `e2e/` (Playwright). `playwright.config.ts` uses `forbidOnly: !!CI`.

## Domain Rules (Do Not Break)

1. Local-first: IndexedDB (Dexie.js), sync later
2. Soft delete: use `deletedAt`, never hard delete
3. Conflict resolution: Lamport clock / `version`
4. 5-second undo: all operations reversible

## ID Formats

| Entity  | Format          | Example         |
| ------- | --------------- | --------------- |
| Task    | `SYN-YYYY-XXXX` | `SYN-2026-0001` |
| Project | `PROJ-XXXX`     | `PROJ-0001`     |
| Device  | `DEV-xxxxxxxx`  | `DEV-a1b2c3d4`  |

## Do Not

- Modify `src/components/ui/*` (shadcn/ui primitives)
- Use `any`, `@ts-ignore`, or `@ts-expect-error`
- Hard delete data (use `deletedAt`)
- Commit API keys or secrets
- Leave empty catch blocks
