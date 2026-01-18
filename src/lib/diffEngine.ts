import type { SyntropyTask, DiffResult, TaskDiff } from "@/types";
import type { ImportedTask } from "./importExcel";

/**
 * 对比导入的任务与现有任务
 *
 * @param imported 从 Excel 导入的任务
 * @param existing 数据库中现有的任务
 * @returns 差异结果
 */
export function diffTasks(
  imported: ImportedTask[],
  existing: SyntropyTask[]
): DiffResult {
  const added: SyntropyTask[] = [];
  const modified: TaskDiff[] = [];
  const deleted: SyntropyTask[] = [];

  // 创建现有任务的 ID 映射
  const existingMap = new Map<string, SyntropyTask>();
  existing.forEach((task) => existingMap.set(task.id, task));

  // 创建导入任务的 ID 集合
  const importedIds = new Set<string>();

  // 遍历导入的任务
  for (const imp of imported) {
    if (imp.id && existingMap.has(imp.id)) {
      // 有 ID 且存在 → 检查是否有修改
      const existingTask = existingMap.get(imp.id)!;
      importedIds.add(imp.id);

      const changes = detectChanges(existingTask, imp);
      if (changes.length > 0) {
        modified.push({
          id: imp.id,
          before: existingTask,
          after: mergeTask(existingTask, imp),
          changedFields: changes,
        });
      }
    } else {
      // 无 ID 或 ID 不存在 → 新增
      // 创建临时任务对象用于显示
      const newTask: SyntropyTask = {
        id: imp.id || `NEW-${imp.rowNumber}`,
        projectId: "", // 将在实际创建时设置
        content: imp.content,
        status: imp.status,
        priority: imp.priority,
        startDate: imp.startDate,
        endDate: imp.endDate,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "",
        updatedBy: "",
      };
      added.push(newTask);
    }
  }

  // 检查删除（现有任务不在导入列表中）
  // 只有当导入文件包含 ID 列时才检测删除
  const hasIdColumn = imported.some((t) => t.id);
  if (hasIdColumn) {
    for (const task of existing) {
      if (!importedIds.has(task.id)) {
        deleted.push(task);
      }
    }
  }

  return { added, modified, deleted };
}

/**
 * 检测任务变更的字段
 */
function detectChanges(
  existing: SyntropyTask,
  imported: ImportedTask
): (keyof SyntropyTask)[] {
  const changes: (keyof SyntropyTask)[] = [];

  if (imported.content && imported.content !== existing.content) {
    changes.push("content");
  }

  if (imported.status !== existing.status) {
    changes.push("status");
  }

  if (imported.priority !== existing.priority) {
    changes.push("priority");
  }

  if (imported.startDate !== existing.startDate) {
    changes.push("startDate");
  }

  if (imported.endDate !== existing.endDate) {
    changes.push("endDate");
  }

  return changes;
}

/**
 * 合并导入数据到现有任务
 */
function mergeTask(
  existing: SyntropyTask,
  imported: ImportedTask
): SyntropyTask {
  return {
    ...existing,
    content: imported.content || existing.content,
    status: imported.status,
    priority: imported.priority,
    startDate: imported.startDate,
    endDate: imported.endDate,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 生成差异摘要
 */
export function getDiffSummary(diff: DiffResult): string {
  const parts: string[] = [];

  if (diff.added.length > 0) {
    parts.push(`新增 ${diff.added.length} 项`);
  }

  if (diff.modified.length > 0) {
    parts.push(`修改 ${diff.modified.length} 项`);
  }

  if (diff.deleted.length > 0) {
    parts.push(`删除 ${diff.deleted.length} 项`);
  }

  return parts.length > 0 ? parts.join("，") : "无变更";
}

/**
 * 检查是否有任何变更
 */
export function hasDiffChanges(diff: DiffResult): boolean {
  return (
    diff.added.length > 0 ||
    diff.modified.length > 0 ||
    diff.deleted.length > 0
  );
}
