"use client";

import { Calendar, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
import type { SyntropyTask } from "@/types";
import { useTaskStore } from "@/stores/useTaskStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: SyntropyTask;
  onEdit?: (taskId: string) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const { toggleTaskStatus, deleteTask } = useTaskStore();

  const isCompleted = task.status === "completed";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = () => {
    if (!task.endDate || isCompleted || task.status === "delayed") return false;
    const endDate = new Date(task.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  const getStatusBadge = () => {
    const statusMap = {
      pending: "○ 待开始",
      in_progress: "◐ 进行中",
      completed: "✓ 已完成",
      delayed: "⚠ 滞后",
    };
    return statusMap[task.status] || "";
  };

  const getStatusClass = () => {
    const statusClasses = {
      pending: "bg-gray-100 text-gray-600",
      in_progress: "bg-blue-100 text-blue-600",
      completed: "bg-green-100 text-green-600",
      delayed: "bg-red-100 text-red-600",
    };
    return statusClasses[task.status] || "";
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md",
        // Mobile touch optimization: larger touch target
        "min-h-[56px] touch-manipulation",
        isCompleted && "opacity-60",
        task.status === "delayed" && "border-l-4 border-l-red-500"
      )}
    >
      {/* Checkbox - larger touch target on mobile */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => toggleTaskStatus(task.id)}
        className="mt-0.5 h-5 w-5 sm:h-4 sm:w-4"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header: ID + Status Badge */}
        <div className="mb-1.5 flex items-center gap-2">
          <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", getStatusClass())}>
            {getStatusBadge()}
          </span>
        </div>

        {/* Task Content */}
        <p className={cn("mb-1 text-sm leading-relaxed", isCompleted && "line-through")}>
          {task.content}
        </p>

        {/* PIC */}
        {task.pic && (
          <div className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{task.pic}</span>
          </div>
        )}

        {/* Date Info */}
        {(task.startDate || task.endDate) && (
          <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {task.startDate && <span>{formatDate(task.startDate)}</span>}
            {task.startDate && task.endDate && <span>→</span>}
            {task.endDate && (
              <span className={cn(isOverdue() && "font-medium text-destructive")}>
                {formatDate(task.endDate)}
                {isOverdue() && " (已逾期)"}
              </span>
            )}
            {task.completedDate && task.status === "completed" && (
              <span className="text-green-600">✓ {formatDate(task.completedDate)} 完成</span>
            )}
          </div>
        )}

        {/* Remark */}
        {task.remark && (
          <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">{task.remark}</div>
        )}
      </div>

      {/* Actions Menu - always visible on mobile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 touch-manipulation transition-opacity sm:h-8 sm:w-8",
              // Always visible on mobile (no hover), fade on desktop
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            )}
          >
            <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(task.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            编辑
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => deleteTask(task.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
