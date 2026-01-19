import { describe, it, expect } from "vitest";
import { convertMessagesToGemini, GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "./gemini";
import type { AIMessage } from "./service";

describe("Gemini adapter", () => {
  describe("convertMessagesToGemini", () => {
    it("should convert simple user message", () => {
      const messages: AIMessage[] = [{ role: "user", content: "Hello" }];

      const result = convertMessagesToGemini(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("user");
      expect(result[0].parts[0].text).toBe("Hello");
    });

    it("should convert assistant role to model", () => {
      const messages: AIMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const result = convertMessagesToGemini(messages);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("user");
      expect(result[1].role).toBe("model");
      expect(result[1].parts[0].text).toBe("Hi there!");
    });

    it("should merge system message into first user message", () => {
      const messages: AIMessage[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
      ];

      const result = convertMessagesToGemini(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("user");
      expect(result[0].parts[0].text).toContain("You are a helpful assistant.");
      expect(result[0].parts[0].text).toContain("Hello");
    });

    it("should merge multiple system messages", () => {
      const messages: AIMessage[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "system", content: "Always respond in JSON." },
        { role: "user", content: "Hello" },
      ];

      const result = convertMessagesToGemini(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("user");
      expect(result[0].parts[0].text).toContain("You are a helpful assistant.");
      expect(result[0].parts[0].text).toContain("Always respond in JSON.");
      expect(result[0].parts[0].text).toContain("Hello");
    });

    it("should handle system-only messages", () => {
      const messages: AIMessage[] = [{ role: "system", content: "You are a helpful assistant." }];

      const result = convertMessagesToGemini(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("user");
      expect(result[0].parts[0].text).toBe("You are a helpful assistant.");
    });

    it("should handle multi-turn conversation", () => {
      const messages: AIMessage[] = [
        { role: "system", content: "Be concise." },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "user", content: "How are you?" },
      ];

      const result = convertMessagesToGemini(messages);

      expect(result).toHaveLength(3);
      expect(result[0].role).toBe("user");
      expect(result[0].parts[0].text).toContain("Be concise.");
      expect(result[0].parts[0].text).toContain("Hi");
      expect(result[1].role).toBe("model");
      expect(result[2].role).toBe("user");
      expect(result[2].parts[0].text).toBe("How are you?");
    });
  });

  describe("GEMINI_MODELS", () => {
    it("should have gemini-3-flash-preview as first model", () => {
      expect(GEMINI_MODELS[0].id).toBe("gemini-3-flash-preview");
    });

    it("should have all required models", () => {
      const modelIds = GEMINI_MODELS.map((m) => m.id);
      expect(modelIds).toContain("gemini-3-flash-preview");
      expect(modelIds).toContain("gemini-2.5-flash-preview");
      expect(modelIds).toContain("gemini-2.5-pro-preview");
      expect(modelIds).toContain("gemini-2.0-flash");
      expect(modelIds).toContain("gemini-1.5-flash");
      expect(modelIds).toContain("gemini-1.5-pro");
    });
  });

  describe("DEFAULT_GEMINI_MODEL", () => {
    it("should be gemini-3-flash-preview", () => {
      expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3-flash-preview");
    });
  });
});
