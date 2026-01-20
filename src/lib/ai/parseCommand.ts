/**
 * 指令解析逻辑
 * 将自然语言转换为结构化任务操作
 */

import type { ParsedCommand, AIAction, SyntropyTask, CustomPromptConfig } from "@/types";
import { callAI, type AIServiceConfig } from "./service";
import {
  generateSystemPrompt,
  generateUserPrompt,
  generateContextPrompt,
  getActivePrompts,
} from "./prompts";

/**
 * AI 解析结果原始格式
 */
interface AIParseResult {
  action: string;
  confidence: number;
  task?: {
    content?: string;
    startDate?: string | null;
    endDate?: string | null;
    status?: string | null;
    pic?: string | null;
    remark?: string | null;
  };
  targetDescription?: string;
  reasoning?: string;
}

/**
 * 解析用户指令
 *
 * @param input 用户输入的自然语言
 * @param config AI 服务配置
 * @param existingTasks 现有任务列表（用于 UPDATE/DELETE 上下文）
 * @param customPrompts 自定义提示词配置
 * @returns 解析后的结构化命令
 */
export async function parseCommand(
  input: string,
  config: AIServiceConfig,
  existingTasks?: Pick<SyntropyTask, "id" | "content">[],
  customPrompts?: CustomPromptConfig
): Promise<ParsedCommand> {
  const trimmedInput = input.trim();

  // 空输入快速返回
  if (!trimmedInput) {
    return {
      action: "UNKNOWN",
      confidence: 0,
      rawInput: input,
    };
  }

  // 简单指令快速匹配（不调用 AI）
  const quickMatch = tryQuickMatch(trimmedInput);
  if (quickMatch) {
    return quickMatch;
  }

  // 调用 AI 解析
  try {
    // 获取当前生效的提示词模板
    const prompts = getActivePrompts(customPrompts);

    const systemPrompt = generateSystemPrompt(prompts.systemPrompt);
    const userPrompt = existingTasks?.length
      ? generateContextPrompt(trimmedInput, existingTasks, prompts.contextPromptTemplate)
      : generateUserPrompt(trimmedInput, prompts.userPromptTemplate);

    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      config
    );

    // 解析 JSON 响应
    const result = parseAIResponse(response.content);

    return normalizeResult(result, trimmedInput);
  } catch (error) {
    console.error("AI 解析失败:", error);

    // 降级处理：作为简单添加任务
    return {
      action: "ADD",
      confidence: 0.5,
      task: { content: trimmedInput },
      rawInput: input,
    };
  }
}

/**
 * 快速匹配简单指令（不需要 AI）
 */
function tryQuickMatch(input: string): ParsedCommand | null {
  // 删除指令
  const deleteMatch = input.match(/^(删除|移除|去掉)\s*(.+)$/);
  if (deleteMatch) {
    return {
      action: "DELETE",
      confidence: 0.9,
      targetId: deleteMatch[2]?.trim() || undefined,
      rawInput: input,
    };
  }

  // 完成指令
  const completeMatch = input.match(/^(完成|做完了?|标记完成)\s*(.*)$/);
  if (completeMatch) {
    return {
      action: "UPDATE",
      confidence: 0.9,
      task: { status: "completed" },
      rawInput: input,
    };
  }

  // 简单添加（无复杂日期/优先级）
  // 这里不做快速匹配，让 AI 处理以提取可能的日期

  return null;
}

/**
 * 解析 AI JSON 响应
 */
function parseAIResponse(content: string): AIParseResult {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // 尝试提取花括号内容
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]);
    }

    throw new Error("无法解析 AI 响应");
  }
}

/**
 * 规范化解析结果
 */
function normalizeResult(result: AIParseResult, rawInput: string): ParsedCommand {
  // 规范化 action
  const actionMap: Record<string, AIAction> = {
    ADD: "ADD",
    CREATE: "ADD",
    UPDATE: "UPDATE",
    MODIFY: "UPDATE",
    EDIT: "UPDATE",
    COMPLETE: "UPDATE",
    DELETE: "DELETE",
    REMOVE: "DELETE",
    UNKNOWN: "UNKNOWN",
  };

  const action = actionMap[result.action?.toUpperCase()] || "UNKNOWN";
  const normalizedStatus = normalizeStatus(result.task?.status || undefined);

  // 构建结果
  const parsed: ParsedCommand = {
    action,
    confidence: Math.min(1, Math.max(0, result.confidence || 0)),
    rawInput,
  };

  // 添加任务信息
  if (result.task) {
    parsed.task = {
      content: result.task.content || rawInput,
      startDate: result.task.startDate || undefined,
      endDate: result.task.endDate || undefined,
      status: normalizedStatus,
      pic: result.task.pic || undefined,
      remark: result.task.remark || undefined,
    };

    // COMPLETE 动作特殊处理
    if (result.action?.toUpperCase() === "COMPLETE") {
      parsed.task.status = "completed";
    }
  }

  // 添加目标描述
  if (result.targetDescription) {
    parsed.targetId = result.targetDescription;
  }

  return parsed;
}

