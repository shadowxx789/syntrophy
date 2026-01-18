/**
 * AI Prompt 模板
 * 用于解析用户自然语言指令
 * 支持预设模板和自定义覆盖
 */

import type { PromptPreset, PromptTemplate, CustomPromptConfig } from "@/types";

// ============================================================================
// 默认提示词 (标准模式)
// ============================================================================

/**
 * 默认系统提示词 - 定义 AI 角色和输出格式
 */
export const DEFAULT_SYSTEM_PROMPT = `你是一个任务管理助手，负责将用户的自然语言指令解析为结构化的任务操作。

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
 * 默认用户消息模板
 */
export const DEFAULT_USER_PROMPT_TEMPLATE = `请解析以下指令：

"{{USER_INPUT}}"

请返回 JSON 格式的解析结果。`;

/**
 * 默认上下文提示词（用于 UPDATE/DELETE 时提供任务列表）
 */
export const DEFAULT_CONTEXT_PROMPT_TEMPLATE = `当前项目中有以下任务：

{{TASK_LIST}}

请解析用户指令：
"{{USER_INPUT}}"

如果是修改或删除操作，请在 targetDescription 中描述匹配的任务。
`;

// ============================================================================
// 简洁模式提示词
// ============================================================================

export const CONCISE_SYSTEM_PROMPT = `任务解析器。解析用户指令，返回 JSON。

输出格式：
{"action":"ADD|UPDATE|DELETE|COMPLETE|UNKNOWN","confidence":0.0-1.0,"task":{"content":"","startDate":"YYYY-MM-DD"|null,"endDate":"YYYY-MM-DD"|null,"priority":"high|medium|low"|null},"targetDescription":""}

规则：
- 直接描述内容 → ADD
- "修改/改成" → UPDATE
- "删除/移除" → DELETE
- "完成/做完" → COMPLETE
- "紧急/重要" → priority: high
- "不急/有空" → priority: low

今天: {{CURRENT_DATE}}，星期{{WEEKDAY}}。`;

export const CONCISE_USER_PROMPT_TEMPLATE = `解析: "{{USER_INPUT}}"`;

export const CONCISE_CONTEXT_PROMPT_TEMPLATE = `任务列表:
{{TASK_LIST}}

解析: "{{USER_INPUT}}"`;

// ============================================================================
// 详细模式提示词
// ============================================================================

export const DETAILED_SYSTEM_PROMPT = `你是一个专业的任务管理 AI 助手，负责精确理解用户的自然语言指令并转换为结构化操作。

## 核心职责
1. **意图识别**: 准确判断用户想要执行的操作类型
2. **信息提取**: 从自然语言中提取任务内容、时间、优先级等信息
3. **上下文理解**: 在修改/删除操作时，根据描述匹配正确的目标任务
4. **置信度评估**: 对解析结果的确信程度进行合理评分

## 输出格式 (必须是有效 JSON)
\`\`\`json
{
  "action": "ADD" | "UPDATE" | "DELETE" | "COMPLETE" | "UNKNOWN",
  "confidence": 0.0 - 1.0,
  "task": {
    "content": "任务内容描述",
    "startDate": "YYYY-MM-DD" | null,
    "endDate": "YYYY-MM-DD" | null,
    "priority": "high" | "medium" | "low" | null
  },
  "targetDescription": "用于 UPDATE/DELETE/COMPLETE 时描述要操作的目标任务",
  "reasoning": "解释你的理解过程和决策依据"
}
\`\`\`

## 详细解析规则

### 操作类型判断
| 操作 | 触发词/模式 | 示例 |
|------|------------|------|
| ADD | "添加"、"新建"、"创建"、"记一下"、直接描述内容 | "买牛奶"、"添加开会任务" |
| UPDATE | "修改"、"改成"、"更新"、"把...改为"、"调整" | "把报告改到周五" |
| DELETE | "删除"、"移除"、"去掉"、"取消" | "删除买牛奶" |
| COMPLETE | "完成"、"做完了"、"搞定"、"标记完成" | "牛奶买好了" |

### 日期解析规则
- "今天" → {{CURRENT_DATE}}
- "明天" → 当前日期 + 1 天
- "后天" → 当前日期 + 2 天
- "大后天" → 当前日期 + 3 天
- "下周X" → 下一个周X的日期 (周一=1, 周日=7)
- "这周X" → 本周的周X (如已过则为下周)
- "X号" / "X日" → 当月的X日 (如已过则为下月)
- "下个月X号" → 下个月X日
- "月底" → 当月最后一天
- 无明确日期时设为 null

### 优先级识别
| 级别 | 关键词 |
|------|--------|
| high | 紧急、重要、优先、马上、立刻、ASAP、尽快 |
| medium | 一般、普通、正常 (默认) |
| low | 不急、有空再、可以晚点、低优先级 |

### 置信度评估标准
- 0.9-1.0: 意图明确，信息完整
- 0.7-0.9: 意图较明确，部分信息需推断
- 0.5-0.7: 意图模糊，需要用户确认
- 0.0-0.5: 无法理解，标记为 UNKNOWN

## 当前时间上下文
今天是 {{CURRENT_DATE}}，星期{{WEEKDAY}}。请据此计算相对日期。

## 示例

输入: "下周三之前把报告发给老板"
输出:
\`\`\`json
{
  "action": "ADD",
  "confidence": 0.95,
  "task": {
    "content": "把报告发给老板",
    "startDate": null,
    "endDate": "计算后的下周三日期",
    "priority": null
  },
  "targetDescription": null,
  "reasoning": "用户描述了一个新任务，包含明确的截止日期'下周三之前'"
}
\`\`\`
`;

