"use client";

/**
 * Profile Page
 * 凝序 Syntropy - Phase 5: User System
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { SyncIndicator } from "@/components/SyncIndicator";
import { backupAllToCloud, fullRestore, getSyncStatus } from "@/lib/syncService";
import { ArrowLeft, User, Mail, LogOut, RefreshCw, Download, Loader2, Trash2 } from "lucide-react";
import { db } from "@/lib/db";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, isLoading } = useAuthStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch {
      setMessage({ type: "error", text: "登出失败，请重试" });
    }
  };

  const handleBackup = async () => {
    if (!user) return;

    setIsSyncing(true);
    setMessage(null);

    try {
      const result = await backupAllToCloud(user.id);

      if (result.success) {
        setMessage({
          type: "success",
          text: `备份完成：已上传 ${result.uploaded.tasks} 个任务，${result.uploaded.projects} 个项目`,
        });
      } else {
        setMessage({ type: "error", text: "备份失败，请重试" });
      }
    } catch {
      setMessage({ type: "error", text: "备份失败，请检查网络连接" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;

    setIsRestoring(true);
    setMessage(null);

    try {
      const result = await fullRestore(user.id);

      if (result.success) {
        setMessage({
          type: "success",
          text: `数据恢复完成：${result.tasks} 个任务，${result.projects} 个项目`,
        });
      } else {
        setMessage({ type: "error", text: result.error || "恢复失败" });
      }
    } catch {
      setMessage({ type: "error", text: "恢复失败，请检查网络连接" });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClearLocalData = async () => {
    try {
      await db.tasks.clear();
      await db.projects.clear();
      setShowClearConfirm(false);
      setMessage({ type: "success", text: "本地数据已清除" });
    } catch {
      setMessage({ type: "error", text: "清除失败，请重试" });
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const syncStatus = getSyncStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <SyncIndicator showLabel />
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl bg-slate-800/50 p-6 backdrop-blur-sm">
          <h1 className="mb-6 text-xl font-semibold text-white">个人资料</h1>

          <div className="space-y-4">
            {/* Avatar & Name */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                <User className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white">
                  {user.user_metadata?.display_name || "用户"}
                </p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>

            {/* Email Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="h-12 border-slate-600 bg-slate-700/30 pl-10 text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Backup Section */}
        <div className="rounded-2xl bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">云端备份</h2>

          <div className="space-y-3">
            {/* Backup Status */}
            <div className="flex items-center justify-between rounded-lg bg-slate-700/30 p-3">
              <span className="text-sm text-slate-300">备份状态</span>
              <SyncIndicator showLabel />
            </div>

            {/* Last Backup */}
            {syncStatus.lastSyncAt && (
              <div className="flex items-center justify-between rounded-lg bg-slate-700/30 p-3">
                <span className="text-sm text-slate-300">上次备份</span>
                <span className="text-sm text-slate-400">
                  {syncStatus.lastSyncAt.toLocaleString("zh-CN")}
                </span>
              </div>
            )}

            {/* Sync Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={handleBackup}
                disabled={isSyncing || isRestoring}
                variant="outline"
                className="h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                立即备份
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isSyncing || isRestoring}
                    variant="outline"
                    className="h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {isRestoring ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    恢复数据
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>恢复云端数据</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作会清空并覆盖本地数据，然后从云端下载项目与任务。请确认你已经完成过云端备份。
                      如果云端没有数据，本地也会被清空。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isRestoring}>取消</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isRestoring}
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={handleRestore}
                    >
                      确认恢复
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-500/20 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-red-400">危险操作</h2>

          <div className="space-y-3">
            {/* Clear Local Data */}
            {!showClearConfirm ? (
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="outline"
                className="h-12 w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清除本地数据
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-400">确定要清除所有本地数据吗？此操作无法撤销。</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleClearLocalData}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  >
                    确认清除
                  </Button>
                  <Button
                    onClick={() => setShowClearConfirm(false)}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            {/* Sign Out */}
            <Button
              onClick={handleSignOut}
              disabled={isLoading}
              variant="outline"
              className="h-12 w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
