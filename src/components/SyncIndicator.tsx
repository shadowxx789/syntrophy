"use client";

/**
 * Sync Indicator Component
 * 凝序 Syntropy - Phase 5: User System
 *
 * Shows sync status in the UI
 */

import { useEffect, useState } from "react";
import { subscribeSyncStatus, getSyncStatus, type SyncStatus } from "@/lib/syncService";
import { Cloud, CloudOff, Loader2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function SyncIndicator({ className, showLabel = false }: SyncIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setStatus);
    return unsubscribe;
  }, []);

  const getIcon = () => {
    if (!status.isOnline) {
      return <CloudOff className="h-4 w-4" />;
    }

    switch (status.state) {
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "idle":
        return status.lastSyncAt ? <Check className="h-4 w-4" /> : <Cloud className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    if (!status.isOnline) {
      return "离线";
    }

    switch (status.state) {
      case "syncing":
        return "同步中...";
      case "error":
        return "同步失败";
      case "idle":
        if (status.lastSyncAt) {
          return formatLastSync(status.lastSyncAt);
        }
        return "未同步";
      default:
        return "未知状态";
    }
  };

  const getColor = () => {
    if (!status.isOnline) {
      return "text-slate-500";
    }

    switch (status.state) {
      case "syncing":
        return "text-blue-400";
      case "error":
        return "text-red-400";
      case "idle":
        return status.lastSyncAt ? "text-green-400" : "text-slate-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div
      className={cn("flex items-center gap-2 text-sm", getColor(), className)}
      title={status.error || getLabel()}
    >
      {getIcon()}
      {showLabel && <span>{getLabel()}</span>}
      {status.pendingChanges > 0 && (
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
          {status.pendingChanges}
        </span>
      )}
    </div>
  );
}

function formatLastSync(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "刚刚同步";
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else {
    return `${days}天前`;
  }
}