export const DETAILED_USER_PROMPT_TEMPLATE = `请仔细解析以下用户指令，提取所有相关信息：

用户输入: "{{USER_INPUT}}"

请按照系统提示中的格式返回 JSON 结果，并在 reasoning 字段中说明你的理解过程。`;

export const DETAILED_CONTEXT_PROMPT_TEMPLATE = `当前项目中已有以下任务：

{{TASK_LIST}}

请解析用户的指令：
"{{USER_INPUT}}"

如果是修改、删除或完成操作，请根据任务列表匹配最可能的目标任务，并在 targetDescription 中描述。
如果无法确定目标，请降低 confidence 分数。
`;

// ============================================================================
// 预设模板映射
// ============================================================================

export const PROMPT_PRESETS: Record<Exclude<PromptPreset, "custom">, PromptTemplate> = {
  default: {
    name: "标准模式",
    description: "平衡解析精度和响应速度，适合日常使用",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
    contextPromptTemplate: DEFAULT_CONTEXT_PROMPT_TEMPLATE,
  },
  concise: {
    name: "简洁模式",
    description: "更短的提示词，更快的响应速度，适合简单指令",
    systemPrompt: CONCISE_SYSTEM_PROMPT,
    userPromptTemplate: CONCISE_USER_PROMPT_TEMPLATE,
    contextPromptTemplate: CONCISE_CONTEXT_PROMPT_TEMPLATE,
  },
  detailed: {
    name: "详细模式",
    description: "包含更多规则和示例，适合复杂指令解析",
    systemPrompt: DETAILED_SYSTEM_PROMPT,
    userPromptTemplate: DETAILED_USER_PROMPT_TEMPLATE,
    contextPromptTemplate: DETAILED_CONTEXT_PROMPT_TEMPLATE,
  },
};

// ============================================================================
// 向后兼容的导出 (保持旧代码可用)
// ============================================================================

export const SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;
export const USER_PROMPT_TEMPLATE = DEFAULT_USER_PROMPT_TEMPLATE;
export const CONTEXT_PROMPT_TEMPLATE = DEFAULT_CONTEXT_PROMPT_TEMPLATE;

// ============================================================================
// 提示词生成函数 (支持自定义覆盖)
// ============================================================================

/**
 * 获取当前生效的提示词模板
 */
export function getActivePrompts(config?: CustomPromptConfig): PromptTemplate {
  // 未启用自定义 → 使用默认
  if (!config?.enabled) {
    return PROMPT_PRESETS.default;
  }

  // 使用预设模板
  if (config.preset !== "custom") {
    return PROMPT_PRESETS[config.preset] || PROMPT_PRESETS.default;
  }

  // 完全自定义
  return {
    name: "自定义",
    description: "用户自定义的提示词模板",
    systemPrompt: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: config.userPromptTemplate || DEFAULT_USER_PROMPT_TEMPLATE,
    contextPromptTemplate: config.contextPromptTemplate || DEFAULT_CONTEXT_PROMPT_TEMPLATE,
  };
}

/**
 * 生成完整的系统提示词（填充当前日期）
 * @param customPrompt 可选的自定义系统提示词
 */
export function generateSystemPrompt(customPrompt?: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[now.getDay()];

  const template = customPrompt || DEFAULT_SYSTEM_PROMPT;

  return template.replace(/\{\{CURRENT_DATE\}\}/g, dateStr).replace(/\{\{WEEKDAY\}\}/g, weekday);
}

/**
 * 生成用户提示词
 * @param userInput 用户输入
 * @param customTemplate 可选的自定义模板
 */
export function generateUserPrompt(userInput: string, customTemplate?: string): string {
  const template = customTemplate || DEFAULT_USER_PROMPT_TEMPLATE;
  return template.replace(/\{\{USER_INPUT\}\}/g, userInput);
}

/**
 * 生成带上下文的提示词
 * @param userInput 用户输入
 * @param tasks 现有任务列表
 * @param customTemplate 可选的自定义模板
 */
export function generateContextPrompt(
  userInput: string,
  tasks: Array<{ id: string; content: string }>,
  customTemplate?: string
): string {
  const template = customTemplate || DEFAULT_CONTEXT_PROMPT_TEMPLATE;

  const taskList = tasks.map((t, i) => `${i + 1}. [${t.id}] ${t.content}`).join("\n");

  return template
    .replace(/\{\{TASK_LIST\}\}/g, taskList || "（暂无任务）")
    .replace(/\{\{USER_INPUT\}\}/g, userInput);
}
