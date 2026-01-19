/**
 * AI 服务抽象层
 * 支持 OpenAI、DeepSeek 及自定义 OpenAI 兼容 API
 */

import type { AIProvider, CustomAIConfig } from "@/types";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 自定义提供商配置 (当 provider === "custom" 时必须) */
  customConfig?: CustomAIConfig;
}

/**
 * 预设 AI 服务提供商配置
 */
const PRESET_PROVIDERS: Record<
  Exclude<AIProvider, "custom" | "gemini">,
  { baseUrl: string; defaultModel: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
};

/**
 * 常见 OpenAI 兼容服务商预设 (供用户参考)
 */
export const COMMON_CUSTOM_PROVIDERS = [
  {
    name: "Ollama (本地)",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
  },
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-exp:free",
  },
  {
    name: "Moonshot (月之暗面)",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
  },
  {
    name: "智谱 AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
  },
  {
    name: "硅基流动 (SiliconFlow)",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
  },
] as const;

/**
 * 获取 API 配置
 */
function getProviderConfig(config: AIServiceConfig): {
  baseUrl: string;
  model: string;
} {
  if (config.provider === "custom") {
    if (!config.customConfig) {
      throw new Error("自定义提供商必须提供 customConfig");
    }
    return {
      baseUrl: config.customConfig.baseUrl.replace(/\/$/, ""), // 移除末尾斜杠
      model: config.model || config.customConfig.model,
    };
  }

  if (config.provider === "gemini") {
    // Gemini 使用单独的适配器，这里不应该被调用
    throw new Error("Gemini 应使用 callGemini 而非 callAI");
  }

  const preset = PRESET_PROVIDERS[config.provider];
  return {
    baseUrl: preset.baseUrl,
    model: config.model || preset.defaultModel,
  };
}

import { callGemini, validateGeminiApiKey } from "./gemini";

/**
 * 调用 AI API (OpenAI 兼容格式，Gemini 使用单独适配器)
 */
export async function callAI(messages: AIMessage[], config: AIServiceConfig): Promise<AIResponse> {
  // Gemini 使用单独的适配器
  if (config.provider === "gemini") {
    return callGemini(messages, config);
  }

  const { baseUrl, model } = getProviderConfig(config);

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature: config.temperature ?? 0.3,
    max_tokens: config.maxTokens ?? 1000,
  };

  // 只有部分服务支持 response_format，尝试添加
  // 如果服务不支持，可能会忽略或报错，但不影响功能
  if (config.provider === "openai" || config.provider === "deepseek") {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AIError(`AI API 调用失败: ${response.status}`, response.status, error);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * AI 错误类
 */
export class AIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "AIError";
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isInvalidKey(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}

/**
 * 验证 API Key 是否有效
 */
export async function validateApiKey(config: AIServiceConfig): Promise<boolean> {
  try {
    // Gemini 使用单独的验证逻辑
    if (config.provider === "gemini") {
      return await validateGeminiApiKey(config.apiKey, config.model);
    }

    await callAI(
      [
        { role: "system", content: "Say OK" },
        { role: "user", content: "Test" },
      ],
      { ...config, maxTokens: 5 }
    );
    return true;
  } catch (error) {
    if (error instanceof AIError && error.isInvalidKey()) {
      return false;
    }
    // 其他错误（如网络问题）抛出
    throw error;
  }
}

/**
 * 获取提供商显示名称
 */
export function getProviderDisplayName(
  provider: AIProvider,
  customConfig?: CustomAIConfig
): string {
  if (provider === "custom" && customConfig) {
    return customConfig.name || "自定义";
  }

  const names: Record<AIProvider, string> = {
    openai: "OpenAI",
    deepseek: "DeepSeek",
    gemini: "Gemini",
    custom: "自定义",
  };

  return names[provider];
}
