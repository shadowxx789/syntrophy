/**
 * Attachment utilities for email sending
 */

import type { SyntropyTask } from "@/types";
import { generateExcelBase64, getExcelFilename } from "./styledExport";

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

/**
 * Generate Excel attachment for email
 *
 * @param tasks Task list to export
 * @param projectName Project name for filename
 * @returns Attachment object ready for email sending
 */
export async function createExcelAttachment(
  tasks: SyntropyTask[],
  projectName: string
): Promise<EmailAttachment> {
  const base64Content = await generateExcelBase64(tasks, projectName);

  return {
    filename: getExcelFilename(projectName),
    content: base64Content,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate default email subject
 */
export function generateEmailSubject(projectName: string): string {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `[凝序] ${projectName} - 任务清单 (${today})`;
}

/**
 * Generate default email body
 */
export function generateEmailBody(
  projectName: string,
  taskCount: number
): string {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return `您好，

附件是「${projectName}」项目的任务清单，共 ${taskCount} 项任务。

导出时间：${today}

请查收。

---
此邮件由凝序 (Syntropy) 自动生成`;
}
