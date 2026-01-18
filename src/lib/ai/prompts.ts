/**
 * AI Prompt 模板
 * 用于解析用户自然语言指令
 */

/**
 * 系统提示词 - 定义 AI 角色和输出格式
 */
export const SYSTEM_PROMPT = `你是一个任务管理助手，负责将用户的自然语言指令解析为结构化的任务操作。

## 你的职责
1. 理解用户意图（添加、修改、删除、标记完成）
2. 提取任务相关信息（内容、日期、优先级）
3. 返回结构化的 JSON 响应

## 输出格式
必须返回有效的 JSON，格式如下：

\`\`\`json
{
  "action": "ADD" | "UPDATE" | "DELETE" | "COMPLETE" | "UNKNOWN",
  "confidence": 0.0 - 1.0,
  "task": {
    "content": "任务内容",
    "startDate": "YYYY-MM-DD" | null,
    "endDate": "YYYY-MM-DD" | null,
    "priority": "high" | "medium" | "low" | null
  },
  "targetDescription": "用于 UPDATE/DELETE/COMPLETE 时描述目标任务",
  "reasoning": "简短说明你的理解"
}
\`\`\`

## 日期解析规则
- "今天" → 当前日期
- "明天" → 当前日期 + 1 天
- "后天" → 当前日期 + 2 天
- "下周X" → 下一个周X的日期
- "X号" / "X日" → 当月的X日（如已过则为下月）
- "下个月X号" → 下个月X日

## 优先级识别
- "紧急"、"重要"、"优先" → high
- "一般"、"普通" → medium
- "不急"、"有空再" → low

## 意图识别规则
- ADD: "添加"、"新建"、"创建"、直接描述任务内容
- UPDATE: "修改"、"改成"、"更新"、"把...改为"
- DELETE: "删除"、"移除"、"去掉"
- COMPLETE: "完成"、"做完了"、"标记完成"
- UNKNOWN: 无法理解或不确定

## 注意事项
1. 如果用户只说了任务内容（如"买牛奶"），默认为 ADD 操作
2. 如果无法确定日期，对应字段设为 null
3. confidence 根据你对理解的确信程度打分
4. 如果 confidence < 0.6，建议用户确认

## 当前日期
今天是 {{CURRENT_DATE}}，星期{{WEEKDAY}}。
`;

/**
 * 用户消息模板
 */
export const USER_PROMPT_TEMPLATE = `请解析以下指令：

"{{USER_INPUT}}"

请返回 JSON 格式的解析结果。`;

/**
 * 生成完整的系统提示词（填充当前日期）
 */
export function generateSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[now.getDay()];

  return SYSTEM_PROMPT
    .replace("{{CURRENT_DATE}}", dateStr)
    .replace("{{WEEKDAY}}", weekday);
}

/**
 * 生成用户提示词
 */
export function generateUserPrompt(userInput: string): string {
  return USER_PROMPT_TEMPLATE.replace("{{USER_INPUT}}", userInput);
}

/**
 * 带上下文的提示词（用于 UPDATE/DELETE 时提供任务列表）
 */
export const CONTEXT_PROMPT_TEMPLATE = `当前项目中有以下任务：

{{TASK_LIST}}

请解析用户指令：
"{{USER_INPUT}}"

如果是修改或删除操作，请在 targetDescription 中描述匹配的任务。
`;

/**
 * 生成带上下文的提示词
 */
export function generateContextPrompt(
  userInput: string,
  tasks: Array<{ id: string; content: string }>
): string {
  const taskList = tasks
    .map((t, i) => `${i + 1}. [${t.id}] ${t.content}`)
    .join("\n");

  return CONTEXT_PROMPT_TEMPLATE
    .replace("{{TASK_LIST}}", taskList || "（暂无任务）")
    .replace("{{USER_INPUT}}", userInput);
}
