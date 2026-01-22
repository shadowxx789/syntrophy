"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface TaskCardSkeletonProps {
  /** 显示骨架数量 */
  count?: number;
}

/**
 * 任务卡片骨架屏
 * 用于加载状态显示
 */
export function TaskCardSkeleton({ count = 3 }: TaskCardSkeletonProps) {
  return (
    <div className="space-y-4 p-4">
      {/* Section header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
              {/* Checkbox skeleton */}
              <Skeleton className="mt-0.5 h-5 w-5 rounded sm:h-4 sm:w-4" />

              {/* Content skeleton */}
              <div className="min-w-0 flex-1 space-y-2">
                {/* ID + Status badge */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>

                {/* Task content - varied widths for natural look */}
                <Skeleton className={`h-4 ${i % 2 === 0 ? "w-full" : "w-3/4"}`} />

                {/* Date info */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>

              {/* Action button skeleton */}
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
