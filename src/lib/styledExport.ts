import ExcelJS from "exceljs";
import type { SyntropyTask } from "@/types";

/**
 * Column configuration for Excel export
 */
const COLUMNS = [
  { header: "ID", key: "id", width: 18, locked: true },
  { header: "内容", key: "content", width: 45 },
  { header: "PIC", key: "pic", width: 15 },
  { header: "开始日期", key: "startDate", width: 14 },
  { header: "截止日期", key: "endDate", width: 14 },
  { header: "完成日期", key: "completedDate", width: 14 },
  { header: "状态", key: "status", width: 12 },
  { header: "备注", key: "remark", width: 35 },
] as const;

/**
 * Status display mapping
 */
const STATUS_DISPLAY: Record<string, string> = {
  pending: "○ 待开始",
  in_progress: "◐ 进行中",
  completed: "✓ 已完成",
  delayed: "⚠ 滞后",
};

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_REGEX = /[\\/?*:[\]]/g;

function normalizeSheetName(name: string): string {
  const cleaned = name.replace(INVALID_SHEET_NAME_REGEX, "").trim();
  return cleaned || "Sheet";
}

function getUniqueSheetName(name: string, usedNames: Set<string>): string {
  const baseName = normalizeSheetName(name).slice(0, MAX_SHEET_NAME_LENGTH);
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  while (true) {
    const suffix = ` (${index})`;
    const maxBaseLength = MAX_SHEET_NAME_LENGTH - suffix.length;
    const candidate = `${baseName.slice(0, Math.max(1, maxBaseLength))}${suffix}`;
    if (!usedNames.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

function initializeWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Syntropy";
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}

function addTaskWorksheet(
  workbook: ExcelJS.Workbook,
  tasks: SyntropyTask[],
  sheetName: string
): ExcelJS.Worksheet {
  const activeTasks = tasks.filter((task) => !task.deletedAt);

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        state: "frozen",
        xSplit: 1, // Freeze first column (ID)
        ySplit: 1, // Freeze header row
      },
    ],
  });

  worksheet.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1a1a2e" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  activeTasks.forEach((task) => {
    const row = worksheet.addRow({
      id: task.id,
      content: task.content,
      pic: task.pic || "",
      startDate: task.startDate || "",
      endDate: task.endDate || "",
      completedDate: task.completedDate || "",
      status: STATUS_DISPLAY[task.status] || task.status,
      remark: task.remark || "",
    });

    // 已完成任务样式：删除线 + 灰色文字
    if (task.status === "completed") {
      const contentCell = row.getCell("content");
      contentCell.font = {
        strike: true,
        color: { argb: "FF9CA3AF" },
      };
    }

    // 滞后任务样式：淡红色背景
    if (task.status === "delayed") {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
      });
    }

    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell("id").alignment = { horizontal: "left" };
    row.getCell("content").alignment = { horizontal: "left", vertical: "top" };
    row.getCell("pic").alignment = { horizontal: "left" };
    row.getCell("startDate").alignment = { horizontal: "center" };
    row.getCell("endDate").alignment = { horizontal: "center" };
    row.getCell("completedDate").alignment = { horizontal: "center" };
    row.getCell("status").alignment = { horizontal: "center" };
    row.getCell("remark").alignment = { horizontal: "left", vertical: "top" };
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  return worksheet;
}

/**
 * Export tasks to styled Excel workbook using ExcelJS
 *
 * Features:
 * - Header row with bold styling and background color
 * - ID column frozen (locked in view)
 * - Auto-adjusted column widths
 * - Priority-based row coloring
 * - Proper date formatting
 *
 * @param tasks Task list to export
 * @param projectName Project name for sheet name and filename
 * @returns ExcelJS Workbook
 */
export function createStyledWorkbook(tasks: SyntropyTask[], projectName: string): ExcelJS.Workbook {
  const workbook = initializeWorkbook();
  const usedNames = new Set<string>();
  const sheetName = getUniqueSheetName(projectName, usedNames);
  usedNames.add(sheetName);
  addTaskWorksheet(workbook, tasks, sheetName);
  return workbook;
}

/**
 * Export multiple projects to a single workbook with multiple sheets
 */
export function createStyledWorkbookForProjects(
  projects: { projectName: string; tasks: SyntropyTask[] }[]
): ExcelJS.Workbook {
  const workbook = initializeWorkbook();
  const usedNames = new Set<string>();

  projects.forEach(({ projectName, tasks }) => {
    const sheetName = getUniqueSheetName(projectName, usedNames);
    usedNames.add(sheetName);
    addTaskWorksheet(workbook, tasks, sheetName);
  });

  return workbook;
}

function getTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  return `${date}_${time}`;
}

/**
 * Export tasks to styled Excel file and trigger download
 *
 * @param tasks Task list to export
 * @param projectName Project name for filename
 */
export async function exportStyledExcel(tasks: SyntropyTask[], projectName: string): Promise<void> {
  const workbook = createStyledWorkbook(tasks, projectName);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Create blob and trigger download
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getExcelFilename(projectName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export multiple projects to styled Excel file and trigger download
 */
export async function exportStyledExcelForProjects(
  projects: { projectName: string; tasks: SyntropyTask[] }[]
): Promise<void> {
  const workbook = createStyledWorkbookForProjects(projects);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const fileName = getExcelFilenameForProjects(projects.map((project) => project.projectName));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Excel as Base64 string (for email attachment)
 *
 * @param tasks Task list to export
 * @param projectName Project name for sheet name
 * @returns Base64 encoded Excel file
 */
export async function generateExcelBase64(
  tasks: SyntropyTask[],
  projectName: string
): Promise<string> {
  const workbook = createStyledWorkbook(tasks, projectName);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Generate Excel as Base64 string for multiple projects
 */
export async function generateExcelBase64ForProjects(
  projects: { projectName: string; tasks: SyntropyTask[] }[]
): Promise<string> {
  const workbook = createStyledWorkbookForProjects(projects);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Get Excel filename with timestamp
 */
export function getExcelFilename(projectName: string): string {
  return `${projectName}_${getTimestamp()}.xlsx`;
}

/**
 * Get Excel filename for multiple projects
 */
export function getExcelFilenameForProjects(projectNames: string[]): string {
  if (projectNames.length === 1) {
    return getExcelFilename(projectNames[0]);
  }
  const baseName = projectNames[0]?.trim() || "多项目";
  return `${baseName}_等${projectNames.length}个项目_${getTimestamp()}.xlsx`;
}
