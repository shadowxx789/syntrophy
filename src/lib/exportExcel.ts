import * as XLSX from "xlsx";
import type { SyntropyTask } from "@/types";

/**
 * 导出任务列表为 Excel 文件
 *
 * @param tasks 任务列表
 * @param projectName 项目名称 (用于文件名和 Sheet 名)
 */
export function exportToExcel(tasks: SyntropyTask[], projectName: string): void {
  // 转换为 Excel 行数据
  const rows = tasks.map((task) => ({
    ID: task.id,
    状态: task.status === "done" ? "✓ 已完成" : "○ 待办",
    内容: task.content,
    优先级: task.priority
      ? { high: "高", medium: "中", low: "低" }[task.priority]
      : "",
    开始日期: task.startDate || "",
    截止日期: task.endDate || "",
    创建时间: formatDateTime(task.createdAt),
    更新时间: formatDateTime(task.updatedAt),
  }));

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 16 }, // ID
    { wch: 10 }, // 状态
    { wch: 40 }, // 内容
    { wch: 8 }, // 优先级
    { wch: 12 }, // 开始日期
    { wch: 12 }, // 截止日期
    { wch: 18 }, // 创建时间
    { wch: 18 }, // 更新时间
  ];

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, projectName);

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `${projectName}_${timestamp}.xlsx`;

  // 触发下载
  XLSX.writeFile(workbook, fileName);
}

/**
 * 格式化日期时间
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
 * 将 Excel 文件解析为任务数据 (Phase 2 导入功能预留)
 *
 * @param file Excel 文件
 * @returns 解析后的任务列表
 */
export async function parseExcelFile(
  file: File
): Promise<Partial<SyntropyTask>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("文件读取失败"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 转换为 JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        // 映射回任务格式
        const tasks: Partial<SyntropyTask>[] = jsonData.map((row) => ({
          id: String(row["ID"] || ""),
          content: String(row["内容"] || ""),
          status:
            String(row["状态"]).includes("完成") ? "done" : "todo",
          priority: mapPriority(String(row["优先级"] || "")),
          startDate: parseDate(row["开始日期"]),
          endDate: parseDate(row["截止日期"]),
        }));

        resolve(tasks);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

/**
 * 映射优先级
 */
function mapPriority(value: string): "high" | "medium" | "low" | undefined {
  if (value === "高") return "high";
  if (value === "中") return "medium";
  if (value === "低") return "low";
  return undefined;
}

/**
 * 解析日期
 */
function parseDate(value: unknown): string | undefined {
  if (!value) return undefined;

  // 处理 Excel 日期数字
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }

  // 处理字符串日期
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return undefined;
}
