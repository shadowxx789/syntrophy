import * as XLSX from "xlsx";
import type { TaskPriority, TaskStatus } from "@/types";

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

  /** 优先级 */
  priority?: TaskPriority;

  /** 开始日期 */
  startDate?: string;

  /** 截止日期 */
  endDate?: string;

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
  描述: "content",
  Content: "content",
  Task: "content",

  // 状态列
  状态: "status",
  Status: "status",

  // 优先级列
  优先级: "priority",
  Priority: "priority",

  // 日期列
  开始日期: "startDate",
  开始时间: "startDate",
  "Start Date": "startDate",
  截止日期: "endDate",
  截止时间: "endDate",
  结束日期: "endDate",
  "End Date": "endDate",
  "Due Date": "endDate",
};

/**
 * 解析 Excel 文件
 */
export async function parseExcelFile(file: File): Promise<ImportParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("文件读取失败"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 转换为 JSON（保留表头）
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          { header: 1 }
        );

        if (jsonData.length < 2) {
          resolve({
            tasks: [],
            errors: [{ row: 0, message: "Excel 文件为空或只有表头" }],
            sheetName,
          });
          return;
        }

        // 解析表头
        const headers = (jsonData[0] as unknown as unknown[]).map((h) => String(h ?? "").trim());
        const columnMap = mapColumns(headers as string[]);

        // 解析数据行
        const tasks: ImportedTask[] = [];
        const errors: Array<{ row: number; message: string }> = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown as unknown[];
          if (!row || (Array.isArray(row) && row.every((cell) => !cell))) continue; // 跳过空行

          try {
            const task = parseRow(row, columnMap, i + 1);
            if (task) {
              tasks.push(task);
            }
          } catch (error) {
            errors.push({
              row: i + 1,
              message: error instanceof Error ? error.message : "解析失败",
            });
          }
        }

        resolve({ tasks, errors, sheetName });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

/**
 * 映射列名到字段
 */
function mapColumns(
  headers: string[]
): Map<number, keyof ImportedTask> {
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
 * 解析单行数据
 */
function parseRow(
  row: unknown[],
  columnMap: Map<number, keyof ImportedTask>,
  rowNumber: number
): ImportedTask | null {
  const task: Partial<ImportedTask> = { rowNumber };

  columnMap.forEach((field, index) => {
    const value = row[index];
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

      case "priority":
        task.priority = parsePriority(String(value));
        break;

      case "startDate":
      case "endDate":
        task[field] = parseDate(value);
        break;
    }
  });

  // 验证必填字段
  if (!task.content) {
    throw new Error("任务内容不能为空");
  }

  return {
    content: task.content,
    status: task.status || "todo",
    id: task.id,
    priority: task.priority,
    startDate: task.startDate,
    endDate: task.endDate,
    rowNumber,
  };
}

/**
 * 解析状态
 */
function parseStatus(value: string): TaskStatus {
  const lower = value.toLowerCase().trim();

  if (
    lower.includes("完成") ||
    lower.includes("done") ||
    lower.includes("✓") ||
    lower.includes("√")
  ) {
    return "done";
  }

  return "todo";
}

/**
 * 解析优先级
 */
function parsePriority(value: string): TaskPriority | undefined {
  const lower = value.toLowerCase().trim();

  if (lower === "高" || lower === "high" || lower === "h") return "high";
  if (lower === "中" || lower === "medium" || lower === "m") return "medium";
  if (lower === "低" || lower === "low" || lower === "l") return "low";

  return undefined;
}

/**
 * 解析日期
 */
function parseDate(value: unknown): string | undefined {
  if (!value) return undefined;

  // 已经是 Date 对象
  if (value instanceof Date) {
    return formatDate(value);
  }

  // Excel 日期数字
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
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
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
