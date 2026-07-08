import ExcelJS from "exceljs";
import type { TaskStatus } from "@/types";

/**
 * 单个 Sheet 的解析结果
 */
export interface SheetParseResult {
  /** Sheet 名称 */
  sheetName: string;

  /** 成功解析的任务 */
  tasks: ImportedTask[];

  /** 解析错误 */
  errors: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * 整个工作簿的解析结果
 */
export interface WorkbookParseResult {
  /** 所有 Sheet 的解析结果 */
  sheets: SheetParseResult[];

  /** 文件名 */
  fileName: string;
}

/**
 * Excel 导入结果
 */
export interface ImportedTask {
  /** 原始任务 ID（如果存在） */
  id?: string;

  /** 任务内容 */
  content: string;

  /** 状态 */
  status: TaskStatus;

  /** 负责人 (PIC) */
  pic?: string;

  /** 开始日期 */
  startDate?: string;

  /** 截止日期 */
  endDate?: string;

  /** 完成日期 */
  completedDate?: string;

  /** 备注 */
  remark?: string;

  /** 原始行号（用于错误报告） */
  rowNumber: number;
}

/**
 * 导入解析结果
 */
export interface ImportParseResult {
  /** 成功解析的任务 */
  tasks: ImportedTask[];

  /** 解析错误 */
  errors: Array<{
    row: number;
    message: string;
  }>;

  /** Sheet 名称 */
  sheetName: string;
}

/**
 * 列名映射配置
 */
const COLUMN_MAPPING: Record<string, keyof ImportedTask | null> = {
  // ID 列
  ID: "id",
  id: "id",
  任务ID: "id",
  "任务 ID": "id",

  // 内容列
  内容: "content",
  任务内容: "content",
  任务: "content",
  Content: "content",
  Task: "content",

  // PIC 列
  PIC: "pic",
  pic: "pic",
  负责人: "pic",
  责任人: "pic",
  Owner: "pic",

  // 状态列
  状态: "status",
  Status: "status",

  // 日期列
  开始日期: "startDate",
  开始时间: "startDate",
  "Start Date": "startDate",
  截止日期: "endDate",
  截止时间: "endDate",
  结束日期: "endDate",
  "End Date": "endDate",
  "Due Date": "endDate",
  完成日期: "completedDate",
  完成时间: "completedDate",
  "Complete Date": "completedDate",
  "Completed Date": "completedDate",

  // 备注列
  备注: "remark",
  备注说明: "remark",
  说明: "remark",
  Remark: "remark",
  Notes: "remark",
  描述: "remark",
};

/**
 * 将 ArrayBuffer 转为 ExcelJS Workbook（内部公共逻辑）
 */
async function readWorkbook(file: File): Promise<ExcelJS.Workbook> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return workbook;
}

/**
 * 映射列名到字段
 */
function mapColumns(headers: string[]): Map<number, keyof ImportedTask> {
  const map = new Map<number, keyof ImportedTask>();

  headers.forEach((header, index) => {
    const field = COLUMN_MAPPING[header];
    if (field) {
      map.set(index, field);
    }
  });

  return map;
}

/**
 * 从 ExcelJS Row 提取列名表头
 */
function extractHeaders(worksheet: ExcelJS.Worksheet): string[] {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  // 实际列数以 worksheet.columnCount 为准
  for (let col = 1; col <= worksheet.columnCount; col++) {
    const cell = headerRow.getCell(col);
    headers.push(String(cell.value ?? "").trim());
  }

  return headers;
}

/**
 * 解析单行数据
 */
function parseRow(
  row: ExcelJS.Row,
  columnMap: Map<number, keyof ImportedTask>,
  rowNumber: number
): ImportedTask | null {
  const task: Partial<ImportedTask> = { rowNumber };

  columnMap.forEach((field, index) => {
    // columnMap 以 0-based 索引存储，ExcelJS cell 以 1-based
    const cell = row.getCell(index + 1);
    const value = cell.value;

    if (value === undefined || value === null || value === "") return;

    switch (field) {
      case "id":
        task.id = String(value).trim();
        break;

      case "content":
        task.content = String(value).trim();
        break;

      case "status":
        task.status = parseStatus(String(value));
        break;

      case "pic":
        task.pic = String(value).trim();
        break;

      case "startDate":
      case "endDate":
      case "completedDate":
        task[field] = parseDate(value);
        break;

      case "remark":
        task.remark = String(value).trim();
        break;
    }
  });

  // 验证必填字段
  if (!task.content) {
    throw new Error("任务内容不能为空");
  }

  return {
    content: task.content,
    status: task.status || "pending",
    id: task.id,
    pic: task.pic,
    startDate: task.startDate,
    endDate: task.endDate,
    completedDate: task.completedDate,
    remark: task.remark,
    rowNumber,
  };
}

