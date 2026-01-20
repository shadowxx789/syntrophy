"use client";

import { Plus, Minus, Pencil } from "lucide-react";
import type { DiffResult, SyntropyTask, TaskDiff } from "@/types";
import { cn } from "@/lib/utils";

interface DiffPreviewProps {
  diff: DiffResult;
  className?: string;
}

export function DiffPreview({ diff, className }: DiffPreviewProps) {
  const hasChanges = diff.added.length > 0 || diff.modified.length > 0 || diff.deleted.length > 0;

  if (!hasChanges) {
    return (
      <div className={cn("py-8 text-center text-muted-foreground", className)}>没有检测到变更</div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 新增 */}
      {diff.added.length > 0 && (
        <DiffSection
          title="新增"
          count={diff.added.length}
          icon={<Plus className="h-4 w-4" />}
          color="green"
        >
          {diff.added.map((task, index) => (
            <AddedTaskRow key={task.id || index} task={task} />
          ))}
        </DiffSection>
      )}

      {/* 修改 */}
      {diff.modified.length > 0 && (
        <DiffSection
          title="修改"
          count={diff.modified.length}
          icon={<Pencil className="h-4 w-4" />}
          color="yellow"
        >
          {diff.modified.map((taskDiff) => (
            <ModifiedTaskRow key={taskDiff.id} diff={taskDiff} />
          ))}
        </DiffSection>
      )}

      {/* 删除 */}
      {diff.deleted.length > 0 && (
        <DiffSection
          title="删除"
          count={diff.deleted.length}
          icon={<Minus className="h-4 w-4" />}
          color="red"
        >
          {diff.deleted.map((task) => (
            <DeletedTaskRow key={task.id} task={task} />
          ))}
        </DiffSection>
      )}
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: "green" | "yellow" | "red";
  children: React.ReactNode;
}

function DiffSection({ title, count, icon, color, children }: DiffSectionProps) {
  const colorClasses = {
    green: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    yellow:
      "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    red: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  const badgeClasses = {
    green: "bg-green-500 text-white",
    yellow: "bg-yellow-500 text-white",
    red: "bg-red-500 text-white",
  };

  return (
    <div className={cn("rounded-lg border-l-4 p-4", colorClasses[color])}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs", badgeClasses[color])}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AddedTaskRow({ task }: { task: SyntropyTask }) {
  const statusLabels: Record<SyntropyTask["status"], string> = {
    pending: "○ 待开始",
    in_progress: "◐ 进行中",
    completed: "✓ 已完成",
    delayed: "⚠ 滞后",
  };

  return (
    <div className="rounded-md bg-white/50 p-2 dark:bg-black/20">
      <p className="text-sm font-medium">{task.content}</p>
      <div className="mt-1 flex flex-wrap gap-3 text-xs opacity-70">
        <span>状态: {statusLabels[task.status]}</span>
        {task.pic && <span>负责人: {task.pic}</span>}
        {task.startDate && <span>开始: {task.startDate}</span>}
        {task.endDate && <span>截止: {task.endDate}</span>}
        {task.completedDate && <span>完成: {task.completedDate}</span>}
        {task.remark && <span>备注: {task.remark}</span>}
      </div>
    </div>
  );
}

function ModifiedTaskRow({ diff }: { diff: TaskDiff }) {
  return (
    <div className="rounded-md bg-white/50 p-2 dark:bg-black/20">
      <p className="font-mono text-xs text-muted-foreground">{diff.id}</p>
      <div className="mt-1 space-y-1">
        {diff.changedFields.map((field) => (
          <FieldChange
            key={field}
            field={field}
            before={diff.before[field]}
            after={diff.after[field]}
          />
        ))}
      </div>
    </div>
  );
}

function FieldChange({ field, before, after }: { field: string; before: unknown; after: unknown }) {
  const fieldLabels: Record<string, string> = {
    content: "内容",
    status: "状态",
    pic: "负责人",
    startDate: "开始日期",
    endDate: "截止日期",
    completedDate: "完成日期",
    remark: "备注",
  };

  return (
    <div className="text-sm">
      <span className="font-medium">{fieldLabels[field] || field}:</span>{" "}
      <span className="line-through opacity-60">{String(before || "空")}</span>
      {" → "}
      <span className="font-medium">{String(after || "空")}</span>
    </div>
  );
}

function DeletedTaskRow({ task }: { task: SyntropyTask }) {
  return (
    <div className="rounded-md bg-white/50 p-2 dark:bg-black/20">
      <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
      <p className="text-sm line-through">{task.content}</p>
    </div>
  );
}
