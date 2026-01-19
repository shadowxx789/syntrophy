/**
 * Gemini API 适配器
 * 处理 Google Gemini API 的特殊格式要求
 */

import type { AIMessage, AIResponse, AIServiceConfig } from "./service";
import { AIError } from "./service";

/**
 * Gemini 模型列表
 */
export const GEMINI_MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (推荐)" },
  { id: "gemini-2.5-flash-preview", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro-preview", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
] as const;

export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

/**
 * Gemini API 端点
 */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Gemini 消息格式
 */
interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Gemini API 请求体
 */
interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

/**
 * Gemini API 响应体
 */
interface GeminiResponse {
  candidates?: {
    content?: {
      role: string;
      parts?: { text: string }[];
    };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * 将 OpenAI 格式的消息转换为 Gemini 格式
 *
 * Gemini 不支持 system 角色，需要将其合并到第一条 user 消息
 * Gemini 使用 "model" 而不是 "assistant"
 */
export function convertMessagesToGemini(messages: AIMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  let systemPrompt = "";

  for (const msg of messages) {
    if (msg.role === "system") {
      // 收集所有 system 消息
      systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
      continue;
    }

    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";

    // 如果是第一条 user 消息且有 system prompt，合并它们
    if (role === "user" && systemPrompt && contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n---\n\n${msg.content}` }],
      });
      systemPrompt = ""; // 清空，防止重复添加
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }],
      });
    }
  }

  // 如果只有 system 消息没有 user 消息，创建一条 user 消息
  if (systemPrompt && contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }],
    });
  }

  return contents;
}

/**
 * 调用 Gemini API
 */
export async function callGemini(
  messages: AIMessage[],
  config: AIServiceConfig
): Promise<AIResponse> {
  const model = config.model || DEFAULT_GEMINI_MODEL;
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent`;

  const contents = convertMessagesToGemini(messages);

  const requestBody: GeminiRequest = {
    contents,
    generationConfig: {
      temperature: config.temperature ?? 0.3,
      maxOutputTokens: config.maxTokens ?? 1000,
      // 请求 JSON 格式输出
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data: GeminiResponse = await response.json();

  // 处理错误响应
  if (!response.ok || data.error) {
    const errorMessage = data.error?.message || `Gemini API 调用失败: ${response.status}`;
    throw new AIError(errorMessage, response.status, data.error);
  }

  // 提取响应文本
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    content,
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        }
      : undefined,
  };
}

/**
 * 验证 Gemini API Key 是否有效
 */
export async function validateGeminiApiKey(apiKey: string, model?: string): Promise<boolean> {
  try {
    await callGemini([{ role: "user", content: "Say OK" }], {
      provider: "gemini",
      apiKey,
      model: model || DEFAULT_GEMINI_MODEL,
      maxTokens: 5,
    });
    return true;
  } catch (error) {
    if (error instanceof AIError && error.isInvalidKey()) {
      return false;
    }
    // 其他错误（如网络问题）抛出
    throw error;
  }
}
