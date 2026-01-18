import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSystemPrompt,
  generateUserPrompt,
  generateContextPrompt,
  getActivePrompts,
  PROMPT_PRESETS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
  DEFAULT_CONTEXT_PROMPT_TEMPLATE,
} from "./ai/prompts";
import type { CustomPromptConfig } from "@/types";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-18T10:00:00.000Z")); // Saturday
});

describe("generateSystemPrompt", () => {
  it("should replace {{CURRENT_DATE}} with today's date", () => {
    const result = generateSystemPrompt();
    expect(result).toContain("2026-01-18");
  });

  it("should replace {{WEEKDAY}} with current weekday", () => {
    const result = generateSystemPrompt();
    expect(result).toContain("日"); // Sunday in Chinese (2026-01-18 is Sunday)
  });

  it("should use custom prompt when provided", () => {
    const customPrompt = "Custom prompt with {{CURRENT_DATE}} and {{WEEKDAY}}";
    const result = generateSystemPrompt(customPrompt);
    expect(result).toBe("Custom prompt with 2026-01-18 and 日");
  });

  it("should handle prompts without variables", () => {
    const customPrompt = "Simple prompt without variables";
    const result = generateSystemPrompt(customPrompt);
    expect(result).toBe("Simple prompt without variables");
  });
});

describe("generateUserPrompt", () => {
  it("should replace {{USER_INPUT}} with user input", () => {
    const result = generateUserPrompt("买牛奶");
    expect(result).toContain("买牛奶");
  });

  it("should use custom template when provided", () => {
    const customTemplate = "Analyze: {{USER_INPUT}}";
    const result = generateUserPrompt("test input", customTemplate);
    expect(result).toBe("Analyze: test input");
  });

  it("should handle multiple {{USER_INPUT}} occurrences", () => {
    const customTemplate = "First: {{USER_INPUT}}, Second: {{USER_INPUT}}";
    const result = generateUserPrompt("hello", customTemplate);
    expect(result).toBe("First: hello, Second: hello");
  });
});

describe("generateContextPrompt", () => {
  it("should format task list correctly", () => {
    const tasks = [
      { id: "SYN-2026-0001", content: "Task 1" },
      { id: "SYN-2026-0002", content: "Task 2" },
    ];
    const result = generateContextPrompt("用户输入", tasks);

    expect(result).toContain("1. [SYN-2026-0001] Task 1");
    expect(result).toContain("2. [SYN-2026-0002] Task 2");
    expect(result).toContain("用户输入");
  });

  it("should handle empty task list", () => {
    const result = generateContextPrompt("用户输入", []);
    expect(result).toContain("（暂无任务）");
  });

  it("should use custom template when provided", () => {
    const customTemplate = "Tasks: {{TASK_LIST}}\nQuery: {{USER_INPUT}}";
    const tasks = [{ id: "ID1", content: "Test" }];
    const result = generateContextPrompt("query", tasks, customTemplate);

    expect(result).toContain("Tasks: 1. [ID1] Test");
    expect(result).toContain("Query: query");
  });
});

describe("getActivePrompts", () => {
  it("should return default preset when config is undefined", () => {
    const result = getActivePrompts(undefined);
    expect(result.name).toBe("标准模式");
    expect(result.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it("should return default preset when not enabled", () => {
    const config: CustomPromptConfig = {
      enabled: false,
      preset: "concise",
    };
    const result = getActivePrompts(config);
    expect(result.name).toBe("标准模式");
  });

  it("should return concise preset when selected", () => {
    const config: CustomPromptConfig = {
      enabled: true,
      preset: "concise",
    };
    const result = getActivePrompts(config);
    expect(result.name).toBe("简洁模式");
  });

  it("should return detailed preset when selected", () => {
    const config: CustomPromptConfig = {
      enabled: true,
      preset: "detailed",
    };
    const result = getActivePrompts(config);
    expect(result.name).toBe("详细模式");
  });

  it("should return custom prompts when preset is custom", () => {
    const config: CustomPromptConfig = {
      enabled: true,
      preset: "custom",
      systemPrompt: "Custom system prompt",
      userPromptTemplate: "Custom user template",
      contextPromptTemplate: "Custom context template",
    };
    const result = getActivePrompts(config);

    expect(result.name).toBe("自定义");
    expect(result.systemPrompt).toBe("Custom system prompt");
    expect(result.userPromptTemplate).toBe("Custom user template");
    expect(result.contextPromptTemplate).toBe("Custom context template");
  });

  it("should use defaults for missing custom prompts", () => {
    const config: CustomPromptConfig = {
      enabled: true,
      preset: "custom",
      // No custom prompts provided
    };
    const result = getActivePrompts(config);

    expect(result.name).toBe("自定义");
    expect(result.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(result.userPromptTemplate).toBe(DEFAULT_USER_PROMPT_TEMPLATE);
    expect(result.contextPromptTemplate).toBe(DEFAULT_CONTEXT_PROMPT_TEMPLATE);
  });
});

describe("PROMPT_PRESETS", () => {
  it("should have all required presets", () => {
    expect(PROMPT_PRESETS).toHaveProperty("default");
    expect(PROMPT_PRESETS).toHaveProperty("concise");
    expect(PROMPT_PRESETS).toHaveProperty("detailed");
  });

  it("should have required properties for each preset", () => {
    for (const [_key, preset] of Object.entries(PROMPT_PRESETS)) {
      expect(preset).toHaveProperty("name");
      expect(preset).toHaveProperty("description");
      expect(preset).toHaveProperty("systemPrompt");
      expect(preset).toHaveProperty("userPromptTemplate");
      expect(preset).toHaveProperty("contextPromptTemplate");
      expect(typeof preset.name).toBe("string");
      expect(typeof preset.systemPrompt).toBe("string");
      expect(preset.systemPrompt.length).toBeGreaterThan(0);
    }
  });

  it("should have {{CURRENT_DATE}} and {{WEEKDAY}} in system prompts", () => {
    for (const preset of Object.values(PROMPT_PRESETS)) {
      expect(preset.systemPrompt).toContain("{{CURRENT_DATE}}");
      expect(preset.systemPrompt).toContain("{{WEEKDAY}}");
    }
  });

  it("should have {{USER_INPUT}} in user prompt templates", () => {
    for (const preset of Object.values(PROMPT_PRESETS)) {
      expect(preset.userPromptTemplate).toContain("{{USER_INPUT}}");
    }
  });

  it("should have {{TASK_LIST}} and {{USER_INPUT}} in context prompt templates", () => {
    for (const preset of Object.values(PROMPT_PRESETS)) {
      expect(preset.contextPromptTemplate).toContain("{{TASK_LIST}}");
      expect(preset.contextPromptTemplate).toContain("{{USER_INPUT}}");
    }
  });
});
