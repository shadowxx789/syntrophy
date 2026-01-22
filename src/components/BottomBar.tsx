"use client";

import { Download, Upload, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomBarProps {
  onExport: () => void;
  onImport: () => void;
  onEmail: () => void;
  onQuickMode: () => void;
}

/**
 * 移动端底部操作栏
 * 仅在移动端显示 (sm:hidden)，包含导出、导入、发送、闪电模式四个操作按钮
 */
export function BottomBar({ onExport, onImport, onEmail, onQuickMode }: BottomBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "flex justify-around border-t bg-background px-2 py-2",
        "safe-area-inset-bottom",
        "sm:hidden"
      )}
    >
      {/* 导出按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        aria-label="导出 Excel"
        className="flex h-14 w-16 touch-manipulation flex-col items-center gap-1"
      >
        <Download className="h-5 w-5" />
        <span className="text-[10px]">导出</span>
      </Button>

      {/* 导入按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onImport}
        aria-label="导入 Excel"
        className="flex h-14 w-16 touch-manipulation flex-col items-center gap-1"
      >
        <Upload className="h-5 w-5" />
        <span className="text-[10px]">导入</span>
      </Button>

      {/* 发送按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onEmail}
        aria-label="发送邮件"
        className="flex h-14 w-16 touch-manipulation flex-col items-center gap-1"
      >
        <Mail className="h-5 w-5" />
        <span className="text-[10px]">发送</span>
      </Button>

      {/* 闪电模式按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onQuickMode}
        aria-label="闪电快传模式"
        className={cn(
          "flex h-14 w-16 touch-manipulation flex-col items-center gap-1",
          "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        )}
      >
        <Zap className="h-5 w-5" />
        <span className="text-[10px]">闪电</span>
      </Button>
    </div>
  );
}
