"use client";

import { FolderPlus, Folder } from "lucide-react";
import type { MultiProjectDiffResult } from "@/types";
import { DiffPreview } from "./DiffPreview";
import { cn } from "@/lib/utils";
import { hasDiffChanges } from "@/lib/diffEngine";

interface MultiDiffPreviewProps {
  result: MultiProjectDiffResult;
  className?: string;
}

/**
 * 多项目差异预览组件
 * 按项目分组显示差异
 */
export function MultiDiffPreview({ result, className }: MultiDiffPreviewProps) {
  if (result.projectDiffs.length === 0) {
    return (
      <div className={cn("py-8 text-center text-muted-foreground", className)}>
        没有选择任何项目进行导入
      </div>
    );
  }

  // 过滤掉没有变更的项目（除非是新项目）
  const projectsWithChanges = result.projectDiffs.filter(
    (pd) => pd.isNewProject || hasDiffChanges(pd.diff)
  );

  if (projectsWithChanges.length === 0) {
    return (
      <div className={cn("py-8 text-center text-muted-foreground", className)}>
        没有检测到任何变更
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {projectsWithChanges.map((pd) => (
        <ProjectDiffSection key={pd.sheetName} projectDiff={pd} />
      ))}
    </div>
  );
}

interface ProjectDiffSectionProps {
  projectDiff: MultiProjectDiffResult["projectDiffs"][0];
}

function ProjectDiffSection({ projectDiff }: ProjectDiffSectionProps) {
  const { sheetName, projectName, isNewProject, diff } = projectDiff;

  return (
    <div className="rounded-lg border bg-card">
      {/* 项目标题 */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {isNewProject ? (
          <FolderPlus className="h-5 w-5 text-blue-500" />
        ) : (
          <Folder className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="flex-1">
          <span className="font-medium">{projectName}</span>
          {isNewProject && (
            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              新建项目
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">来自: {sheetName}</span>
      </div>

      {/* 差异内容 */}
      <div className="p-4">
        <DiffPreview diff={diff} />
      </div>
    </div>
  );
}
