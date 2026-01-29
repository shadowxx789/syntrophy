import { beforeEach, describe, expect, it, vi } from "vitest";

import { runAutoBackupOncePerSession } from "./autoBackup";

describe("runAutoBackupOncePerSession", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("runs backup only once per session per user", async () => {
    const backup = vi.fn(async () => undefined);

    await runAutoBackupOncePerSession({ userId: "user-123", backup });
    await runAutoBackupOncePerSession({ userId: "user-123", backup });

    expect(backup).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("syntropy_auto_backup_attempted:user-123")).not.toBeNull();
  });

  it("does not run when userId is missing", async () => {
    const backup = vi.fn(async () => undefined);

    await runAutoBackupOncePerSession({ userId: undefined, backup });
    await runAutoBackupOncePerSession({ userId: null, backup });

    expect(backup).not.toHaveBeenCalled();
  });
});
