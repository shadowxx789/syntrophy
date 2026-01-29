"use client";

import { useEffect } from "react";

import { runAutoBackupOncePerSession } from "@/lib/autoBackup";
import { backupToCloud } from "@/lib/syncService";
import { useAuthStore } from "@/stores/useAuthStore";

export function AuthBootstrap() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initialize = useAuthStore((state) => state.initialize);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (!userId) return;

    void runAutoBackupOncePerSession({
      userId,
      backup: () => backupToCloud(userId),
    });
  }, [userId]);

  return null;
}
