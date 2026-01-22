"use client";

import { ClipboardList } from "lucide-react";

/**
 * 空状态组件
 * 当任务列表为空时显示
 */
export function EmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
      {/* 简洁的图标插图 */}
      <div className="mb-4 rounded-full bg-muted/50 p-4">
        <ClipboardList className="h-10 w-10 text-muted-foreground/70" strokeWidth={1.5} />
      </div>

      {/* 标题 */}
      <p className="text-lg font-medium text-foreground/80">暂无任务</p>

      {/* 提示文本 */}
      <p className="mt-1 text-center text-sm">
        在下方输入框添加新任务
        <br />
        <span className="text-xs text-muted-foreground/60">试试: &quot;明天下午开会&quot;</span>
      </p>

      {/* 装饰性圆点 */}
      <div className="mt-6 flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
      </div>
    </div>
  );
}
