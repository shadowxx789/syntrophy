"use client";

import { useState } from "react";
import Link from "next/link";
import type { SyntropyTask } from "@/types";
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
import { generateTaskId } from "@/lib/generateId";

type PageState = "input" | "sending" | "success" | "error";

export default function QuickModePage() {
  const [projectName, setProjectName] = useState("Quick Task List");
  const [taskText, setTaskText] = useState("");
  const [email, setEmail] = useState("");
  const [pageState, setPageState] = useState<PageState>("input");
  const [errorMessage, setErrorMessage] = useState("");

  const emailValid = isValidEmail(email);
  const taskLines = taskText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const canSend = emailValid && taskLines.length > 0 && projectName.trim();

  const handleSend = async () => {
    if (!canSend) return;

    setPageState("sending");
    setErrorMessage("");

    try {
      // Create temporary task objects
      const now = new Date().toISOString();
      const tasks: SyntropyTask[] = await Promise.all(
        taskLines.map(async (line) => ({
          id: await generateTaskId(),
          projectId: "QUICK-MODE",
          content: line,
          status: "pending" as const,
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: "quick-mode",
          updatedBy: "quick-mode",
        }))
      );

      // Create Excel attachment
      const attachment = await createExcelAttachment(tasks, projectName);

      // Send email
      const result = await sendEmail({
        to: email,
        subject: generateEmailSubject(projectName),
        body: generateEmailBody(projectName, tasks.length),
        attachment,
      });

      if (result.success) {
        setPageState("success");
      } else {
        setPageState("error");
        setErrorMessage(result.error || "Failed to send email");
      }
    } catch (error) {
      setPageState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    }
  };

  const handleReset = () => {
    setProjectName("Quick Task List");
    setTaskText("");
    setEmail("");
    setPageState("input");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white">
        <div className="mx-auto max-w-xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Quick Mode</h1>
              <p className="mt-1 text-sm text-white/70">Generate and send task lists instantly</p>
            </div>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-xl px-4 py-8">
        {pageState === "success" ? (
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
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Email Sent Successfully!
            </h2>
            <p className="mt-2 text-muted-foreground">
              {taskLines.length} tasks have been sent to {email}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                Send Another
              </Button>
              <Link href="/">
                <Button>Back to App</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900">
            <div className="space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  disabled={pageState === "sending"}
                />
              </div>

              {/* Task Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tasks{" "}
                  {taskLines.length > 0 && (
                    <span className="text-muted-foreground">({taskLines.length} items)</span>
                  )}
                </label>
                <textarea
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="Enter tasks, one per line...&#10;&#10;Example:&#10;Complete project proposal&#10;Review client feedback&#10;Schedule team meeting"
                  rows={8}
                  disabled={pageState === "sending"}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Email</label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
              </div>

              {/* Error Message */}
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

              {/* Send Button */}
              <Button
                className="w-full"
                size="lg"
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
                    Generating & Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Generate & Send
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Info Card */}
        {pageState === "input" && (
          <div className="mt-6 rounded-xl border bg-blue-50 p-4 text-sm dark:bg-blue-950/30">
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
                <p className="font-medium">About Quick Mode</p>
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  Quick Mode generates a styled Excel file from your task list and sends it directly
                  via email. No data is saved locally.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
