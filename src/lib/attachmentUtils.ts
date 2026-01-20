/**
 * Attachment utilities for email sending
 */

import type { SyntropyTask } from "@/types";
import {
  generateExcelBase64,
  generateExcelBase64ForProjects,
  getExcelFilename,
  getExcelFilenameForProjects,
} from "./styledExport";

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

export interface ProjectAttachmentInput {
  projectName: string;
  tasks: SyntropyTask[];
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
  const activeTasks = tasks.filter((task) => !task.deletedAt);
  const base64Content = await generateExcelBase64(activeTasks, projectName);

  return {
    filename: getExcelFilename(projectName),
    content: base64Content,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

export async function createExcelAttachmentForProjects(
  projects: ProjectAttachmentInput[]
): Promise<EmailAttachment> {
  const normalized = projects.map((project) => ({
    projectName: project.projectName,
    tasks: project.tasks.filter((task) => !task.deletedAt),
  }));
  const base64Content = await generateExcelBase64ForProjects(normalized);

  return {
    filename: getExcelFilenameForProjects(normalized.map((project) => project.projectName)),
    content: base64Content,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

export function generateEmailSubjectForProjects(projectNames: string[]): string {
  if (projectNames.length === 1) {
    return generateEmailSubject(projectNames[0]);
  }
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const baseName = projectNames[0] || "多项目";
  return `[凝序] ${baseName} 等${projectNames.length}个项目 - 任务清单 (${today})`;
}

/**
 * Generate default email body
 */
export function generateEmailBody(projectName: string, taskCount: number): string {
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

export function generateEmailBodyForProjects(projectNames: string[], taskCount: number): string {
  if (projectNames.length === 1) {
    return generateEmailBody(projectNames[0], taskCount);
  }

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const list = projectNames.map((name) => `- ${name}`).join("\n");

  return `您好，

附件包含以下 ${projectNames.length} 个项目的任务清单，共 ${taskCount} 项任务：
${list}

导出时间：${today}

请查收。

---
此邮件由凝序 (Syntropy) 自动生成`;
}