function normalizeStatus(value?: string | null): SyntropyTask["status"] | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();

  if (normalized.includes("completed") || normalized.includes("done") || normalized.includes("完成")) {
    return "completed";
  }
  if (
    normalized.includes("in_progress") ||
    normalized.includes("in progress") ||
    normalized.includes("进行中")
  ) {
    return "in_progress";
  }
  if (normalized.includes("delayed") || normalized.includes("滞后") || normalized.includes("延期")) {
    return "delayed";
  }
  if (normalized.includes("pending") || normalized.includes("todo") || normalized.includes("待")) {
    return "pending";
  }
  return undefined;
}

/**
 * 查找匹配的任务（用于 UPDATE/DELETE）
 */
export function findMatchingTask(description: string, tasks: SyntropyTask[]): SyntropyTask | null {
  if (!description || tasks.length === 0) return null;

  const lowerDesc = description.toLowerCase();

  // 精确 ID 匹配
  const idMatch = tasks.find(
    (t) => t.id.toLowerCase() === lowerDesc || lowerDesc.includes(t.id.toLowerCase())
  );
  if (idMatch) return idMatch;

  // 内容模糊匹配
  const contentMatch = tasks.find(
    (t) =>
      t.content.toLowerCase().includes(lowerDesc) || lowerDesc.includes(t.content.toLowerCase())
  );
  if (contentMatch) return contentMatch;

  // 序号匹配（"第一个"、"第1个"）
  const orderMatch = description.match(/第?(\d+|一|二|三|四|五)/);
  if (orderMatch) {
    const numMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
    };
    const index = numMap[orderMatch[1]] || parseInt(orderMatch[1]) || 0;
    if (index > 0 && index <= tasks.length) {
      return tasks[index - 1];
    }
  }

  return null;
}

export type TaskMatchReason = "id" | "exact" | "contains" | "ordinal";

export interface TaskMatchCandidate {
  task: SyntropyTask;
  score: number;
  reason: TaskMatchReason;
}

export interface TaskMatchResult {
  candidates: TaskMatchCandidate[];
  best?: TaskMatchCandidate;
  isAmbiguous: boolean;
}

const MATCH_SCORE_THRESHOLD = 0.95; // 只有精确ID匹配才跳过弹窗
const MATCH_SCORE_DELTA = 0.08;
const MIN_CONTENT_QUERY_LENGTH = 2;

export function findTaskCandidates(description: string, tasks: SyntropyTask[]): TaskMatchResult {
  // 先过滤掉已删除的任务（双重保险）
  const activeTasks = tasks.filter((t) => !t.deletedAt);

  if (!description || activeTasks.length === 0) {
    return { candidates: [], isAmbiguous: true };
  }

  const lowerDesc = description.trim().toLowerCase();
  if (!lowerDesc) {
    return { candidates: [], isAmbiguous: true };
  }

  const candidates: TaskMatchCandidate[] = [];

  const addCandidate = (task: SyntropyTask, score: number, reason: TaskMatchReason) => {
    const existing = candidates.find((c) => c.task.id === task.id);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      return;
    }
    candidates.push({ task, score, reason });
  };

  // 精确 ID 匹配
  for (const task of activeTasks) {
    const id = task.id.toLowerCase();
    if (lowerDesc === id || lowerDesc.includes(id)) {
      addCandidate(task, 1, "id");
    }
  }

  // 内容匹配（避免过短关键词误匹配）
  if (lowerDesc.length >= MIN_CONTENT_QUERY_LENGTH) {
    for (const task of activeTasks) {
      const content = task.content.toLowerCase();

      if (content === lowerDesc) {
        addCandidate(task, 0.92, "exact");
        continue;
      }

      if (content.includes(lowerDesc) || lowerDesc.includes(content)) {
        const ratio = Math.min(1, lowerDesc.length / Math.max(1, content.length));
        addCandidate(task, 0.7 + ratio * 0.2, "contains");
      }
    }
  }

  // 序号匹配（"第一个"、"第1个"）
  const orderMatch = description.match(/第?(\d+|一|二|三|四|五)/);
  if (orderMatch) {
    const numMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
    };
    const index = numMap[orderMatch[1]] || parseInt(orderMatch[1]) || 0;
    if (index > 0 && index <= activeTasks.length) {
      addCandidate(activeTasks[index - 1], 0.85, "ordinal");
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const second = candidates[1];

  // 只有精确ID匹配（score=1）且无其他候选时才跳过弹窗
  const hasExactMatch = !!best && best.score >= MATCH_SCORE_THRESHOLD;
  const hasMultipleCandidates = candidates.length > 1;
  const scoresAreTooClose = !!second && best.score - second.score < MATCH_SCORE_DELTA;

  // 更宽松的判断：多个候选 或 非精确匹配 都显示弹窗
  const isAmbiguous = !best || !hasExactMatch || hasMultipleCandidates || scoresAreTooClose;

  return { candidates, best, isAmbiguous };
}
