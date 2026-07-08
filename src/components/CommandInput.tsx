"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseCommand, findTaskCandidates, getProviderDisplayName } from "@/lib/ai";
import type { TaskMatchCandidate } from "@/lib/ai/parseCommand";
import { decryptApiKey } from "@/lib/crypto";
import type { ParsedCommand, SyntropyTask, UpdateTaskInput } from "@/types";
import { TaskSelectionDialog } from "./TaskSelectionDialog";

interface CommandInputProps {
  onTaskCreated?: (task: SyntropyTask, beforeSnapshot?: SyntropyTask) => void;
  onTaskUpdated?: (task: SyntropyTask, beforeSnapshot: SyntropyTask) => void;
  onTaskDeleted?: (task: SyntropyTask) => void;
}

interface SelectionDialogState {
  open: boolean;
  candidates: TaskMatchCandidate[];
  action: "UPDATE" | "DELETE";
  pendingCommand: ParsedCommand;
}

export function CommandInput({ onTaskCreated, onTaskUpdated, onTaskDeleted }: CommandInputProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastParsed, setLastParsed] = useState<ParsedCommand | null>(null);
  const [selectionDialog, setSelectionDialog] = useState<SelectionDialogState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tasks, createTask, updateTask, deleteTask } = useTaskStore();
  const { currentProjectId } = useProjectStore();
  const {
    aiProvider,
    encryptedApiKey,
    customAIConfig,
    customPrompts,
    geminiModel,
    getSelectedCustomProvider,
  } = useSettingsStore();

  const selectedCustomProvider = aiProvider === "custom" ? getSelectedCustomProvider() : undefined;
  const effectiveEncryptedApiKey =
    aiProvider === "custom" ? selectedCustomProvider?.encryptedApiKey : encryptedApiKey;

  const UPDATE_KEYWORD_REGEX = /(修改|更新|改成|调整)/;
  const UPDATE_PREFIX_REGEX = /^(完成|做完了?|标记完成|修改|更新|改成|调整)\s*/;
  const DELETE_PREFIX_REGEX = /^(删除|移除|去掉)\s*/;

  const extractTargetQuery = (action: ParsedCommand["action"], rawInput?: string) => {
    const trimmed = rawInput?.trim();
    if (!trimmed) return undefined;

    if (action === "DELETE") {
      return trimmed.replace(DELETE_PREFIX_REGEX, "").trim() || undefined;
    }

    if (action === "UPDATE") {
      return trimmed.replace(UPDATE_PREFIX_REGEX, "").trim() || undefined;
    }

    return undefined;
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isProcessing) return;

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    setIsProcessing(true);
    setError(null);
    setLastParsed(null);

    try {
      let parsedCommand: ParsedCommand;

      // 检查是否启用 AI 且有 API Key
      if (aiEnabled && effectiveEncryptedApiKey) {
        try {
          const apiKey = await decryptApiKey(effectiveEncryptedApiKey);
          parsedCommand = await parseCommand(
            trimmedInput,
            {
              provider: aiProvider,
              apiKey,
              model: aiProvider === "gemini" ? geminiModel : undefined,
              customConfig:
                aiProvider === "custom" ? selectedCustomProvider || customAIConfig : undefined,
            },
            // 只传递未删除的任务给 AI
            tasks.filter((t) => !t.deletedAt).map((t) => ({ id: t.id, content: t.content })),
            customPrompts
          );
          setLastParsed(parsedCommand);
        } catch (aiError) {
          const errMsg = aiError instanceof Error ? aiError.message : "AI 解析失败";
          console.warn("AI 解析失败:", aiError);
          // AI 失败时标记错误，不再静默降级为 ADD
          parsedCommand = {
            action: "UNKNOWN",
            confidence: 0,
            rawInput: trimmedInput,
            aiError: errMsg,
          };
        }
      } else {
        // 无 AI 时直接作为添加任务
        parsedCommand = {
          action: "ADD",
          confidence: 1,
          task: { content: trimmedInput },
          rawInput: trimmedInput,
        };
      }

      // 执行操作
      await executeCommand(parsedCommand);

      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("处理指令失败:", err);
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCommand = async (command: ParsedCommand) => {
    switch (command.action) {
      case "ADD": {
        if (!command.task?.content) {
          throw new Error("任务内容不能为空");
        }

        const newTask = await createTask({
          content: command.task.content,
          projectId: currentProjectId,
          startDate: command.task.startDate,
          endDate: command.task.endDate,
          pic: command.task.pic,
          completedDate: command.task.completedDate,
          remark: command.task.remark,
          rawCommand: command.rawInput,
        });

        onTaskCreated?.(newTask);
        break;
      }

      case "UPDATE": {
        const rawInput = command.rawInput || "";
        const targetQuery = command.targetId?.trim() || extractTargetQuery("UPDATE", rawInput);

        if (!targetQuery) {
          throw new Error("请指定要修改的任务（ID/序号/关键内容）");
        }

        // 过滤已删除的任务（双重保险）
        const activeTasks = tasks.filter((t) => !t.deletedAt);
        const match = findTaskCandidates(targetQuery, activeTasks);

        if (!match.best) {
          throw new Error("未找到匹配的任务");
        }
        if (match.isAmbiguous) {
          setSelectionDialog({
            open: true,
            candidates: match.candidates.slice(0, 3),
            action: "UPDATE",
            pendingCommand: command,
          });
          setIsProcessing(false);
          return;
        }

        const updates: UpdateTaskInput = {};
        if (command.task?.content) updates.content = command.task.content;
        if (command.task?.status) updates.status = command.task.status;
        if (command.task?.pic) updates.pic = command.task.pic;
        if (command.task?.startDate) updates.startDate = command.task.startDate;
        if (command.task?.endDate) updates.endDate = command.task.endDate;
        if (command.task?.completedDate) updates.completedDate = command.task.completedDate;
        if (command.task?.remark) updates.remark = command.task.remark;

        if (Object.keys(updates).length === 0) {
          throw new Error("请说明要修改的内容");
        }

        const targetTask = match.best.task;
        const beforeSnapshot = { ...targetTask };

        await updateTask(targetTask.id, updates);

        const updatedTask = tasks.find((t) => t.id === targetTask.id);
        if (updatedTask) {
          onTaskUpdated?.(updatedTask, beforeSnapshot);
        }
        break;
      }

      case "DELETE": {
        const rawInput = command.rawInput || "";
        if (UPDATE_KEYWORD_REGEX.test(rawInput)) {
          throw new Error("检测到修改意图，请使用修改指令或补充要修改的内容");
        }

        const targetQuery = command.targetId?.trim() || extractTargetQuery("DELETE", rawInput);
        if (!targetQuery) {
          throw new Error("请指定要删除的任务（ID/序号/关键内容）");
        }

        // 过滤已删除的任务（双重保险）
        const activeTasksForDelete = tasks.filter((t) => !t.deletedAt);
        const match = findTaskCandidates(targetQuery, activeTasksForDelete);

        if (!match.best) {
          throw new Error("未找到匹配的任务");
        }
        if (match.isAmbiguous) {
          setSelectionDialog({
            open: true,
            candidates: match.candidates.slice(0, 3),
            action: "DELETE",
            pendingCommand: command,
          });
          setIsProcessing(false);
          return;
        }

        const targetTask = match.best.task;
        await deleteTask(targetTask.id);
        onTaskDeleted?.(targetTask);
        break;
      }

      case "UNKNOWN":
      default:
        // AI 解析失败时不静默添加，提示用户
        if (command.aiError) {
          setError(`AI 解析失败: ${command.aiError}。请重试或检查 AI 配置。`);
          return;
        }
        // 低置信度或未知操作，作为添加任务处理
        if (command.rawInput) {
          const newTask = await createTask({
            content: command.rawInput,
            projectId: currentProjectId,
            rawCommand: command.rawInput,
          });
          onTaskCreated?.(newTask);
        }
        break;
    }
  };

  // Handle task selection from dialog
  const handleTaskSelected = async (task: SyntropyTask) => {
    if (!selectionDialog) return;

    const { action, pendingCommand } = selectionDialog;
    setSelectionDialog(null);
    setIsProcessing(true);
    setError(null);

    try {
      if (action === "UPDATE") {
        const updates: UpdateTaskInput = {};
        if (pendingCommand.task?.content) updates.content = pendingCommand.task.content;
        if (pendingCommand.task?.status) updates.status = pendingCommand.task.status;
        if (pendingCommand.task?.pic) updates.pic = pendingCommand.task.pic;
        if (pendingCommand.task?.startDate) updates.startDate = pendingCommand.task.startDate;
        if (pendingCommand.task?.endDate) updates.endDate = pendingCommand.task.endDate;
        if (pendingCommand.task?.completedDate)
          updates.completedDate = pendingCommand.task.completedDate;
        if (pendingCommand.task?.remark) updates.remark = pendingCommand.task.remark;

        if (Object.keys(updates).length === 0) {
          throw new Error("请说明要修改的内容");
        }

        const beforeSnapshot = { ...task };
        await updateTask(task.id, updates);

        const updatedTask = tasks.find((t) => t.id === task.id);
        if (updatedTask) {
          onTaskUpdated?.(updatedTask, beforeSnapshot);
        }
      } else if (action === "DELETE") {
        await deleteTask(task.id);
        onTaskDeleted?.(task);
      }

      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("操作失败:", err);
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectionCancel = () => {
    setSelectionDialog(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasApiKey = !!effectiveEncryptedApiKey;

  return (
    <div className="safe-area-inset-bottom fixed bottom-20 left-0 right-0 z-50 border-t bg-background p-4 sm:static sm:bottom-auto sm:left-auto sm:right-auto sm:z-auto">
      {/* Error Display */}
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-2">{error}</span>
        </div>
      )}

      <div className="relative flex items-center gap-3">
        {/* AI Toggle - larger touch target on mobile */}
        <Button
          variant={aiEnabled && hasApiKey ? "default" : "outline"}
          size="icon"
          onClick={() => setAiEnabled(!aiEnabled)}
          disabled={!hasApiKey}
          aria-label={aiEnabled && hasApiKey ? "AI 解析已启用" : "AI 解析已禁用"}
          title={
            hasApiKey
              ? aiEnabled
                ? "AI parsing enabled"
                : "AI parsing disabled"
              : "Please configure API Key in settings"
          }
          className="h-11 w-11 shrink-0 touch-manipulation sm:h-10 sm:w-10"
        >
          <Sparkles
            className={`h-5 w-5 sm:h-4 sm:w-4 ${aiEnabled && hasApiKey ? "" : "opacity-50"}`}
          />
        </Button>

        {/* Input - taller on mobile for easier touch */}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            aiEnabled && hasApiKey ? "Enter natural language command..." : "Enter task content..."
          }
          disabled={isProcessing}
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          className="h-11 flex-1 touch-manipulation text-base sm:h-10 sm:text-sm"
        />

        {/* Submit Button - larger touch target on mobile */}
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isProcessing}
          className="h-11 touch-manipulation px-4 sm:h-10 sm:px-4"
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
          ) : (
            <>
              <Send className="mr-1 h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </Button>
      </div>

      {/* AI Status - hidden on mobile to save space */}
      <div className="mt-2 hidden items-center justify-between text-xs text-muted-foreground sm:flex">
        <span>
          {aiEnabled && hasApiKey ? (
            <>
              <Sparkles className="mr-1 inline h-3 w-3" />
              AI parsing enabled (
              {getProviderDisplayName(aiProvider, selectedCustomProvider || customAIConfig)})
            </>
          ) : hasApiKey ? (
            "AI parsing disabled, click the button to enable"
          ) : (
            "Please configure API Key in settings to enable AI parsing"
          )}
        </span>

        {lastParsed && lastParsed.confidence < 1 && (
          <span className="text-yellow-600">
            Confidence: {Math.round(lastParsed.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Task Selection Dialog */}
      {selectionDialog && (
        <TaskSelectionDialog
          open={selectionDialog.open}
          onOpenChange={(open) => !open && handleSelectionCancel()}
          candidates={selectionDialog.candidates}
          action={selectionDialog.action}
          onSelect={handleTaskSelected}
          onCancel={handleSelectionCancel}
        />
      )}
    </div>
  );
}
