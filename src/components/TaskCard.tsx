"use client";

import { Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

  const isDone = task.status === "done";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = () => {
    if (!task.endDate || isDone) return false;
    const endDate = new Date(task.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  const priorityColors = {
    high: "border-l-red-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md",
        // Mobile touch optimization: larger touch target
        "min-h-[56px] touch-manipulation",
        task.priority && `border-l-4 ${priorityColors[task.priority]}`,
        isDone && "opacity-60"
      )}
    >
      {/* Checkbox - larger touch target on mobile */}
      <Checkbox
        checked={isDone}
        onCheckedChange={() => toggleTaskStatus(task.id)}
        className="mt-0.5 h-5 w-5 sm:h-4 sm:w-4"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Task ID */}
        <p className="mb-0.5 font-mono text-xs text-muted-foreground">{task.id}</p>

        {/* Task Content */}
        <p className={cn("text-sm leading-relaxed", isDone && "line-through")}>
          {task.content}
        </p>

        {/* Date Info */}
        {(task.startDate || task.endDate) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {task.startDate && <span>{formatDate(task.startDate)}</span>}
            {task.startDate && task.endDate && <span>→</span>}
            {task.endDate && (
              <span className={cn(isOverdue() && "font-medium text-destructive")}>
                {formatDate(task.endDate)}
                {isOverdue() && " (已逾期)"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions Menu - always visible on mobile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 sm:h-8 sm:w-8 transition-opacity touch-manipulation",
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
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