/**
 * 判断行是否全为空
 */
function isRowEmpty(row: ExcelJS.Row, columnCount: number): boolean {
  for (let col = 1; col <= columnCount; col++) {
    const value = row.getCell(col).value;
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return false;
    }
  }
  return true;
}

/**
 * 解析单个 Sheet（基于 ExcelJS）
 */
function parseSheet(worksheet: ExcelJS.Worksheet, sheetName: string): SheetParseResult {
  if (worksheet.rowCount < 2) {
    return {
      sheetName,
      tasks: [],
      errors: [{ row: 0, message: "Sheet 为空或只有表头" }],
    };
  }

  const headers = extractHeaders(worksheet);
  const columnMap = mapColumns(headers);
  const columnCount = worksheet.columnCount;

  const tasks: ImportedTask[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  // 从第 2 行开始（第 1 行是表头）
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);

    if (isRowEmpty(row, columnCount)) continue;

    try {
      const task = parseRow(row, columnMap, rowNum);
      if (task) {
        tasks.push(task);
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : "解析失败",
      });
    }
  }

  return { sheetName, tasks, errors };
}

/**
 * 解析状态
 */
function parseStatus(value: string): TaskStatus {
  const trimmed = value.trim();

  if (
    trimmed.includes("完成") ||
    trimmed.includes("done") ||
    trimmed.includes("✓") ||
    trimmed.includes("√")
  ) {
    return "completed";
  }

  if (trimmed.includes("进行中") || trimmed.includes("in progress") || trimmed.includes("◐")) {
    return "in_progress";
  }

  if (trimmed.includes("滞后") || trimmed.includes("delayed") || trimmed.includes("⚠")) {
    return "delayed";
  }

  return "pending";
}

/**
 * 解析日期 — ExcelJS 的 cell.value 在日期列返回 Date 对象
 */
function parseDate(value: unknown): string | undefined {
  if (!value) return undefined;

  // 已经是 Date 对象（ExcelJS 对日期 cell 默认返回 Date）
  if (value instanceof Date) {
    return formatDate(value);
  }

  // Excel 日期数字 — ExcelJS 一般已转 Date，但兜底处理
  if (typeof value === "number") {
    const date = excelSerialToDate(value);
    return formatDate(date);
  }

  // 字符串日期
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // 尝试常见格式
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }

    // YYYY-MM-DD 格式
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }
  }

  return undefined;
}

/**
 * Excel 序列号转 Date（兜底用，ExcelJS 通常已经自动处理）
 * epoch: 1900-01-01 + 序列号 - 1 天（Excel 1900 闰年 bug）
 */
function excelSerialToDate(serial: number): Date {
  // Excel 1900 闰年 bug：把 1900 当闰年，所以序列号 > 60 要减 1
  const utcDays = serial > 60 ? serial - 1 : serial;
  // Excel epoch: 1899-12-30
  const utcMs = Math.round((utcDays - 25569) * 86400 * 1000);
  return new Date(utcMs);
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================================================
// 公共 API
// ============================================================================

/**
 * 解析单个 Sheet 的 Excel 文件（只读第一个 Sheet）
 */
export async function parseExcelFile(file: File): Promise<ImportParseResult> {
  const workbook = await readWorkbook(file);
  const firstSheetName = workbook.worksheets[0]?.name ?? "";
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet || worksheet.rowCount < 2) {
    return {
      tasks: [],
      errors: [{ row: 0, message: "Excel 文件为空或只有表头" }],
      sheetName: firstSheetName,
    };
  }

  const result = parseSheet(worksheet, firstSheetName);
  return { tasks: result.tasks, errors: result.errors, sheetName: result.sheetName };
}

/**
 * 解析整个 Excel 工作簿（所有 Sheet）
 */
export async function parseExcelWorkbook(file: File): Promise<WorkbookParseResult> {
  const workbook = await readWorkbook(file);
  const sheets: SheetParseResult[] = [];

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    sheets.push(parseSheet(worksheet, sheetName));
  });

  return { sheets, fileName: file.name };
}