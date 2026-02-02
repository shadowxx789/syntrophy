"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { SyntropyTask } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickTaskCardProps {
  task: SyntropyTask;
  index: number;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

/**
 * Quick Mode 临时任务卡片组件
 * 显示任务信息，支持编辑和删除
 */
export function QuickTaskCard({ task, index, onEdit, onDelete }: QuickTaskCardProps) {
  const statusDisplay: Record<string, { label: string; color: string }> = {
    pending: { label: "○ 待开始", color: "text-gray-500" },
    in_progress: { label: "◐ 进行中", color: "text-blue-500" },
    completed: { label: "✓ 已完成", color: "text-green-500" },
    delayed: { label: "⚠ 滞后", color: "text-red-500" },
  };

  const status = statusDisplay[task.status] || statusDisplay.pending;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50",
        task.status === "completed" && "opacity-60"
      )}
    >
      {/* 序号 */}
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {index + 1}
      </div>

      {/* 任务内容 */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "font-medium",
            task.status === "completed" && "text-muted-foreground line-through"
          )}
        >
          {task.content}
        </div>

        {/* 任务元数据 */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={status.color}>{status.label}</span>

          {task.pic && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/60">PIC:</span>
              {task.pic}
            </span>
          )}

          {task.startDate && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/60">开始:</span>
              {task.startDate}
            </span>
          )}

          {task.endDate && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/60">截止:</span>
              {task.endDate}
            </span>
          )}

          {task.completedDate && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/60">完成:</span>
              {task.completedDate}
            </span>
          )}

          {task.remark && (
            <span className="flex max-w-[200px] items-center gap-1 truncate">
              <span className="text-muted-foreground/60">备注:</span>
              {task.remark}
            </span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(task.id)}
          aria-label="编辑任务"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
          aria-label="删除任务"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
