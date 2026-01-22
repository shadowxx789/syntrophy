"use client";

import { useCallback, useEffect, useState } from "react";
import { useTaskStore } from "@/stores/useTaskStore";
import { TaskCard } from "@/components/TaskCard";
import { SwipeableTaskCard } from "@/components/SwipeableTaskCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { TaskCardSkeleton } from "@/components/TaskCardSkeleton";
import { EmptyState } from "@/components/EmptyState";

interface TaskListProps {
  onEditTask?: (taskId: string) => void;
}

/**
 * 检测是否为触控设备
 */
function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia("(pointer: coarse)").matches
      );
    };
    checkTouch();
    // Re-check on resize (orientation change)
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, []);

  return isTouchDevice;
}

export function TaskList({ onEditTask }: TaskListProps) {
  const { tasks, isLoading, error, deleteTask, loadTasks } = useTaskStore();
  const isTouchDevice = useIsTouchDevice();

  const handleDelete = useCallback(
    async (taskId: string) => {
      await deleteTask(taskId);
    },
    [deleteTask]
  );

  const handleRefresh = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  if (isLoading) {
    return <TaskCardSkeleton count={3} />;
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
    return <EmptyState />;
  }

  // 分组：未完成 + 已完成
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const delayedTasks = tasks.filter((t) => t.status === "delayed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const activeTasks = [...pendingTasks, ...inProgressTasks, ...delayedTasks];

  // 根据设备类型渲染不同的卡片组件
  const renderTaskCard = (task: (typeof tasks)[0]) => {
    if (isTouchDevice) {
      return (
        <SwipeableTaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={handleDelete} />
      );
    }
    return <TaskCard key={task.id} task={task} onEdit={onEditTask} />;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!isTouchDevice}>
      <div className="space-y-4 p-4">
        {/* 未完成任务 */}
        {activeTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              进行中 ({activeTasks.length})
            </h3>
            <div className="space-y-3">{activeTasks.map(renderTaskCard)}</div>
          </div>
        )}

        {/* 已完成任务 */}
        {completedTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              已完成 ({completedTasks.length})
            </h3>
            <div className="space-y-3">{completedTasks.map(renderTaskCard)}</div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
