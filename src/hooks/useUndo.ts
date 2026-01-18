"use client";

import { useCallback, useRef, useState } from "react";
import { db } from "@/lib/db";
import type { SyntropyTask, Operation } from "@/types";

interface UndoableAction {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  entityType: "task" | "project";
  entityId: string;
  beforeSnapshot?: SyntropyTask;
  afterSnapshot: SyntropyTask;
  timestamp: number;
}

interface UseUndoReturn {
  /** 记录可撤销的操作 */
  recordAction: (action: Omit<UndoableAction, "id" | "timestamp">) => string;

  /** 撤销指定操作 */
  undoAction: (actionId: string) => Promise<boolean>;

  /** 当前待撤销的操作 */
  pendingAction: UndoableAction | null;

  /** 清除待撤销操作 */
  clearPending: () => void;

  /** 是否正在撤销 */
  isUndoing: boolean;
}

const UNDO_WINDOW_MS = 5000; // 5 秒撤销窗口

/**
 * 撤销功能 Hook
 */
export function useUndo(): UseUndoReturn {
  const [pendingAction, setPendingAction] = useState<UndoableAction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 记录可撤销的操作
   */
  const recordAction = useCallback(
    (action: Omit<UndoableAction, "id" | "timestamp">): string => {
      // 清除之前的定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullAction: UndoableAction = {
        ...action,
        id,
        timestamp: Date.now(),
      };

      setPendingAction(fullAction);

      // 5 秒后自动清除
      timerRef.current = setTimeout(() => {
        setPendingAction((current) => (current?.id === id ? null : current));
      }, UNDO_WINDOW_MS);

      return id;
    },
    []
  );

  /**
   * 执行撤销
   */
  const undoAction = useCallback(
    async (actionId: string): Promise<boolean> => {
      const action = pendingAction;
      if (!action || action.id !== actionId) {
        return false;
      }

      setIsUndoing(true);

      try {
        if (action.entityType === "task") {
          switch (action.type) {
            case "CREATE":
              // 撤销创建 = 删除
              await db.tasks.delete(action.entityId);
              break;

            case "UPDATE":
              // 撤销更新 = 恢复之前的状态
              if (action.beforeSnapshot) {
                await db.tasks.put(action.beforeSnapshot);
              }
              break;

            case "DELETE":
              // 撤销删除 = 恢复
              if (action.beforeSnapshot) {
                // 清除 deletedAt
                const restored = { ...action.beforeSnapshot, deletedAt: undefined };
                await db.tasks.put(restored);
              }
              break;
          }

          // 删除对应的操作日志
          const operations = await db.operations
            .filter(
              (op: Operation) =>
                op.entityId === action.entityId &&
                new Date(op.timestamp).getTime() >= action.timestamp - 1000
            )
            .toArray();

          if (operations.length > 0) {
            await db.operations.bulkDelete(operations.map((op: Operation) => op.id));
          }
        }

        // 清除待撤销操作
        setPendingAction(null);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        return true;
      } catch (error) {
        console.error("撤销失败:", error);
        return false;
      } finally {
        setIsUndoing(false);
      }
    },
    [pendingAction]
  );

  /**
   * 清除待撤销操作
   */
  const clearPending = useCallback(() => {
    setPendingAction(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return {
    recordAction,
    undoAction,
    pendingAction,
    clearPending,
    isUndoing,
  };
}
