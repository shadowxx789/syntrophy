"use client";

import { useTaskStore } from "@/stores/useTaskStore";
import { TaskCard } from "@/components/TaskCard";
import { Loader2 } from "lucide-react";

interface TaskListProps {
  onEditTask?: (taskId: string) => void;
}

export function TaskList({ onEditTask }: TaskListProps) {
  const { tasks, isLoading, error } = useTaskStore();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-destructive">
        <p className="text-lg font-medium">加载失败</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <p className="text-lg">暂无任务</p>
        <p className="mt-1 text-sm">在下方输入框添加新任务</p>
      </div>
    );
  }

  // 分组：未完成 + 已完成
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const delayedTasks = tasks.filter((t) => t.status === "delayed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const activeTasks = [...pendingTasks, ...inProgressTasks, ...delayedTasks];

  return (
    <div className="space-y-4 p-4">
      {/* 未完成任务 */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            进行中 ({activeTasks.length})
          </h3>
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEditTask} />
            ))}
          </div>
        </div>
      )}

      {/* 已完成任务 */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            已完成 ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEditTask} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
