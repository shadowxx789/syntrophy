import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "./useSettingsStore";
import type { SavedCustomProvider, CustomProviderExport } from "@/types";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Mock crypto for ID generation
vi.mock("@/lib/generateId", () => ({
  getOrCreateDeviceId: vi.fn(() => "DEV-test1234"),
  generateCustomProviderId: vi.fn(() => `CUSTOM-${Math.random().toString(36).slice(2, 10)}`),
  generateUUID: vi.fn(() => `UUID-${Math.random().toString(36).slice(2, 10)}`),
}));

describe("useSettingsStore - Custom Provider Management", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store state
    useSettingsStore.setState({
      aiProvider: "openai",
      encryptedApiKey: undefined,
      customAIConfig: undefined,
      geminiModel: undefined,
      savedCustomProviders: [],
      selectedCustomProviderId: undefined,
      savedRecipients: [],
      customPrompts: undefined,
      theme: "system",
      deviceId: "",
    });
  });

  describe("addCustomProvider", () => {
    it("should add a new custom provider", () => {
      const store = useSettingsStore.getState();

      const result = store.addCustomProvider({
        name: "Test Provider",
        baseUrl: "https://api.test.com/v1",
        model: "test-model",
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Provider");
      expect(result?.baseUrl).toBe("https://api.test.com/v1");
      expect(result?.model).toBe("test-model");
      expect(result?.id).toMatch(/^CUSTOM-/);
      expect(result?.createdAt).toBeDefined();

      const state = useSettingsStore.getState();
      expect(state.savedCustomProviders).toHaveLength(1);
      expect(state.selectedCustomProviderId).toBe(result?.id);
    });

    it("should return null when max providers reached", () => {
      const store = useSettingsStore.getState();

      // Add 10 providers (max limit)
      for (let i = 0; i < 10; i++) {
        store.addCustomProvider({
          name: `Provider ${i}`,
          baseUrl: `https://api${i}.test.com/v1`,
          model: `model-${i}`,
        });
      }

      // 11th should fail
      const result = store.addCustomProvider({
        name: "Provider 10",
        baseUrl: "https://api10.test.com/v1",
        model: "model-10",
      });

      expect(result).toBeNull();
      expect(useSettingsStore.getState().savedCustomProviders).toHaveLength(10);
    });
  });

  describe("updateCustomProvider", () => {
    it("should update an existing provider", () => {
      const store = useSettingsStore.getState();
      const provider = store.addCustomProvider({
        name: "Original",
        baseUrl: "https://api.original.com/v1",
        model: "original-model",
      });

      const result = store.updateCustomProvider(provider!.id, {
        name: "Updated",
        model: "updated-model",
      });

      expect(result).toBe(true);

      const updated = useSettingsStore
        .getState()
        .savedCustomProviders?.find((p) => p.id === provider!.id);
      expect(updated?.name).toBe("Updated");
      expect(updated?.model).toBe("updated-model");
      expect(updated?.baseUrl).toBe("https://api.original.com/v1"); // Unchanged
    });

    it("should return false for non-existent provider", () => {
      const store = useSettingsStore.getState();

      const result = store.updateCustomProvider("CUSTOM-nonexistent", {
        name: "Updated",
      });

      expect(result).toBe(false);
    });
  });

  describe("deleteCustomProvider", () => {
    it("should delete an existing provider", () => {
      const store = useSettingsStore.getState();
      const provider = store.addCustomProvider({
        name: "To Delete",
        baseUrl: "https://api.delete.com/v1",
        model: "delete-model",
      });

      const result = store.deleteCustomProvider(provider!.id);

      expect(result).toBe(true);
      expect(useSettingsStore.getState().savedCustomProviders).toHaveLength(0);
    });

    it("should update selectedCustomProviderId when deleting selected provider", () => {
      const store = useSettingsStore.getState();

      const provider1 = store.addCustomProvider({
        name: "Provider 1",
        baseUrl: "https://api1.test.com/v1",
        model: "model-1",
      });
      const provider2 = store.addCustomProvider({
        name: "Provider 2",
        baseUrl: "https://api2.test.com/v1",
        model: "model-2",
      });

      // Select provider1
      store.selectCustomProvider(provider1!.id);
      expect(useSettingsStore.getState().selectedCustomProviderId).toBe(provider1!.id);

      // Delete provider1
      store.deleteCustomProvider(provider1!.id);

      // Should auto-select remaining provider
      expect(useSettingsStore.getState().selectedCustomProviderId).toBe(provider2!.id);
    });

    it("should return false for non-existent provider", () => {
      const store = useSettingsStore.getState();

      const result = store.deleteCustomProvider("CUSTOM-nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("selectCustomProvider", () => {
    it("should select an existing provider", () => {
      const store = useSettingsStore.getState();
      const provider = store.addCustomProvider({
        name: "Selectable",
        baseUrl: "https://api.selectable.com/v1",
        model: "selectable-model",
      });

      // Add another and select the first
      store.addCustomProvider({
        name: "Other",
        baseUrl: "https://api.other.com/v1",
        model: "other-model",
      });

      const result = store.selectCustomProvider(provider!.id);

      expect(result).toBe(true);
      const state = useSettingsStore.getState();
      expect(state.selectedCustomProviderId).toBe(provider!.id);
      expect(state.aiProvider).toBe("custom");

      // Check lastUsedAt is updated
      const selected = state.savedCustomProviders?.find((p) => p.id === provider!.id);
      expect(selected?.lastUsedAt).toBeDefined();
    });

    it("should return false for non-existent provider", () => {
      const store = useSettingsStore.getState();

      const result = store.selectCustomProvider("CUSTOM-nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("getSelectedCustomProvider", () => {
    it("should return the selected provider", () => {
      const store = useSettingsStore.getState();
      const provider = store.addCustomProvider({
        name: "Selected",
        baseUrl: "https://api.selected.com/v1",
        model: "selected-model",
      });

      const selected = store.getSelectedCustomProvider();

      expect(selected).toBeDefined();
      expect(selected?.id).toBe(provider!.id);
    });

    it("should return undefined when no provider selected", () => {
      useSettingsStore.setState({ selectedCustomProviderId: undefined });

      const store = useSettingsStore.getState();
      const selected = store.getSelectedCustomProvider();

      expect(selected).toBeUndefined();
    });
  });

  describe("updateCustomProviderApiKey", () => {
    it("should update the API key for a provider", () => {
      const store = useSettingsStore.getState();
      const provider = store.addCustomProvider({
        name: "With Key",
        baseUrl: "https://api.withkey.com/v1",
        model: "key-model",
      });

      const result = store.updateCustomProviderApiKey(provider!.id, "encrypted-key-123");

      expect(result).toBe(true);

      const updated = useSettingsStore
        .getState()
        .savedCustomProviders?.find((p) => p.id === provider!.id);
      expect(updated?.encryptedApiKey).toBe("encrypted-key-123");
    });

    it("should clear the API key when undefined is passed", () => {
      const store = useSettingsStore.getState();
      const provider = store.addCustomProvider({
        name: "With Key",
        baseUrl: "https://api.withkey.com/v1",
        model: "key-model",
        encryptedApiKey: "existing-key",
      });

      store.updateCustomProviderApiKey(provider!.id, undefined);

      const updated = useSettingsStore
        .getState()
        .savedCustomProviders?.find((p) => p.id === provider!.id);
      expect(updated?.encryptedApiKey).toBeUndefined();
    });
  });

  describe("exportCustomProviders", () => {
    it("should export providers without API keys", () => {
      const store = useSettingsStore.getState();

      store.addCustomProvider({
        name: "Provider 1",
        baseUrl: "https://api1.test.com/v1",
        model: "model-1",
        encryptedApiKey: "secret-key-1",
      });
      store.addCustomProvider({
        name: "Provider 2",
        baseUrl: "https://api2.test.com/v1",
        model: "model-2",
        encryptedApiKey: "secret-key-2",
      });

      const exported = store.exportCustomProviders();

      expect(exported.version).toBe(1);
      expect(exported.exportedAt).toBeDefined();
      expect(exported.providers).toHaveLength(2);

      // Verify no API keys are exported
      exported.providers.forEach((p) => {
        expect(p).not.toHaveProperty("encryptedApiKey");
        expect(p).not.toHaveProperty("id");
        expect(p).not.toHaveProperty("createdAt");
      });

      expect(exported.providers[0].name).toBe("Provider 1");
      expect(exported.providers[1].name).toBe("Provider 2");
    });
  });

  describe("importCustomProviders", () => {
    it("should import providers in merge mode", () => {
      const store = useSettingsStore.getState();

      // Add existing provider
      store.addCustomProvider({
        name: "Existing",
        baseUrl: "https://api.existing.com/v1",
        model: "existing-model",
      });

      const importData: CustomProviderExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        providers: [
          { name: "New 1", baseUrl: "https://api.new1.com/v1", model: "new-1" },
          { name: "New 2", baseUrl: "https://api.new2.com/v1", model: "new-2" },
        ],
      };

      const result = store.importCustomProviders(importData, "merge");

      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);
      expect(useSettingsStore.getState().savedCustomProviders).toHaveLength(3);
    });

    it("should skip duplicates in merge mode", () => {
      const store = useSettingsStore.getState();

      store.addCustomProvider({
        name: "Existing",
        baseUrl: "https://api.existing.com/v1",
        model: "existing-model",
      });

      const importData: CustomProviderExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        providers: [
          { name: "Existing", baseUrl: "https://api.existing.com/v1", model: "different-model" },
          { name: "New", baseUrl: "https://api.new.com/v1", model: "new-model" },
        ],
      };

      const result = store.importCustomProviders(importData, "merge");

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
      expect(useSettingsStore.getState().savedCustomProviders).toHaveLength(2);
    });

    it("should replace all providers in replace mode", () => {
      const store = useSettingsStore.getState();

      store.addCustomProvider({
        name: "Old",
        baseUrl: "https://api.old.com/v1",
        model: "old-model",
      });

      const importData: CustomProviderExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        providers: [{ name: "Replaced 1", baseUrl: "https://api.new1.com/v1", model: "new-1" }],
      };

      const result = store.importCustomProviders(importData, "replace");

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(0);

      const providers = useSettingsStore.getState().savedCustomProviders;
      expect(providers).toHaveLength(1);
      expect(providers?.[0].name).toBe("Replaced 1");
    });

    it("should reject invalid version", () => {
      const store = useSettingsStore.getState();

      const importData = {
        version: 999,
        exportedAt: new Date().toISOString(),
        providers: [{ name: "Test", baseUrl: "https://api.test.com/v1", model: "test" }],
      } as unknown as CustomProviderExport;

      const result = store.importCustomProviders(importData, "merge");

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it("should respect max providers limit during import", () => {
      const store = useSettingsStore.getState();

      // Add 9 existing providers
      for (let i = 0; i < 9; i++) {
        store.addCustomProvider({
          name: `Existing ${i}`,
          baseUrl: `https://api${i}.test.com/v1`,
          model: `model-${i}`,
        });
      }

      const importData: CustomProviderExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        providers: [
          { name: "Import 1", baseUrl: "https://api.import1.com/v1", model: "import-1" },
          { name: "Import 2", baseUrl: "https://api.import2.com/v1", model: "import-2" },
          { name: "Import 3", baseUrl: "https://api.import3.com/v1", model: "import-3" },
        ],
      };

      const result = store.importCustomProviders(importData, "merge");

      expect(result.added).toBe(1); // Only 1 fits (9 + 1 = 10)
      expect(result.skipped).toBe(2);
      expect(useSettingsStore.getState().savedCustomProviders).toHaveLength(10);
    });
  });

  describe("savedRecipients", () => {
    it("should add a new saved recipient", () => {
      const store = useSettingsStore.getState();

      const result = store.addSavedRecipient({
        email: "user@example.com",
        label: "测试收件人",
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe("user@example.com");
      expect(result?.label).toBe("测试收件人");
      expect(result?.id).toMatch(/^UUID-/);
      expect(result?.createdAt).toBeDefined();

      const state = useSettingsStore.getState();
      expect(state.savedRecipients).toHaveLength(1);
    });

    it("should update label for existing email", () => {
      const store = useSettingsStore.getState();
      const first = store.addSavedRecipient({
        email: "user@example.com",
        label: "Old",
      });

      const result = store.addSavedRecipient({
        email: "user@example.com",
        label: "New",
      });

      expect(result?.id).toBe(first?.id);
      expect(result?.label).toBe("New");
      expect(useSettingsStore.getState().savedRecipients).toHaveLength(1);
    });

    it("should return null when max recipients reached", () => {
      const store = useSettingsStore.getState();

      for (let i = 0; i < 10; i++) {
        store.addSavedRecipient({
          email: `user${i}@example.com`,
          label: `User ${i}`,
        });
      }

      const result = store.addSavedRecipient({
        email: "user10@example.com",
        label: "User 10",
      });

      expect(result).toBeNull();
      expect(useSettingsStore.getState().savedRecipients).toHaveLength(10);
    });

    it("should update saved recipient", () => {
      const store = useSettingsStore.getState();
      const recipient = store.addSavedRecipient({
        email: "user@example.com",
        label: "Old",
      });

      const success = store.updateSavedRecipient(recipient!.id, {
        label: "Updated",
      });

      expect(success).toBe(true);
      const updated = useSettingsStore
        .getState()
        .savedRecipients?.find((item) => item.id === recipient!.id);
      expect(updated?.label).toBe("Updated");
    });

    it("should delete saved recipient", () => {
      const store = useSettingsStore.getState();
      const recipient = store.addSavedRecipient({
        email: "user@example.com",
      });

      const success = store.deleteSavedRecipient(recipient!.id);

      expect(success).toBe(true);
      expect(useSettingsStore.getState().savedRecipients).toHaveLength(0);
    });
  });
});
