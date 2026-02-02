"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPWAInstalled } from "@/lib/registerSW";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Delay before showing install prompt (10 seconds for better UX)
const INSTALL_PROMPT_DELAY = 10000;
// iOS prompt delay (20 seconds - slightly longer for Safari users)
const IOS_PROMPT_DELAY = 20000;
// Days to wait before showing prompt again after dismissal
const DISMISS_COOLDOWN_DAYS = 7;

/**
 * InstallPrompt Component
 *
 * Shows a prompt to install the PWA on supported browsers.
 * Handles both desktop and mobile install flows with improved iOS experience.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
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

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_COOLDOWN_DAYS) {
        return;
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after shorter delay (10s instead of 30s)
      setTimeout(() => {
        setIsVisible(true);
      }, INSTALL_PROMPT_DELAY);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Show iOS guide after shorter delay (20s instead of 60s)
    if (isIOSDevice) {
      setTimeout(() => {
        setIsVisible(true);
      }, IOS_PROMPT_DELAY);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

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
          "duration-300 animate-in fade-in slide-in-from-bottom-4",
          // Safe area for mobile bottom bar
          "pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4"
        )}
      >
        <div className="rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polygon points="12 2 19 21 12 17 5 21 12 2" />
              </svg>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">安装凝序</h3>
              <p className="mt-1 text-sm text-muted-foreground">添加到主屏幕，享受原生应用体验</p>

              {/* Buttons */}
              <div className="mt-3 flex gap-2">
                {isIOS ? (
                  <Button size="sm" onClick={handleShowIOSGuide} className="gap-1.5">
                    <Share className="h-4 w-4" />
                    安装方法
                  </Button>
                ) : deferredPrompt ? (
                  <Button size="sm" onClick={handleInstall} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    安装
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  稍后
                </Button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="关闭安装提示"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowIOSGuide(false)} />

          {/* Modal */}
          <div
            className={cn(
              "relative w-full max-w-md rounded-t-xl bg-card p-6 shadow-xl sm:rounded-xl",
              "animate-in slide-in-from-bottom-4",
              "pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
            )}
          >
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
              aria-label="关闭安装指南"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            <h3 className="text-lg font-semibold">在 iOS 上安装</h3>
            <p className="mt-2 text-sm text-muted-foreground">按照以下步骤将凝序添加到主屏幕：</p>

            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  1
                </span>
                <div className="flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    点击分享按钮
                    <Share className="h-4 w-4 text-muted-foreground" />
                  </p>
                  <p className="text-sm text-muted-foreground">Safari 底部的方形带箭头图标</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  2
                </span>
                <div className="flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    选择「添加到主屏幕」
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </p>
                  <p className="text-sm text-muted-foreground">可能需要向下滚动菜单查找</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-medium">点击「添加」</p>
                  <p className="text-sm text-muted-foreground">应用图标将出现在主屏幕上</p>
                </div>
              </li>
            </ol>

            <Button className="mt-6 w-full" onClick={() => setShowIOSGuide(false)}>
              我知道了
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
