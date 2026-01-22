"use client";

import { useEffect, useState } from "react";
import { registerSW, isPWAInstalled, isOnline } from "@/lib/registerSW";
import { setupOfflineSync } from "@/lib/offlineQueue";
import { OfflineIndicator } from "./OfflineIndicator";
import { InstallPrompt } from "./InstallPrompt";
import { SWUpdateToast } from "./SWUpdateToast";

/**
 * PWA Provider Component
 *
 * Handles:
 * - Service Worker registration
 * - Online/Offline detection
 * - PWA install state
 * - Update notifications
 */
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(true);

  useEffect(() => {
    // Initialize online status
    setIsOffline(!isOnline());

    // Register Service Worker
    registerSW({
      onUpdate: () => {
        console.log("[PWAProvider] Update available");
        setUpdateAvailable(true);
        // Don't auto-clear cache and skipWaiting - let user decide
      },
      onSuccess: () => {
        console.log("[PWAProvider] SW registered successfully");
      },
      onOnline: () => {
        setIsOffline(false);
      },
      onOffline: () => {
        setIsOffline(true);
      },
    });

    // Setup offline sync
    const cleanup = setupOfflineSync({
      onOnline: () => setIsOffline(false),
      onOffline: () => setIsOffline(true),
      onSyncComplete: (result) => {
        console.log("[PWAProvider] Sync complete:", result);
      },
    });

    // Log PWA install status
    if (isPWAInstalled()) {
      console.log("[PWAProvider] Running as installed PWA");
    }

    return cleanup;
  }, []);

  const handleDismissUpdate = () => {
    setShowUpdateToast(false);
    // Remember dismissal for this session
    // Update toast will show again after page refresh or SW update
  };

  // Expose context values via data attributes for components that need them
  return (
    <div data-offline={isOffline} data-update-available={updateAvailable} className="contents">
      {children}
      <OfflineIndicator />
      <InstallPrompt />
      <SWUpdateToast
        hasUpdate={updateAvailable && showUpdateToast}
        onDismiss={handleDismissUpdate}
      />
    </div>
  );
}
