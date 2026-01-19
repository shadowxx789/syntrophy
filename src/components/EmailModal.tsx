"use client";

import { useState, useEffect } from "react";
import type { SyntropyTask } from "@/types";
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
import { cn } from "@/lib/utils";
import {
  createExcelAttachment,
  isValidEmail,
  generateEmailSubject,
  generateEmailBody,
} from "@/lib/attachmentUtils";
import { sendEmail } from "@/app/actions/sendEmail";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: SyntropyTask[];
  projectName: string;
}

type SendState = "idle" | "sending" | "success" | "error";

export function EmailModal({ open, onOpenChange, tasks, projectName }: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const activeTasks = tasks.filter((task) => !task.deletedAt);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSubject(generateEmailSubject(projectName));
      setBody(generateEmailBody(projectName, activeTasks.length));
      setSendState("idle");
      setErrorMessage("");
    }
  }, [open, projectName, activeTasks.length]);

  const emailValid = isValidEmail(email);
  const canSend = emailValid && subject.trim() && activeTasks.length > 0;

  const handleSend = async () => {
    if (!canSend) return;

    setSendState("sending");
    setErrorMessage("");

    try {
      // Create Excel attachment
      const attachment = await createExcelAttachment(activeTasks, projectName);

      // Send email
      const result = await sendEmail({
        to: email,
        subject,
        body,
        attachment,
      });

      if (result.success) {
        setSendState("success");
        // Auto close after 2 seconds
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
            Send {activeTasks.length} tasks from {projectName} as Excel attachment
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
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {projectName}_{new Date().toISOString().slice(0, 10)}.xlsx
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
