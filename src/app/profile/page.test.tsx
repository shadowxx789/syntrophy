import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { backupAllToCloud, fullRestore } from "@/lib/syncService";

import ProfilePage from "./page";

vi.mock("@/components/SyncIndicator", () => ({
  SyncIndicator: () => <div data-testid="sync-indicator" />,
}));

const mockDb = vi.hoisted(() => ({
  tasks: {
    clear: vi.fn(async () => undefined),
    toArray: vi.fn(async () => [] as unknown[]),
    bulkPut: vi.fn(async (_items: unknown[]) => undefined),
  },
  projects: {
    clear: vi.fn(async () => undefined),
    toArray: vi.fn(async () => [] as unknown[]),
    bulkPut: vi.fn(async (_items: unknown[]) => undefined),
  },
  transaction: vi.fn(async (_mode: "rw", _tables: unknown[], callback: () => Promise<void>) => {
    await callback();
  }),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
  DEFAULT_PROJECT_ID: "PROJ-0001",
}));

vi.mock("@/lib/syncService", () => ({
  performSync: vi.fn(),
  backupToCloud: vi.fn(),
  backupAllToCloud: vi.fn(),
  fullRestore: vi.fn(),
  getSyncStatus: vi.fn(() => ({
    state: "idle",
    lastSyncAt: null,
    pendingChanges: 0,
    isOnline: true,
  })),
}));

vi.mock("@/stores/useAuthStore", () => {
  const user: User = {
    id: "user-123",
    app_metadata: {},
    user_metadata: { display_name: "Test User" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "test@example.com",
  } as unknown as User;

  return {
    useAuthStore: () => ({
      user,
      signOut: vi.fn(),
      isLoading: false,
    }),
  };
});

describe("ProfilePage", () => {
  it("triggers a cloud backup when user clicks backup", async () => {
    const user = userEvent.setup();

    vi.mocked(backupAllToCloud).mockResolvedValue({
      success: true,
      uploaded: { tasks: 1, projects: 2 },
      errors: [],
    });

    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "立即备份" }));

    expect(backupAllToCloud).toHaveBeenCalledWith("user-123");
    expect(screen.getByText(/备份完成/)).toBeInTheDocument();
  });

  it("requires confirmation before restoring cloud data", async () => {
    const user = userEvent.setup();

    vi.mocked(fullRestore).mockResolvedValue({
      success: true,
      tasks: 0,
      projects: 0,
    });

    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "恢复数据" }));
    expect(fullRestore).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "确认恢复" }));

    expect(fullRestore).toHaveBeenCalledWith("user-123");
  });

  it("soft-deletes local data instead of hard clearing tables", async () => {
    const user = userEvent.setup();

    mockDb.tasks.toArray.mockResolvedValue([
      {
        id: "SYN-2026-0001",
        projectId: "PROJ-0001",
        content: "Task",
        status: "pending",
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdBy: "DEV-11111111",
        updatedBy: "DEV-11111111",
      },
    ] as unknown[]);
    mockDb.projects.toArray.mockResolvedValue([
      {
        id: "PROJ-0001",
        name: "Default",
        displayOrder: 0,
        isArchived: false,
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdBy: "DEV-11111111",
        updatedBy: "DEV-11111111",
      },
    ] as unknown[]);

    render(<ProfilePage />);

    await user.click(screen.getByRole("button", { name: "清除本地数据" }));
    await user.click(screen.getByRole("button", { name: "确认清除" }));

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockDb.tasks.clear).not.toHaveBeenCalled();
    expect(mockDb.projects.clear).not.toHaveBeenCalled();
    expect(mockDb.tasks.bulkPut).toHaveBeenCalledTimes(1);
    expect(mockDb.projects.bulkPut).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/本地数据已清除/)).toBeInTheDocument();
  });
});
