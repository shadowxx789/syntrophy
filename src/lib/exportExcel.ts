import * as XLSX from "xlsx";
import type { SyntropyTask } from "@/types";

/**
 * 导出任务列表为 Excel 文件
 *
 * @param tasks 任务列表
 * @param projectName 项目名称 (用于文件名和 Sheet 名)
 */
export function exportToExcel(tasks: SyntropyTask[], projectName: string): void {
  // 过滤掉已删除的任务
  const activeTasks = tasks.filter((t) => !t.deletedAt);

  // 转换为 Excel 行数据
  const rows = activeTasks.map((task) => ({
    ID: task.id,
    内容: task.content,
    PIC: task.pic || "",
    开始日期: task.startDate || "",
    截止日期: task.endDate || "",
    完成日期: task.completedDate || "",
    状态: mapStatusToDisplay(task.status),
    备注: task.remark || "",
  }));

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 16 }, // ID
    { wch: 40 }, // 内容
    { wch: 15 }, // PIC
    { wch: 12 }, // 开始日期
    { wch: 12 }, // 截止日期
    { wch: 12 }, // 完成日期
    { wch: 10 }, // 状态
    { wch: 30 }, // 备注
  ];

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, projectName);

  // 生成文件名（包含日期和时间）
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const timestamp = `${date}_${time}`;
  const fileName = `${projectName}_${timestamp}.xlsx`;

  // 触发下载
  XLSX.writeFile(workbook, fileName);
}

/**
 * 将状态转换为显示文本
 */
function mapStatusToDisplay(status: SyntropyTask["status"]): string {
  const statusMap = {
    pending: "○ 待开始",
    in_progress: "◐ 进行中",
    completed: "✓ 已完成",
    delayed: "⚠ 滞后",
  };
  return statusMap[status] || "";
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
export async function parseExcelFile(file: File): Promise<Partial<SyntropyTask>[]> {
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
          pic: String(row["PIC"] || "") || undefined,
          startDate: parseDate(row["开始日期"]),
          endDate: parseDate(row["截止日期"]),
          completedDate: parseDate(row["完成日期"]),
          status: parseStatus(String(row["状态"] || "")),
          remark: String(row["备注"] || "") || undefined,
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
 * 解析状态
 */
function parseStatus(value: string): SyntropyTask["status"] {
  const trimmedValue = value.trim();
  if (trimmedValue.includes("完成")) return "completed";
  if (trimmedValue.includes("进行中")) return "in_progress";
  if (trimmedValue.includes("滞后")) return "delayed";
  return "pending";
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
