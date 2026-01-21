"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Download, Send, Trash2 } from "lucide-react";
import type { SyntropyTask } from "@/types";
import { MAX_SAVED_RECIPIENTS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuickTaskCard } from "@/components/QuickTaskCard";
import { QuickTaskEditModal } from "@/components/QuickTaskEditModal";
import { cn } from "@/lib/utils";
import {
  createExcelAttachment,
  isValidEmail,
  generateEmailSubject,
  generateEmailBody,
} from "@/lib/attachmentUtils";
import { exportStyledExcel } from "@/lib/styledExport";
import { sendEmail } from "@/app/actions/sendEmail";
import { generateTaskId, getOrCreateDeviceId } from "@/lib/generateId";
import { useSettingsStore } from "@/stores/useSettingsStore";

type PageState = "input" | "sending" | "success" | "error";

/**
 * 生成临时项目 ID
 */
function generateQuickProjectId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `QUICK-${timestamp}`;
}

export default function QuickModePage() {
  // 项目名称
  const [projectName, setProjectName] = useState("临时任务清单");

  // 批量输入文本
  const [batchText, setBatchText] = useState("");

  // 临时任务列表（不存 IndexedDB）
  const [tasks, setTasks] = useState<SyntropyTask[]>([]);

  // 编辑状态
  const [editingTask, setEditingTask] = useState<SyntropyTask | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 发送状态
  const [email, setEmail] = useState("");
  const [pageState, setPageState] = useState<PageState>("input");
  const [errorMessage, setErrorMessage] = useState("");

  // 常用收件人
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const { addSavedRecipient, deleteSavedRecipient, markRecipientUsed, getSavedRecipients } =
    useSettingsStore();
  const savedRecipients = getSavedRecipients();

  const emailValid = isValidEmail(email);
  const canSend = emailValid && tasks.length > 0 && projectName.trim();
  const canDownload = tasks.length > 0 && projectName.trim();

  /**
   * 批量添加任务
   */
  const handleBatchAdd = useCallback(async () => {
    const lines = batchText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    const deviceId = getOrCreateDeviceId();
    const now = new Date().toISOString();
    const projectId = generateQuickProjectId();

    const newTasks: SyntropyTask[] = await Promise.all(
      lines.map(async (content) => ({
        id: await generateTaskId(),
        projectId,
        content,
        status: "pending" as const,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: deviceId,
        updatedBy: deviceId,
      }))
    );

    setTasks((prev) => [...prev, ...newTasks]);
    setBatchText("");
  }, [batchText]);

  /**
   * 编辑任务
   */
  const handleEditTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
        setEditModalOpen(true);
      }
    },
    [tasks]
  );

  /**
   * 保存编辑后的任务
   */
  const handleSaveTask = useCallback((updatedTask: SyntropyTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, []);

  /**
   * 删除任务
   */
  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  /**
   * 选择常用收件人
   */
  const handleSelectRecipient = useCallback(
    (recipientId: string) => {
      const recipient = savedRecipients.find((r) => r.id === recipientId);
      if (recipient) {
        setEmail(recipient.email);
        setRecipientError(null);
        markRecipientUsed(recipient.id);
      }
    },
    [savedRecipients, markRecipientUsed]
  );

  /**
   * 保存为常用收件人
   */
  const handleSaveRecipient = useCallback(() => {
    setRecipientError(null);
    if (!isValidEmail(email)) {
      setRecipientError("请输入有效邮箱");
      return;
    }

    const result = addSavedRecipient({
      email: email.trim(),
      label: recipientLabel.trim() || undefined,
    });

    if (!result) {
      setRecipientError(`最多只能保存 ${MAX_SAVED_RECIPIENTS} 个常用收件人`);
      return;
    }

    setRecipientLabel("");
  }, [email, recipientLabel, addSavedRecipient]);

  /**
   * 仅下载 Excel
   */
  const handleDownload = async () => {
    if (!canDownload) return;

    try {
      await exportStyledExcel(tasks, projectName.trim());
    } catch (error) {
      console.error("导出 Excel 失败:", error);
      setErrorMessage(error instanceof Error ? error.message : "导出失败");
      setPageState("error");
    }
  };

  /**
   * 生成并发送邮件
   */
  const handleSend = async () => {
    if (!canSend) return;

    setPageState("sending");
    setErrorMessage("");

    try {
      const attachment = await createExcelAttachment(tasks, projectName.trim());

      const result = await sendEmail({
        to: email,
        subject: generateEmailSubject(projectName.trim()),
        body: generateEmailBody(projectName.trim(), tasks.length),
        attachment,
      });

      if (result.success) {
        // 标记收件人已使用
        const matchedRecipient = savedRecipients.find((r) => r.email === email.trim());
        if (matchedRecipient) {
          markRecipientUsed(matchedRecipient.id);
        }
        setPageState("success");
      } else {
        setPageState("error");
        setErrorMessage(result.error || "发送失败");
      }
    } catch (error) {
      setPageState("error");
      setErrorMessage(error instanceof Error ? error.message : "发送失败");
    }
  };

  /**
   * 重置所有状态
   */
  const handleReset = () => {
    setProjectName("临时任务清单");
    setBatchText("");
    setTasks([]);
    setEmail("");
    setPageState("input");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">闪电模式</h1>
                <p className="mt-0.5 text-sm text-white/80">快速创建任务清单，生成 Excel 并发送</p>
              </div>
            </div>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {pageState === "success" ? (
          /* 发送成功 */
          <div className="rounded-xl border bg-white p-8 text-center shadow-sm dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">发送成功！</h2>
            <p className="mt-2 text-muted-foreground">
              已将 {tasks.length} 条任务发送至 {email}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                创建新清单
              </Button>
              <Link href="/">
                <Button>返回主页</Button>
              </Link>
            </div>
          </div>
        ) : (
          /* 输入表单 */
          <div className="space-y-6">
            {/* 项目名称 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
              <label className="text-sm font-medium">项目名称</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="输入项目名称"
                className="mt-2"
                disabled={pageState === "sending"}
              />
            </div>

            {/* 批量输入 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">批量添加任务</label>
                <span className="text-xs text-muted-foreground">每行一个任务</span>
              </div>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="输入任务内容，每行一个...&#10;&#10;例如：&#10;采购办公用品&#10;联系供应商&#10;确认订单"
                rows={5}
                disabled={pageState === "sending"}
                className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={handleBatchAdd}
                disabled={!batchText.trim() || pageState === "sending"}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加到列表
              </Button>
            </div>

            {/* 任务列表 */}
            {tasks.length > 0 && (
              <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    任务列表
                    <span className="ml-2 text-muted-foreground">({tasks.length} 项)</span>
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => setTasks([])}
                    disabled={pageState === "sending"}
                  >
                    清空全部
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {tasks.map((task, index) => (
                    <QuickTaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  💡 点击任务可编辑详细信息（PIC、日期、备注等）
                </p>
              </div>
            )}

            {/* 收件人邮箱 */}
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
              <label className="text-sm font-medium">收件人邮箱</label>
              <div className="relative mt-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setRecipientError(null);
                  }}
                  placeholder="email@example.com"
                  disabled={pageState === "sending"}
                  className={cn(
                    "pr-10",
                    email && !emailValid && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValid ? (
                      <svg
                        className="h-5 w-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </span>
                )}
              </div>
              {email && !emailValid && (
                <p className="mt-1 text-xs text-red-500">请输入有效的邮箱地址</p>
              )}

              {/* 常用收件人列表 */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">常用收件人</label>
                  <span className="text-xs text-muted-foreground">
                    {savedRecipients.length}/{MAX_SAVED_RECIPIENTS}
                  </span>
                </div>
                {savedRecipients.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无常用收件人</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {savedRecipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSelectRecipient(recipient.id)}
                          disabled={pageState === "sending"}
                        >
                          {recipient.label
                            ? `${recipient.label} (${recipient.email})`
                            : recipient.email}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteSavedRecipient(recipient.id)}
                          disabled={pageState === "sending"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 保存为常用收件人 */}
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">保存为常用收件人</label>
                <div className="flex gap-2">
                  <Input
                    value={recipientLabel}
                    onChange={(e) => setRecipientLabel(e.target.value)}
                    placeholder="标签（可选）"
                    disabled={pageState === "sending"}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveRecipient}
                    disabled={!emailValid || pageState === "sending"}
                  >
                    保存
                  </Button>
                </div>
                {recipientError && <p className="text-xs text-destructive">{recipientError}</p>}
              </div>
            </div>

            {/* 错误信息 */}
            {pageState === "error" && errorMessage && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
                disabled={!canDownload || pageState === "sending"}
              >
                <Download className="mr-1 h-4 w-4" />
                仅下载 Excel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={handleSend}
                disabled={!canSend || pageState === "sending"}
              >
                {pageState === "sending" ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    发送中...
                  </span>
                ) : (
                  <>
                    <Send className="mr-1 h-4 w-4" />
                    生成并发送
                  </>
                )}
              </Button>
            </div>

            {/* 提示信息 */}
            <div className="rounded-xl border bg-blue-50 p-4 text-sm dark:bg-blue-950/30">
              <div className="flex gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-blue-800 dark:text-blue-200">
                  <p className="font-medium">关于闪电模式</p>
                  <p className="mt-1 text-blue-700 dark:text-blue-300">
                    闪电模式用于快速创建一次性任务清单。任务会生成带样式的 Excel
                    文件，可以直接下载或通过邮件发送。<strong>数据不会保存到本地</strong>。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 编辑弹窗 */}
      <QuickTaskEditModal
        task={editingTask}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleSaveTask}
      />
    </div>
  );
}
