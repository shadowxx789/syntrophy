"use client";

import { useState, useEffect, useCallback } from "react";
import type { SyntropyTask } from "@/types";
import type { TaskMatchCandidate, TaskMatchReason } from "@/lib/ai/parseCommand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: TaskMatchCandidate[];
  action: "UPDATE" | "DELETE";
  onSelect: (task: SyntropyTask) => void;
  onCancel: () => void;
}

const reasonLabels: Record<TaskMatchReason, string> = {
  id: "ID匹配",
  exact: "完全匹配",
  contains: "内容匹配",
  ordinal: "序号匹配",
};

export function TaskSelectionDialog({
  open,
  onOpenChange,
  candidates,
  action,
  onSelect,
  onCancel,
}: TaskSelectionDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || candidates.length === 0) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(candidates.length - 1, i + 1));
          break;
        case "Enter":
          e.preventDefault();
          onSelect(candidates[selectedIndex].task);
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
      }
    },
    [open, candidates, selectedIndex, onSelect, onCancel]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const actionText = action === "DELETE" ? "删除" : "修改";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择要{actionText}的任务</DialogTitle>
          <DialogDescription>
            匹配到 {candidates.length} 个相似任务，请选择目标任务
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {candidates.map((candidate, index) => (
            <button
              key={candidate.task.id}
              type="button"
              onClick={() => onSelect(candidate.task)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "flex min-h-[56px] w-full touch-manipulation flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                selectedIndex === index
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {/* Task content */}
              <span className="line-clamp-2 font-medium leading-tight">
                {selectedIndex === index && <span className="mr-1 text-primary">▶</span>}
                {candidate.task.content}
              </span>

              {/* Task metadata */}
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{candidate.task.id}</span>
                <span>·</span>
                <span>{Math.round(candidate.score * 100)}%</span>
                <span>·</span>
                <span>{reasonLabels[candidate.reason]}</span>
              </span>
            </button>
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <span className="hidden text-xs text-muted-foreground sm:block">
            ↑↓ 选择 · Enter 确认 · Esc 取消
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button
              onClick={() => onSelect(candidates[selectedIndex].task)}
              disabled={candidates.length === 0}
            >
              确认选择
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
