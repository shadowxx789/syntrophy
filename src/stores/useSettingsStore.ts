import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Settings,
  AIProvider,
  CustomAIConfig,
  CustomPromptConfig,
  PromptPreset,
  SavedCustomProvider,
  CustomProviderExport,
} from "@/types";
import { MAX_CUSTOM_PROVIDERS } from "@/types";
import { getOrCreateDeviceId, generateCustomProviderId } from "@/lib/generateId";

interface SettingsState extends Settings {
  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** 设置 AI 提供商 */
  setAIProvider: (provider: AIProvider) => void;

  /** 设置加密后的 API Key */
  setEncryptedApiKey: (key: string | undefined) => void;

  /** 设置自定义 AI 配置 (向后兼容) */
  setCustomAIConfig: (config: CustomAIConfig | undefined) => void;

  /** 设置 Gemini 模型 */
  setGeminiModel: (model: string) => void;

  /** 设置主题 */
  setTheme: (theme: "light" | "dark" | "system") => void;

  /** 设置自定义提示词配置 */
  setCustomPrompts: (config: CustomPromptConfig | undefined) => void;

  /** 设置提示词预设 */
  setPromptPreset: (preset: PromptPreset) => void;

  /** 重置提示词为默认 */
  resetPrompts: () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // 自定义提供商管理 Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** 添加自定义提供商 */
  addCustomProvider: (
    provider: Omit<SavedCustomProvider, "id" | "createdAt">
  ) => SavedCustomProvider | null;

  /** 更新自定义提供商 */
  updateCustomProvider: (
    id: string,
    updates: Partial<Omit<SavedCustomProvider, "id" | "createdAt">>
  ) => boolean;

  /** 删除自定义提供商 */
  deleteCustomProvider: (id: string) => boolean;

  /** 选择自定义提供商 */
  selectCustomProvider: (id: string) => boolean;

  /** 更新自定义提供商的 API Key */
  updateCustomProviderApiKey: (id: string, encryptedApiKey: string | undefined) => boolean;

  /** 获取当前选中的自定义提供商 */
  getSelectedCustomProvider: () => SavedCustomProvider | undefined;

  /** 导出自定义提供商配置 */
  exportCustomProviders: () => CustomProviderExport;

  /** 导入自定义提供商配置 */
  importCustomProviders: (
    data: CustomProviderExport,
    mode: "merge" | "replace"
  ) => { added: number; skipped: number };

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
      geminiModel: undefined,
      savedCustomProviders: [],
      selectedCustomProviderId: undefined,
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

      setGeminiModel: (model) => {
        set({ geminiModel: model });
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

      // ─────────────────────────────────────────────────────────────────────────
      // 自定义提供商管理
      // ─────────────────────────────────────────────────────────────────────────

      addCustomProvider: (provider) => {
        const current = get().savedCustomProviders || [];

        // 检查数量限制
        if (current.length >= MAX_CUSTOM_PROVIDERS) {
          return null;
        }

        const newProvider: SavedCustomProvider = {
          ...provider,
          id: generateCustomProviderId(),
          createdAt: new Date().toISOString(),
        };

        set({
          savedCustomProviders: [...current, newProvider],
          selectedCustomProviderId: newProvider.id,
        });

        return newProvider;
      },

      updateCustomProvider: (id, updates) => {
        const current = get().savedCustomProviders || [];
        const index = current.findIndex((p) => p.id === id);

        if (index === -1) {
          return false;
        }

        const updated = [...current];
        updated[index] = { ...updated[index], ...updates };

        set({ savedCustomProviders: updated });
        return true;
      },

      deleteCustomProvider: (id) => {
        const current = get().savedCustomProviders || [];
        const filtered = current.filter((p) => p.id !== id);

        if (filtered.length === current.length) {
          return false;
        }

        const state = get();
        const newState: Partial<SettingsState> = {
          savedCustomProviders: filtered,
        };

        // 如果删除的是当前选中的，清除选中状态
        if (state.selectedCustomProviderId === id) {
          newState.selectedCustomProviderId = filtered.length > 0 ? filtered[0].id : undefined;
        }

        set(newState);
        return true;
      },

      selectCustomProvider: (id) => {
        const current = get().savedCustomProviders || [];
        const provider = current.find((p) => p.id === id);

        if (!provider) {
          return false;
        }

        // 更新最后使用时间
        const updated = current.map((p) =>
          p.id === id ? { ...p, lastUsedAt: new Date().toISOString() } : p
        );

        set({
          savedCustomProviders: updated,
          selectedCustomProviderId: id,
          aiProvider: "custom",
        });

        return true;
      },

      updateCustomProviderApiKey: (id, encryptedApiKey) => {
        const current = get().savedCustomProviders || [];
        const index = current.findIndex((p) => p.id === id);

        if (index === -1) {
          return false;
        }

        const updated = [...current];
        updated[index] = { ...updated[index], encryptedApiKey };

        set({ savedCustomProviders: updated });
        return true;
      },

      getSelectedCustomProvider: () => {
        const { savedCustomProviders, selectedCustomProviderId } = get();
        if (!selectedCustomProviderId || !savedCustomProviders) {
          return undefined;
        }
        return savedCustomProviders.find((p) => p.id === selectedCustomProviderId);
      },

      exportCustomProviders: () => {
        const providers = get().savedCustomProviders || [];

        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          providers: providers.map((p) => ({
            name: p.name,
            baseUrl: p.baseUrl,
            model: p.model,
          })),
        };
      },

      importCustomProviders: (data, mode) => {
        if (data.version !== 1) {
          return { added: 0, skipped: 0 };
        }

        const current = get().savedCustomProviders || [];
        let added = 0;
        let skipped = 0;

        // 替换模式：清空现有
        const base = mode === "replace" ? [] : [...current];

        for (const provider of data.providers) {
          // 检查数量限制
          if (base.length >= MAX_CUSTOM_PROVIDERS) {
            skipped++;
            continue;
          }

          // 检查重名（合并模式下）
          if (mode === "merge") {
            const exists = base.some(
              (p) => p.name === provider.name && p.baseUrl === provider.baseUrl
            );
            if (exists) {
              skipped++;
              continue;
            }
          }

          const newProvider: SavedCustomProvider = {
            id: generateCustomProviderId(),
            name: provider.name,
            baseUrl: provider.baseUrl,
            model: provider.model,
            createdAt: new Date().toISOString(),
          };

          base.push(newProvider);
          added++;
        }

        set({ savedCustomProviders: base });

        return { added, skipped };
      },

      initialize: () => {
        // 确保设备ID存在
        if (!get().deviceId) {
          set({ deviceId: getOrCreateDeviceId() });
        }

        // 迁移旧数据：如果有 customAIConfig 但没有 savedCustomProviders，迁移它
        const { customAIConfig, savedCustomProviders } = get();
        if (customAIConfig && (!savedCustomProviders || savedCustomProviders.length === 0)) {
          const migratedProvider: SavedCustomProvider = {
            id: generateCustomProviderId(),
            name: customAIConfig.name,
            baseUrl: customAIConfig.baseUrl,
            model: customAIConfig.model,
            createdAt: new Date().toISOString(),
          };

          set({
            savedCustomProviders: [migratedProvider],
            selectedCustomProviderId: migratedProvider.id,
          });
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
        geminiModel: state.geminiModel,
        savedCustomProviders: state.savedCustomProviders,
        selectedCustomProviderId: state.selectedCustomProviderId,
        customPrompts: state.customPrompts,
        theme: state.theme,
        deviceId: state.deviceId,
      }),
    }
  )
);
