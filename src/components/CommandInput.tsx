"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseCommand, findMatchingTask, getProviderDisplayName } from "@/lib/ai";
import { decryptApiKey } from "@/lib/crypto";
import type { ParsedCommand, SyntropyTask } from "@/types";

interface CommandInputProps {
  onTaskCreated?: (task: SyntropyTask, beforeSnapshot?: SyntropyTask) => void;
  onTaskUpdated?: (task: SyntropyTask, beforeSnapshot: SyntropyTask) => void;
  onTaskDeleted?: (task: SyntropyTask) => void;
}

export function CommandInput({
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: CommandInputProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastParsed, setLastParsed] = useState<ParsedCommand | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tasks, createTask, updateTask, deleteTask } = useTaskStore();
  const { currentProjectId } = useProjectStore();
  const { aiProvider, encryptedApiKey, customAIConfig } = useSettingsStore();

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setLastParsed(null);

    try {
      let parsedCommand: ParsedCommand;

      // 检查是否启用 AI 且有 API Key
      if (aiEnabled && encryptedApiKey) {
        try {
          const apiKey = await decryptApiKey(encryptedApiKey);
          parsedCommand = await parseCommand(
            trimmedInput,
            {
              provider: aiProvider,
              apiKey,
              customConfig: aiProvider === "custom" ? customAIConfig : undefined,
            },
            tasks.map((t) => ({ id: t.id, content: t.content }))
          );
          setLastParsed(parsedCommand);
        } catch (aiError) {
          console.warn("AI 解析失败，降级为直接添加:", aiError);
          // AI 失败时降级
          parsedCommand = {
            action: "ADD",
            confidence: 1,
            task: { content: trimmedInput },
            rawInput: trimmedInput,
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
          priority: command.task.priority,
          rawCommand: command.rawInput,
        });

        onTaskCreated?.(newTask);
        break;
      }

      case "UPDATE": {
        // 查找目标任务
        const targetTask = command.targetId
          ? findMatchingTask(command.targetId, tasks)
          : tasks[0]; // 默认最新的任务

        if (!targetTask) {
          throw new Error("找不到要修改的任务");
        }

        const beforeSnapshot = { ...targetTask };

        await updateTask(targetTask.id, {
          content: command.task?.content,
          status: command.task?.status,
          priority: command.task?.priority,
          startDate: command.task?.startDate,
          endDate: command.task?.endDate,
        });

        const updatedTask = tasks.find((t) => t.id === targetTask.id);
        if (updatedTask) {
          onTaskUpdated?.(updatedTask, beforeSnapshot);
        }
        break;
      }

      case "DELETE": {
        // 查找目标任务
        const targetTask = command.targetId
          ? findMatchingTask(command.targetId, tasks)
          : null;

        if (!targetTask) {
          throw new Error("找不到要删除的任务");
        }

        await deleteTask(targetTask.id);
        onTaskDeleted?.(targetTask);
        break;
      }

      case "UNKNOWN":
      default:
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasApiKey = !!encryptedApiKey;

  return (
    <div className="border-t bg-background p-4 safe-area-inset-bottom">
      {/* Error Display */}
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-2">{error}</span>
        </div>
      )}

      <div className="relative flex items-center gap-2">
        {/* AI Toggle - larger touch target on mobile */}
        <Button
          variant={aiEnabled && hasApiKey ? "default" : "outline"}
          size="icon"
          onClick={() => setAiEnabled(!aiEnabled)}
          disabled={!hasApiKey}
          title={
            hasApiKey
              ? aiEnabled
                ? "AI parsing enabled"
                : "AI parsing disabled"
              : "Please configure API Key in settings"
          }
          className="shrink-0 h-11 w-11 sm:h-10 sm:w-10 touch-manipulation"
        >
          <Sparkles className={`h-5 w-5 sm:h-4 sm:w-4 ${aiEnabled && hasApiKey ? "" : "opacity-50"}`} />
        </Button>

        {/* Input - taller on mobile for easier touch */}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            aiEnabled && hasApiKey
              ? "Enter natural language command..."
              : "Enter task content..."
          }
          disabled={isProcessing}
          className="flex-1 h-11 sm:h-10 text-base sm:text-sm touch-manipulation"
        />

        {/* Submit Button - larger touch target on mobile */}
        <Button 
          onClick={handleSubmit} 
          disabled={!input.trim() || isProcessing}
          className="h-11 px-4 sm:h-10 sm:px-4 touch-manipulation"
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <>
              <Send className="mr-1 h-5 w-5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </Button>
      </div>

      {/* AI Status - hidden on mobile to save space */}
      <div className="mt-2 hidden sm:flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {aiEnabled && hasApiKey ? (
            <>
              <Sparkles className="mr-1 inline h-3 w-3" />
              AI parsing enabled ({getProviderDisplayName(aiProvider, customAIConfig)})
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
    </div>
  );
}
