"use client";

import { useState, useEffect } from "react";
import type { SyntropyTask, TaskStatus } from "@/types";
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

interface QuickTaskEditModalProps {
  task: SyntropyTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTask: SyntropyTask) => void;
}

/**
 * Quick Mode 临时任务编辑弹窗
 * 编辑临时任务的所有字段，保存时更新本地状态（不存 IndexedDB）
 */
export function QuickTaskEditModal({ task, open, onOpenChange, onSave }: QuickTaskEditModalProps) {
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [pic, setPic] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [remark, setRemark] = useState("");

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

  const handleSave = () => {
    if (!task || !content.trim()) return;

    const updatedTask: SyntropyTask = {
      ...task,
      content: content.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      completedDate: completedDate || undefined,
      pic: pic || undefined,
      status,
      remark: remark || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedTask);
    onOpenChange(false);
  };

  if (!task) return null;

  const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
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
            <label htmlFor="quick-content" className="text-sm font-medium">
              任务内容
            </label>
            <Input
              id="quick-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="任务内容"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label htmlFor="quick-status" className="text-sm font-medium">
              状态
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={status === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(option.value)}
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
            <label htmlFor="quick-pic" className="text-sm font-medium">
              负责人 (PIC)
            </label>
            <Input
              id="quick-pic"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              placeholder="负责人姓名"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="quick-startDate" className="text-sm font-medium">
                开始日期
              </label>
              <Input
                id="quick-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="quick-endDate" className="text-sm font-medium">
                截止日期
              </label>
              <Input
                id="quick-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="quick-completedDate" className="text-sm font-medium">
                完成日期
              </label>
              <Input
                id="quick-completedDate"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-2">
            <label htmlFor="quick-remark" className="text-sm font-medium">
              备注
            </label>
            <Textarea
              id="quick-remark"
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
          <Button onClick={handleSave} disabled={!content.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
