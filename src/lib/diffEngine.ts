import type {
  SyntropyTask,
  DiffResult,
  TaskDiff,
  SheetMapping,
  MultiProjectDiffResult,
  ProjectDiff,
} from "@/types";
import { IMPORT_NEW_PROJECT_ID } from "@/types";
import type { ImportedTask, SheetParseResult } from "./importExcel";

/**
 * 对比导入的任务与现有任务
 *
 * @param imported 从 Excel 导入的任务
 * @param existing 数据库中现有的任务
 * @returns 差异结果
 */
export function diffTasks(imported: ImportedTask[], existing: SyntropyTask[]): DiffResult {
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
        pic: imp.pic,
        startDate: imp.startDate,
        endDate: imp.endDate,
        completedDate: imp.completedDate,
        remark: imp.remark,
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
function detectChanges(existing: SyntropyTask, imported: ImportedTask): (keyof SyntropyTask)[] {
  const changes: (keyof SyntropyTask)[] = [];

  if (imported.content && imported.content !== existing.content) {
    changes.push("content");
  }

  if (imported.status !== existing.status) {
    changes.push("status");
  }

  if (imported.pic !== existing.pic) {
    changes.push("pic");
  }

  if (imported.startDate !== existing.startDate) {
    changes.push("startDate");
  }

  if (imported.endDate !== existing.endDate) {
    changes.push("endDate");
  }

  if (imported.completedDate !== existing.completedDate) {
    changes.push("completedDate");
  }

  if (imported.remark !== existing.remark) {
    changes.push("remark");
  }

  return changes;
}

/**
 * 合并导入数据到现有任务
 */
function mergeTask(existing: SyntropyTask, imported: ImportedTask): SyntropyTask {
  return {
    ...existing,
    content: imported.content || existing.content,
    status: imported.status,
    pic: imported.pic,
    startDate: imported.startDate,
    endDate: imported.endDate,
    completedDate: imported.completedDate,
    remark: imported.remark,
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
  return diff.added.length > 0 || diff.modified.length > 0 || diff.deleted.length > 0;
}

/**
 * 对比多个 Sheet 与对应项目
 *
 * @param sheets 解析后的 Sheet 列表
 * @param mappings Sheet 到项目的映射配置
 * @param projectTasksMap 项目 ID 到任务列表的映射
 * @param projectNamesMap 项目 ID 到项目名称的映射
 * @returns 多项目差异结果
 */
export function diffMultipleSheets(
  sheets: SheetParseResult[],
  mappings: SheetMapping[],
  projectTasksMap: Map<string, SyntropyTask[]>,
  projectNamesMap: Map<string, string>
): MultiProjectDiffResult {
  const projectDiffs: ProjectDiff[] = [];

  for (const mapping of mappings) {
    // 跳过未选择目标的 Sheet
    if (!mapping.targetProjectId) continue;

    // 找到对应的 Sheet
    const sheet = sheets.find((s) => s.sheetName === mapping.sheetName);
    if (!sheet || sheet.tasks.length === 0) continue;

    const isNewProject = mapping.targetProjectId === IMPORT_NEW_PROJECT_ID;
    const projectId = isNewProject ? `NEW-${mapping.sheetName}` : mapping.targetProjectId;
    const projectName = isNewProject
      ? mapping.newProjectName || mapping.sheetName
      : projectNamesMap.get(mapping.targetProjectId) || mapping.sheetName;

    // 获取现有任务（新项目没有现有任务）
    const existingTasks = isNewProject ? [] : projectTasksMap.get(mapping.targetProjectId) || [];

    // 计算差异
    const diff = diffTasks(sheet.tasks, existingTasks);

    projectDiffs.push({
      sheetName: mapping.sheetName,
      projectId,
      projectName,
      isNewProject,
      diff,
    });
  }

  return { projectDiffs };
}

/**
 * 生成多项目差异摘要
 */
export function getMultiDiffSummary(result: MultiProjectDiffResult): string {
  if (result.projectDiffs.length === 0) {
    return "无变更";
  }

  const totalAdded = result.projectDiffs.reduce((sum, pd) => sum + pd.diff.added.length, 0);
  const totalModified = result.projectDiffs.reduce((sum, pd) => sum + pd.diff.modified.length, 0);
  const totalDeleted = result.projectDiffs.reduce((sum, pd) => sum + pd.diff.deleted.length, 0);
  const newProjects = result.projectDiffs.filter((pd) => pd.isNewProject).length;

  const parts: string[] = [];

  if (newProjects > 0) {
    parts.push(`新建 ${newProjects} 个项目`);
  }

  if (totalAdded > 0) {
    parts.push(`新增 ${totalAdded} 项任务`);
  }

  if (totalModified > 0) {
    parts.push(`修改 ${totalModified} 项`);
  }

  if (totalDeleted > 0) {
    parts.push(`删除 ${totalDeleted} 项`);
  }

  return parts.length > 0 ? parts.join("，") : "无变更";
}

/**
 * 检查多项目差异是否有任何变更
 */
export function hasMultiDiffChanges(result: MultiProjectDiffResult): boolean {
  return result.projectDiffs.some((pd) => hasDiffChanges(pd.diff));
}
