export interface AutoBackupResult {
  attempted: boolean;
  reason?: "server" | "no_user" | "already_attempted" | "no_storage";
}

export async function runAutoBackupOncePerSession(params: {
  userId: string | null | undefined;
  backup: () => Promise<unknown>;
}): Promise<AutoBackupResult> {
  const { userId, backup } = params;

  if (typeof window === "undefined") {
    return { attempted: false, reason: "server" };
  }

  if (!userId) {
    return { attempted: false, reason: "no_user" };
  }

  const storage = window.sessionStorage;
  if (!storage) {
    return { attempted: false, reason: "no_storage" };
  }

  const key = `syntropy_auto_backup_attempted:${userId}`;

  try {
    if (storage.getItem(key)) {
      return { attempted: false, reason: "already_attempted" };
    }

    // Important: set the flag before awaiting the backup to avoid duplicate attempts
    // in React Strict Mode / rapid re-renders.
    storage.setItem(key, new Date().toISOString());
  } catch (error) {
    console.warn("[AutoBackup] Failed to access sessionStorage:", error);
    return { attempted: false, reason: "no_storage" };
  }

  try {
    await backup();
  } catch (error) {
    console.warn("[AutoBackup] Auto backup failed:", error);
  }

  return { attempted: true };
}
