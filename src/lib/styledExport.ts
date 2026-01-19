import ExcelJS from "exceljs";
import type { SyntropyTask } from "@/types";

/**
 * Column configuration for Excel export
 */
const COLUMNS = [
  { header: "ID", key: "id", width: 18, locked: true },
  { header: "状态", key: "status", width: 10 },
  { header: "内容", key: "content", width: 45 },
  { header: "优先级", key: "priority", width: 10 },
  { header: "开始日期", key: "startDate", width: 14 },
  { header: "截止日期", key: "endDate", width: 14 },
  { header: "创建时间", key: "createdAt", width: 20 },
  { header: "更新时间", key: "updatedAt", width: 20 },
] as const;

/**
 * Priority color mapping
 */
const PRIORITY_COLORS: Record<string, string> = {
  high: "FFFEE2E2", // Light red
  medium: "FFFEF3C7", // Light yellow
  low: "FFD1FAE5", // Light green
};

/**
 * Status display mapping
 */
const STATUS_DISPLAY: Record<string, string> = {
  done: "✓ 已完成",
  todo: "○ 待办",
};

/**
 * Priority display mapping
 */
const PRIORITY_DISPLAY: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

/**
 * Format ISO date time to localized string
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const activeTasks = tasks.filter((task) => !task.deletedAt);
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties
  workbook.creator = "Syntropy";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create worksheet
  const worksheet = workbook.addWorksheet(projectName, {
    views: [
      {
        state: "frozen",
        xSplit: 1, // Freeze first column (ID)
        ySplit: 1, // Freeze header row
      },
    ],
  });

  // Set columns
  worksheet.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1a1a2e" }, // Dark purple matching Syntropy theme
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Add data rows
  activeTasks.forEach((task) => {
    const row = worksheet.addRow({
      id: task.id,
      status: STATUS_DISPLAY[task.status] || task.status,
      content: task.content,
      priority: task.priority ? PRIORITY_DISPLAY[task.priority] : "",
      startDate: task.startDate || "",
      endDate: task.endDate || "",
      createdAt: formatDateTime(task.createdAt),
      updatedAt: formatDateTime(task.updatedAt),
    });

    // Apply priority-based row background
    if (task.priority && PRIORITY_COLORS[task.priority]) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: PRIORITY_COLORS[task.priority!] },
        };
      });
    }

    // Style done tasks with strikethrough
    if (task.status === "done") {
      const contentCell = row.getCell("content");
      contentCell.font = {
        strike: true,
        color: { argb: "FF9CA3AF" }, // Gray color
      };
    }

    // Align cells
    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell("id").alignment = { horizontal: "left" };
    row.getCell("status").alignment = { horizontal: "center" };
    row.getCell("priority").alignment = { horizontal: "center" };
    row.getCell("startDate").alignment = { horizontal: "center" };
    row.getCell("endDate").alignment = { horizontal: "center" };
    row.getCell("createdAt").alignment = { horizontal: "center" };
    row.getCell("updatedAt").alignment = { horizontal: "center" };
  });

  // Add borders to all cells
  worksheet.eachRow((row, _rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  // Auto-filter for header
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  return workbook;
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

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const timestamp = `${date}_${time}`;
  const fileName = `${projectName}_${timestamp}.xlsx`;

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

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Convert to Base64
  const base64 = Buffer.from(buffer).toString("base64");

  return base64;
}

/**
 * Get Excel filename with timestamp
 */
export function getExcelFilename(projectName: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const timestamp = `${date}_${time}`;
  return `${projectName}_${timestamp}.xlsx`;
}
