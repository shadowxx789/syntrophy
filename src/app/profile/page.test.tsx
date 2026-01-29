import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { backupAllToCloud, fullRestore } from "@/lib/syncService";

import ProfilePage from "./page";

vi.mock("@/components/SyncIndicator", () => ({
  SyncIndicator: () => <div data-testid="sync-indicator" />,
}));

vi.mock("@/lib/db", () => ({
  db: {
    tasks: { clear: vi.fn() },
    projects: { clear: vi.fn() },
  },
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
});
