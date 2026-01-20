"use client";

import { useState, useEffect } from "react";
import type { UpdateTaskInput } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
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
  const [completedDate, setCompletedDate] = useState("");
  const [pic, setPic] = useState("");
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed" | "delayed">(
    "pending"
  );
  const [remark, setRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const task = tasks.find((t) => t.id === taskId);

  // 初始化表单
  useEffect(() => {
    if (task) {
      setContent(task.content);
      setStartDate(task.startDate || "");
      setEndDate(task.endDate || "");
      setCompletedDate(task.completedDate || "");
      setPic(task.pic || "");
      setStatus(task.status);
      setRemark(task.remark || "");
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
        completedDate: completedDate || undefined,
        pic: pic || undefined,
        status,
        remark: remark || undefined,
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

  const statusOptions = [
    { value: "pending", label: "○ 待开始", color: "text-gray-600" },
    { value: "in_progress", label: "◐ 进行中", color: "text-blue-600" },
    { value: "completed", label: "✓ 已完成", color: "text-green-600" },
    { value: "delayed", label: "⚠ 滞后", color: "text-red-600" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑任务</DialogTitle>
          <DialogDescription className="font-mono text-xs">{task.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              任务内容
            </label>
            <Input
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="任务内容"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              状态
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={status === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(option.value as typeof status)}
                  className={cn(
                    status === option.value &&
                      option.value === "completed" &&
                      "bg-green-500 hover:bg-green-600",
                    status === option.value &&
                      option.value === "delayed" &&
                      "bg-red-500 hover:bg-red-600",
                    status === option.value &&
                      option.value === "in_progress" &&
                      "bg-blue-500 hover:bg-blue-600"
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* PIC */}
          <div className="space-y-2">
            <label htmlFor="pic" className="text-sm font-medium">
              负责人 (PIC)
            </label>
            <Input
              id="pic"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              placeholder="负责人姓名"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                开始日期
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                截止日期
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="completedDate" className="text-sm font-medium">
                完成日期
              </label>
              <Input
                id="completedDate"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-2">
            <label htmlFor="remark" className="text-sm font-medium">
              备注
            </label>
            <Textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="备注信息"
              rows={3}
            />
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
