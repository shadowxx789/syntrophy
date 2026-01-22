"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** 触发刷新的阈值距离 (px) */
  threshold?: number;
  /** 禁用下拉刷新 */
  disabled?: boolean;
}

const DEFAULT_THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * 下拉刷新容器组件
 * 仅在移动端触控设备上启用
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const canPullRef = useRef(false);

  // 检查是否可以开始下拉（滚动位置在顶部）
  const checkCanPull = useCallback(() => {
    if (!containerRef.current) return false;
    // 容器或页面滚动位置为 0 时可下拉
    const scrollTop = containerRef.current.scrollTop || window.scrollY;
    return scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      // 检查是否从顶部开始
      canPullRef.current = checkCanPull();
      if (!canPullRef.current) return;

      startYRef.current = e.touches[0].clientY;
      currentYRef.current = e.touches[0].clientY;
    },
    [disabled, isRefreshing, checkCanPull]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !canPullRef.current) return;

      currentYRef.current = e.touches[0].clientY;
      const diff = currentYRef.current - startYRef.current;

      // 只处理向下拉动
      if (diff > 0 && checkCanPull()) {
        // 阻力效果：拉得越远阻力越大
        const resistance = Math.min(1, 1 - diff / 500);
        const distance = Math.min(diff * resistance, MAX_PULL);

        setPullDistance(distance);
        setIsPulling(true);

        // 超过阈值时触觉反馈
        if (distance >= threshold && pullDistance < threshold) {
          if (navigator.vibrate) {
            navigator.vibrate(10);
          }
        }
      }
    },
    [disabled, isRefreshing, checkCanPull, threshold, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      // 触发刷新
      setIsRefreshing(true);
      setPullDistance(threshold / 2); // 保持一定高度显示刷新动画

      // 触觉反馈
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // 回弹
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh]);

  // 监听 window 滚动以支持整页滚动场景
  useEffect(() => {
    const handleScroll = () => {
      if (isPulling && !checkCanPull()) {
        // 如果在拉动过程中发生滚动，取消拉动
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPulling, checkCanPull]);

  // 计算状态
  const isPastThreshold = pullDistance >= threshold;
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉指示器 */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center overflow-hidden",
          "pointer-events-none z-10",
          isPulling || isRefreshing ? "" : "transition-all duration-300 ease-out"
        )}
        style={{
          height: pullDistance,
          top: 0,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            "bg-muted/80 backdrop-blur-sm",
            "h-10 w-10",
            isPastThreshold || isRefreshing ? "text-foreground" : "text-muted-foreground"
          )}
          style={{
            opacity: Math.min(progress * 1.5, 1),
            transform: `rotate(${isRefreshing ? 0 : progress * 180}deg)`,
          }}
        >
          <RefreshCw
            className={cn("h-5 w-5", isRefreshing && "animate-spin")}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className={cn(
          isPulling || isRefreshing ? "" : "transition-transform duration-300 ease-out"
        )}
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
