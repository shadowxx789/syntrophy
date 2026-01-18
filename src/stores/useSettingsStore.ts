import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Settings,
  AIProvider,
  CustomAIConfig,
  CustomPromptConfig,
  PromptPreset,
} from "@/types";
import { getOrCreateDeviceId } from "@/lib/generateId";

interface SettingsState extends Settings {
  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** 设置 AI 提供商 */
  setAIProvider: (provider: AIProvider) => void;

  /** 设置加密后的 API Key */
  setEncryptedApiKey: (key: string | undefined) => void;

  /** 设置自定义 AI 配置 */
  setCustomAIConfig: (config: CustomAIConfig | undefined) => void;

  /** 设置主题 */
  setTheme: (theme: "light" | "dark" | "system") => void;

  /** 设置自定义提示词配置 */
  setCustomPrompts: (config: CustomPromptConfig | undefined) => void;

  /** 设置提示词预设 */
  setPromptPreset: (preset: PromptPreset) => void;

  /** 重置提示词为默认 */
  resetPrompts: () => void;

  /** 初始化设置 (从存储加载后调用) */
  initialize: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // 默认值
      aiProvider: "openai",
      encryptedApiKey: undefined,
      customAIConfig: undefined,
      customPrompts: undefined,
      theme: "system",
      deviceId: "",

      setAIProvider: (provider) => {
        set({ aiProvider: provider });
      },

      setEncryptedApiKey: (key) => {
        set({ encryptedApiKey: key });
      },

      setCustomAIConfig: (config) => {
        set({ customAIConfig: config });
      },

      setCustomPrompts: (config) => {
        set({ customPrompts: config });
      },

      setPromptPreset: (preset) => {
        const current = get().customPrompts;
        set({
          customPrompts: {
            enabled: true,
            preset,
            systemPrompt: current?.systemPrompt,
            userPromptTemplate: current?.userPromptTemplate,
            contextPromptTemplate: current?.contextPromptTemplate,
          },
        });
      },

      resetPrompts: () => {
        set({ customPrompts: undefined });
      },

      setTheme: (theme) => {
        set({ theme });

        // 应用主题到 document
        if (typeof window !== "undefined") {
          const root = document.documentElement;

          if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.classList.toggle("dark", isDark);
          } else {
            root.classList.toggle("dark", theme === "dark");
          }
        }
      },

      initialize: () => {
        // 确保设备ID存在
        if (!get().deviceId) {
          set({ deviceId: getOrCreateDeviceId() });
        }

        // 应用主题
        const theme = get().theme;
        if (typeof window !== "undefined") {
          const root = document.documentElement;

          if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.classList.toggle("dark", isDark);
          } else {
            root.classList.toggle("dark", theme === "dark");
          }
        }
      },
    }),
    {
      name: "syntropy-settings",
      // 只持久化这些字段
      partialize: (state) => ({
        aiProvider: state.aiProvider,
        encryptedApiKey: state.encryptedApiKey,
        customAIConfig: state.customAIConfig,
        customPrompts: state.customPrompts,
        theme: state.theme,
        deviceId: state.deviceId,
      }),
    }
  )
);
