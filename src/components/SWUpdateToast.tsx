"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { skipWaiting } from "@/lib/registerSW";

interface SWUpdateToastProps {
  /** 是否有新版本可用 */
  hasUpdate: boolean;
  /** 关闭回调 */
  onDismiss?: () => void;
}

/**
 * Service Worker 更新通知组件
 * 当检测到新版本时显示更新提示
 */
export function SWUpdateToast({ hasUpdate, onDismiss }: SWUpdateToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (hasUpdate) {
      // 延迟显示，避免打断用户操作
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [hasUpdate]);

  const handleUpdate = useCallback(() => {
    setIsUpdating(true);
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    // 触发 SW 更新
    skipWaiting();
    // 页面会自动刷新（registerSW 中的 controllerchange 事件）
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed left-4 right-4 top-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm",
        "duration-300 animate-in fade-in slide-in-from-top-4"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className={cn("h-5 w-5 text-primary", isUpdating && "animate-spin")} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">发现新版本</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              凝序有更新可用，刷新即可使用新功能
            </p>

            {/* Buttons */}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleUpdate} disabled={isUpdating} className="gap-1.5">
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    立即更新
                  </>
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={isUpdating}>
                稍后
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 hover:bg-muted"
            aria-label="关闭更新提示"
            disabled={isUpdating}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
