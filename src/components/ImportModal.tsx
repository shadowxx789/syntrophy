"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiffPreview } from "@/components/DiffPreview";
import { parseExcelFile, type ImportParseResult } from "@/lib/importExcel";
import { diffTasks, getDiffSummary, hasDiffChanges } from "@/lib/diffEngine";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { DiffResult } from "@/types";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { tasks, createTask, updateTask, deleteTask, loadTasks } = useTaskStore();
  const { currentProjectId } = useProjectStore();

  // 重置状态
  const resetState = () => {
    setStep("upload");
    setParseResult(null);
    setDiffResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // 解析 Excel
      const result = await parseExcelFile(file);
      setParseResult(result);

      if (result.errors.length > 0 && result.tasks.length === 0) {
        setError(`解析失败: ${result.errors[0].message}`);
        return;
      }

      // 生成差异
      const diff = diffTasks(result.tasks, tasks);
      setDiffResult(diff);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件解析失败");
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!diffResult) return;

    setStep("importing");

    try {
      // 处理新增
      for (const task of diffResult.added) {
        await createTask({
          content: task.content,
          projectId: currentProjectId,
          startDate: task.startDate,
          endDate: task.endDate,
          priority: task.priority,
        });
      }

      // 处理修改
      for (const diff of diffResult.modified) {
        await updateTask(diff.id, {
          content: diff.after.content,
          status: diff.after.status,
          priority: diff.after.priority,
          startDate: diff.after.startDate,
          endDate: diff.after.endDate,
        });
      }

      // 处理删除
      for (const task of diffResult.deleted) {
        await deleteTask(task.id);
      }

      // 重新加载任务
      await loadTasks(currentProjectId);

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
      setStep("preview");
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "导入 Excel"}
            {step === "preview" && "预览变更"}
            {step === "importing" && "导入中..."}
            {step === "done" && "导入完成"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "选择要导入的 Excel 文件"}
            {step === "preview" && diffResult && getDiffSummary(diffResult)}
            {step === "done" && "所有变更已成功应用"}
          </DialogDescription>
        </DialogHeader>

        {/* 上传步骤 */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">点击选择文件</p>
              <p className="mt-1 text-xs text-muted-foreground">
                支持 .xlsx, .xls 格式
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium">Excel 格式要求：</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                <li>• 第一行为表头（ID、内容、状态、优先级、截止日期）</li>
                <li>• ID 列可选，用于识别现有任务</li>
                <li>• 如果 ID 匹配则更新，否则新增</li>
              </ul>
            </div>
          </div>
        )}

        {/* 预览步骤 */}
        {step === "preview" && diffResult && (
          <div className="space-y-4 py-4">
            {/* 解析警告 */}
            {parseResult && parseResult.errors.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  部分行解析失败：
                </p>
                <ul className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                  {parseResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>
                      第 {err.row} 行: {err.message}
                    </li>
                  ))}
                  {parseResult.errors.length > 3 && (
                    <li>...及其他 {parseResult.errors.length - 3} 个错误</li>
                  )}
                </ul>
              </div>
            )}

            {/* 差异预览 */}
            <DiffPreview diff={diffResult} />

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* 导入中 */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">正在应用变更...</p>
          </div>
        )}

        {/* 完成 */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-10 w-10 text-green-500" />
            <p className="mt-4 font-medium">导入成功！</p>
            {diffResult && (
              <p className="mt-1 text-sm text-muted-foreground">
                {getDiffSummary(diffResult)}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                重新选择
              </Button>
              <Button
                onClick={handleImport}
                disabled={!diffResult || !hasDiffChanges(diffResult)}
              >
                确认导入
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={handleClose}>完成</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
