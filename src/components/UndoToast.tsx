"use client";

import { useEffect, useState } from "react";
import { Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UndoToastProps {
  /** 操作描述 */
  message: string;

  /** 撤销回调 */
  onUndo: () => void;

  /** 关闭回调 */
  onClose: () => void;

  /** 倒计时秒数 */
  duration?: number;

  /** 是否可见 */
  visible: boolean;
}

export function UndoToast({
  message,
  onUndo,
  onClose,
  duration = 5,
  visible,
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(100);

  // 重置倒计时
  useEffect(() => {
    if (visible) {
      setTimeLeft(duration);
      setProgress(100);
    }
  }, [visible, duration]);

  // 倒计时
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 0.1;
      });

      setProgress((prev) => Math.max(0, prev - 100 / (duration * 10)));
    }, 100);

    return () => clearInterval(interval);
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 z-50 -translate-x-1/2",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="relative overflow-hidden rounded-lg border bg-background shadow-lg">
        {/* 进度条 */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* 消息 */}
          <span className="text-sm">{message}</span>

          {/* 倒计时 */}
          <span className="min-w-[24px] text-center text-sm font-medium text-muted-foreground">
            {Math.ceil(timeLeft)}s
          </span>

          {/* 撤销按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onUndo();
              onClose();
            }}
            className="gap-1 text-primary hover:text-primary"
          >
            <Undo2 className="h-4 w-4" />
            撤销
          </Button>

          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
