"use client";

import { useState, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import type { SyntropyTask } from "@/types";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SwipeableTaskCardProps {
  task: SyntropyTask;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

const SWIPE_THRESHOLD = 80;
const DELETE_BUTTON_WIDTH = 80;

/**
 * 可滑动删除的任务卡片
 * 在移动端支持左滑显示删除按钮
 */
export function SwipeableTaskCard({ task, onEdit, onDelete }: SwipeableTaskCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwiping) return;

      currentXRef.current = e.touches[0].clientX;
      const diff = startXRef.current - currentXRef.current;

      // 只允许向左滑动（正值）
      if (diff > 0) {
        // 限制最大滑动距离
        const newOffset = Math.min(diff, DELETE_BUTTON_WIDTH + 20);
        setOffsetX(-newOffset);
      } else if (!isRevealed) {
        // 向右滑动时回弹
        setOffsetX(Math.max(diff, 0));
      } else {
        // 已经展开状态下向右滑动关闭
        const newOffset = Math.max(-DELETE_BUTTON_WIDTH + diff, -DELETE_BUTTON_WIDTH);
        setOffsetX(newOffset);
      }
    },
    [isSwiping, isRevealed]
  );

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    const diff = startXRef.current - currentXRef.current;

    if (diff > SWIPE_THRESHOLD && !isRevealed) {
      // 滑动超过阈值，展开删除按钮
      setOffsetX(-DELETE_BUTTON_WIDTH);
      setIsRevealed(true);
      // 触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } else if (diff < -SWIPE_THRESHOLD / 2 && isRevealed) {
      // 向右滑动关闭
      setOffsetX(0);
      setIsRevealed(false);
    } else {
      // 回弹到当前状态
      setOffsetX(isRevealed ? -DELETE_BUTTON_WIDTH : 0);
    }
  }, [isRevealed]);

  const handleDelete = useCallback(() => {
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
    onDelete?.(task.id);
    // 重置状态
    setOffsetX(0);
    setIsRevealed(false);
  }, [onDelete, task.id]);

  const handleCardClick = useCallback(() => {
    // 如果已展开，点击卡片关闭
    if (isRevealed) {
      setOffsetX(0);
      setIsRevealed(false);
    }
  }, [isRevealed]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* 删除按钮（背景层） */}
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full items-center justify-center",
          "bg-destructive text-destructive-foreground",
          "transition-opacity duration-200"
        )}
        style={{ width: DELETE_BUTTON_WIDTH }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          aria-label="删除任务"
          className="h-full w-full text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
        >
          <Trash2 className="h-6 w-6" />
        </Button>
      </div>

      {/* 可滑动的卡片层 */}
      <div
        className={cn(
          "relative bg-background",
          isSwiping ? "" : "transition-transform duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${offsetX}px)`,
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        <TaskCard task={task} onEdit={onEdit} />
      </div>
    </div>
  );
}
