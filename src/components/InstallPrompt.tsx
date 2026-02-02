"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPWAInstalled } from "@/lib/registerSW";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * InstallPrompt Component
 *
 * Shows a prompt to install the PWA on supported browsers.
 * Handles both desktop and mobile install flows.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isPWAInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed =
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 30 seconds on page
      setTimeout(() => {
        setIsVisible(true);
      }, 30000);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Show iOS guide after delay if on iOS
    if (isIOSDevice) {
      setTimeout(() => {
        setIsVisible(true);
      }, 60000); // Show after 1 minute on iOS
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setIsVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  const handleShowIOSGuide = () => {
    setShowIOSGuide(true);
  };

  if (isInstalled || !isVisible) return null;

  return (
    <>
      {/* Install Banner */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm",
          "animate-in slide-in-from-bottom-4 fade-in duration-300"
        )}
      >
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-lg">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Install Syntropy</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add to your home screen for the best experience
              </p>

              {/* Buttons */}
              <div className="mt-3 flex gap-2">
                {isIOS ? (
                  <Button size="sm" onClick={handleShowIOSGuide}>
                    How to Install
                  </Button>
                ) : deferredPrompt ? (
                  <Button size="sm" onClick={handleInstall}>
                    Install
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Not now
                </Button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 hover:bg-muted"
            >
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowIOSGuide(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-t-xl sm:rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl animate-in slide-in-from-bottom-4">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
            >
              <svg
                className="h-5 w-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h3 className="text-lg font-semibold">Install on iOS</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Follow these steps to add Syntropy to your home screen:
            </p>

            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">
                  1
                </span>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    Look for the square with an arrow pointing up at the bottom
                    of Safari
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">
                  2
                </span>
                <div>
                  <p className="font-medium">Scroll and tap Add to Home Screen</p>
                  <p className="text-sm text-muted-foreground">
                    You may need to scroll down in the share menu
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">
                  3
                </span>
                <div>
                  <p className="font-medium">Tap Add</p>
                  <p className="text-sm text-muted-foreground">
                    The app will appear on your home screen
                  </p>
                </div>
              </li>
            </ol>

            <Button
              className="mt-6 w-full"
              onClick={() => setShowIOSGuide(false)}
            >
              Got it!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
