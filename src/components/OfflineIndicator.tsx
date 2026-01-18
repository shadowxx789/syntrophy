"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * OfflineIndicator Component
 *
 * Shows a toast-like notification when the app goes offline,
 * and shows a success message when back online.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineToast(true);
      // Hide online toast after 3 seconds
      setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineToast(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showOnlineToast) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center sm:left-auto sm:right-4 sm:w-auto">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300",
          isOffline
            ? "bg-amber-500 text-white"
            : "bg-green-500 text-white animate-in fade-in slide-in-from-bottom-4"
        )}
      >
        {isOffline ? (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span>Offline Mode - Changes will sync when connected</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Back online!</span>
          </>
        )}
      </div>
    </div>
  );
}
