"use client";

import { useState, useEffect } from "react";
import type { SyntropyTask, SyntropyProject } from "@/types";
import { MAX_SAVED_RECIPIENTS } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  createExcelAttachmentForProjects,
  isValidEmail,
  generateEmailSubjectForProjects,
  generateEmailBodyForProjects,
} from "@/lib/attachmentUtils";
import { sendEmail } from "@/app/actions/sendEmail";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { db } from "@/lib/db";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: SyntropyTask[];
  projectName: string;
  projects: SyntropyProject[];
  currentProjectId: string;
}

type SendState = "idle" | "sending" | "success" | "error";

export function EmailModal({
  open,
  onOpenChange,
  tasks,
  projectName,
  projects,
  currentProjectId,
}: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [defaultSubject, setDefaultSubject] = useState("");
  const [defaultBody, setDefaultBody] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([currentProjectId]);
  const [selectedTaskCount, setSelectedTaskCount] = useState(0);
  const [projectTasks, setProjectTasks] = useState<
    { projectId: string; projectName: string; tasks: SyntropyTask[] }[]
  >([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const activeTasks = tasks.filter((task) => !task.deletedAt);

  const { addSavedRecipient, deleteSavedRecipient, markRecipientUsed, getSavedRecipients } =
    useSettingsStore();
  const savedRecipients = getSavedRecipients();

  const selectedProjects = projects.filter((project) => selectedProjectIds.includes(project.id));
  const selectedProjectNames = selectedProjects.map((project) => project.name);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedProjectIds([currentProjectId]);
      setRecipientLabel("");
      const initialSubject = generateEmailSubjectForProjects([projectName]);
      const initialBody = generateEmailBodyForProjects([projectName], activeTasks.length);
      setDefaultSubject(initialSubject);
      setDefaultBody(initialBody);
      setSubject(initialSubject);
      setBody(initialBody);
      setSendState("idle");
      setErrorMessage("");
      setRecipientError(null);
    }
  }, [open, currentProjectId, projectName, activeTasks.length]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadProjectTasks() {
      if (selectedProjectIds.length === 0) {
        setProjectTasks([]);
        setSelectedTaskCount(0);
        return;
      }

      setIsLoadingProjects(true);
      try {
        const results = await Promise.all(
          selectedProjectIds.map(async (projectId) => {
            const project = projects.find((item) => item.id === projectId);
            const tasksForProject = await db.getActiveTasks(projectId);
            return {
              projectId,
              projectName: project?.name || "项目",
              tasks: tasksForProject,
            };
          })
        );

        if (!cancelled) {
          setProjectTasks(results);
          setSelectedTaskCount(results.reduce((sum, item) => sum + item.tasks.length, 0));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载项目任务失败:", error);
          setProjectTasks([]);
          setSelectedTaskCount(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProjects(false);
        }
      }
    }

    loadProjectTasks();

    return () => {
      cancelled = true;
    };
  }, [open, selectedProjectIds, projects]);

  useEffect(() => {
    if (!open) return;
    const names = selectedProjectNames.length > 0 ? selectedProjectNames : [projectName];
    const nextSubject = generateEmailSubjectForProjects(names);
    const nextBody = generateEmailBodyForProjects(names, selectedTaskCount);
    setDefaultSubject(nextSubject);
    setDefaultBody(nextBody);
    setSubject((prev) => (prev === defaultSubject ? nextSubject : prev));
    setBody((prev) => (prev === defaultBody ? nextBody : prev));
  }, [open, selectedProjectNames, selectedTaskCount, projectName, defaultSubject, defaultBody]);

  const emailValid = isValidEmail(email);
  const canSend =
    emailValid &&
    subject.trim() &&
    selectedTaskCount > 0 &&
    selectedProjectIds.length > 0 &&
    !isLoadingProjects;

  const handleSend = async () => {
    if (!canSend) return;

    setSendState("sending");
    setErrorMessage("");

    try {
      const attachmentProjects = projectTasks.length
        ? projectTasks
        : [
            {
              projectId: currentProjectId,
              projectName,
              tasks: activeTasks,
            },
          ];

      const attachment = await createExcelAttachmentForProjects(
        attachmentProjects.map((item) => ({
          projectName: item.projectName,
          tasks: item.tasks,
        }))
      );

      const result = await sendEmail({
        to: email,
        subject,
        body,
        attachment,
      });

      if (result.success) {
        const matchedRecipient = savedRecipients.find((item) => item.email === email.trim());
        if (matchedRecipient) {
          markRecipientUsed(matchedRecipient.id);
        }

        setSendState("success");
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        setSendState("error");
        setErrorMessage(result.error || "Failed to send email");
      }
    } catch (error) {
      setSendState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    }
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSelectRecipient = (recipientId: string) => {
    const recipient = savedRecipients.find((item) => item.id === recipientId);
    if (!recipient) return;
    setEmail(recipient.email);
    setRecipientLabel(recipient.label || "");
    setRecipientError(null);
    markRecipientUsed(recipient.id);
  };

  const handleSaveRecipient = () => {
    setRecipientError(null);
    if (!emailValid) {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Send via Email
          </DialogTitle>
          <DialogDescription>
            Send {selectedTaskCount} tasks from{" "}
            {selectedProjectNames.length > 0
              ? selectedProjectNames.join(", ")
              : "selected projects"}{" "}
            as Excel attachment
          </DialogDescription>
        </DialogHeader>

        {sendState === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
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
            <h3 className="text-lg font-medium text-green-600 dark:text-green-400">Email Sent!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The task list has been sent to {email}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">选择项目</label>
                <span className="text-xs text-muted-foreground">
                  已选 {selectedProjectIds.length} 个项目
                </span>
              </div>
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                {projects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedProjectIds.includes(project.id)}
                      onCheckedChange={() => handleToggleProject(project.id)}
                    />
                    <span className="flex-1 truncate">{project.name}</span>
                    {project.id === currentProjectId && (
                      <span className="text-xs text-muted-foreground">当前</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoadingProjects ? "正在加载任务..." : `共 ${selectedTaskCount} 条任务`}
              </p>
              {selectedProjectIds.length === 0 && (
                <p className="text-xs text-destructive">请至少选择一个项目</p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setRecipientError(null);
                  }}
                  placeholder="email@example.com"
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
              {email && !emailValid && <p className="text-xs text-red-500">Invalid email format</p>}
            </div>

            {/* Saved Recipients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">常用收件人</label>
                <span className="text-xs text-muted-foreground">
                  {savedRecipients.length}/{MAX_SAVED_RECIPIENTS}
                </span>
              </div>
              {savedRecipients.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无常用收件人</p>
              ) : (
                <div className="space-y-2">
                  {savedRecipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-start"
                        onClick={() => handleSelectRecipient(recipient.id)}
                      >
                        {recipient.label
                          ? `${recipient.label} (${recipient.email})`
                          : recipient.email}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavedRecipient(recipient.id)}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Recipient */}
            <div className="space-y-2">
              <label className="text-sm font-medium">保存为常用收件人</label>
              <div className="flex gap-2">
                <Input
                  value={recipientLabel}
                  onChange={(e) => setRecipientLabel(e.target.value)}
                  placeholder="标签（可选）"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveRecipient}
                  disabled={!emailValid}
                >
                  保存
                </Button>
              </div>
              {recipientError && <p className="text-xs text-destructive">{recipientError}</p>}
            </div>

            {/* Subject Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            {/* Body Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email message..."
                rows={5}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Attachment Info */}
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <svg
                className="h-4 w-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span>
                {selectedProjectNames.length === 1
                  ? selectedProjectNames[0]
                  : `${selectedProjectNames[0] || "多项目"}等${selectedProjectNames.length}个项目`}
                _{new Date().toISOString().slice(0, 10)}.xlsx
              </span>
            </div>

            {/* Error Message */}
            {sendState === "error" && errorMessage && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {sendState !== "success" && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendState === "sending"}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!canSend || sendState === "sending"}
              className="min-w-[100px]"
            >
              {sendState === "sending" ? (
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
                  Sending...
                </span>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
