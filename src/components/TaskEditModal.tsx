"use client";

import { useState, useEffect } from "react";
import type { UpdateTaskInput, TaskPriority } from "@/types";
import { useTaskStore } from "@/stores/useTaskStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TaskEditModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditModal({ taskId, open, onOpenChange }: TaskEditModalProps) {
  const { tasks, updateTask } = useTaskStore();

  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [isDone, setIsDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const task = tasks.find((t) => t.id === taskId);

  // 初始化表单
  useEffect(() => {
    if (task) {
      setContent(task.content);
      setStartDate(task.startDate || "");
      setEndDate(task.endDate || "");
      setPriority(task.priority || "");
      setIsDone(task.status === "done");
    }
  }, [task]);

  const handleSave = async () => {
    if (!taskId || !content.trim()) return;

    setIsSaving(true);

    try {
      const updates: UpdateTaskInput = {
        content: content.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        priority: (priority as TaskPriority) || undefined,
        status: isDone ? "done" : "todo",
      };

      await updateTask(taskId, updates);
      onOpenChange(false);
    } catch (error) {
      console.error("更新任务失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑任务</DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">任务内容</label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="任务内容"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">开始日期</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">截止日期</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium">优先级</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(priority === p ? "" : p)}
                  className={cn(
                    priority === p &&
                      (p === "high"
                        ? "bg-red-500 hover:bg-red-600"
                        : p === "medium"
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-blue-500 hover:bg-blue-600")
                  )}
                >
                  {p === "high" ? "高" : p === "medium" ? "中" : "低"}
                </Button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="status"
              checked={isDone}
              onCheckedChange={(checked) => setIsDone(checked === true)}
            />
            <label htmlFor="status" className="text-sm">
              标记为已完成
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!content.trim() || isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
