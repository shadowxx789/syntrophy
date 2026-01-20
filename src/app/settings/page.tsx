"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  RotateCcw,
  Plus,
  Settings2,
  Download,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";
import {
  validateApiKey,
  COMMON_CUSTOM_PROVIDERS,
  getProviderDisplayName,
  GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL,
} from "@/lib/ai";
import {
  PROMPT_PRESETS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
  DEFAULT_CONTEXT_PROMPT_TEMPLATE,
} from "@/lib/ai/prompts";
import type { AIProvider, PromptPreset, CustomProviderExport } from "@/types";
import { MAX_CUSTOM_PROVIDERS } from "@/types";
import { CustomProviderModal } from "@/components/CustomProviderModal";
import { CustomProviderCard } from "@/components/CustomProviderCard";

export default function SettingsPage() {
  const {
    aiProvider,
    encryptedApiKey,
    customAIConfig,
    geminiModel,
    customPrompts,
    theme,
    deviceId,
    savedCustomProviders,
    selectedCustomProviderId,
    setAIProvider,
    setEncryptedApiKey,
    setCustomAIConfig,
    setGeminiModel,
    setCustomPrompts,
    resetPrompts,
    setTheme,
    selectCustomProvider,
    getSelectedCustomProvider,
    exportCustomProviders,
    importCustomProviders,
  } = useSettingsStore();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"success" | "error" | null>(null);
  const [maskedKey, setMaskedKey] = useState<string>("");

  // 自定义配置表单
  const [customName, setCustomName] = useState(customAIConfig?.name || "");
  const [customBaseUrl, setCustomBaseUrl] = useState(customAIConfig?.baseUrl || "");
  const [customModel, setCustomModel] = useState(customAIConfig?.model || "");

  // 多配置管理状态
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // 提示词配置状态
  const [promptsEnabled, setPromptsEnabled] = useState(customPrompts?.enabled ?? false);
  const [currentPreset, setCurrentPreset] = useState<PromptPreset>(
    customPrompts?.preset ?? "default"
  );
  const [systemPrompt, setSystemPrompt] = useState(customPrompts?.systemPrompt ?? "");
  const [userPromptTemplate, setUserPromptTemplate] = useState(
    customPrompts?.userPromptTemplate ?? ""
  );
  const [contextPromptTemplate, setContextPromptTemplate] = useState(
    customPrompts?.contextPromptTemplate ?? ""
  );

  // 加载已保存的 API Key 掩码
  useEffect(() => {
    async function loadMaskedKey() {
      if (encryptedApiKey) {
        try {
          const decrypted = await decryptApiKey(encryptedApiKey);
          setMaskedKey(maskApiKey(decrypted));
        } catch {
          setMaskedKey("（解密失败）");
        }
      } else {
        setMaskedKey("");
      }
    }
    loadMaskedKey();
  }, [encryptedApiKey]);

  // 当 customAIConfig 变化时同步表单
  useEffect(() => {
    if (customAIConfig) {
      setCustomName(customAIConfig.name);
      setCustomBaseUrl(customAIConfig.baseUrl);
      setCustomModel(customAIConfig.model);
    }
  }, [customAIConfig]);

  // 当 customPrompts 变化时同步表单
  useEffect(() => {
    if (customPrompts) {
      setPromptsEnabled(customPrompts.enabled);
      setCurrentPreset(customPrompts.preset);
      setSystemPrompt(customPrompts.systemPrompt ?? "");
      setUserPromptTemplate(customPrompts.userPromptTemplate ?? "");
      setContextPromptTemplate(customPrompts.contextPromptTemplate ?? "");
    }
  }, [customPrompts]);

  // 切换提供商
  const handleProviderChange = (provider: AIProvider) => {
    setAIProvider(provider);
    setValidationResult(null);
    // 切换提供商时清除 API Key
    if (provider !== aiProvider) {
      setEncryptedApiKey(undefined);
      setMaskedKey("");
      setApiKeyInput("");
    }
  };

  // 选择预设的自定义提供商
  const handleSelectPreset = (preset: (typeof COMMON_CUSTOM_PROVIDERS)[number]) => {
    setCustomName(preset.name);
    setCustomBaseUrl(preset.baseUrl);
    setCustomModel(preset.model);
    setCustomAIConfig({
      name: preset.name,
      baseUrl: preset.baseUrl,
      model: preset.model,
    });
    setAIProvider("custom");
  };

  // 保存自定义配置
  const handleSaveCustomConfig = () => {
    if (!customName.trim() || !customBaseUrl.trim() || !customModel.trim()) {
      return;
    }

    setCustomAIConfig({
      name: customName.trim(),
      baseUrl: customBaseUrl.trim(),
      model: customModel.trim(),
    });
  };

  // 保存 API Key
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;

    // 自定义模式下需要先保存配置
    if (aiProvider === "custom") {
      if (!customBaseUrl.trim() || !customModel.trim()) {
        setValidationResult("error");
        return;
      }
      handleSaveCustomConfig();
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // 验证 API Key
      const isValid = await validateApiKey({
        provider: aiProvider,
        apiKey: apiKeyInput.trim(),
        model: aiProvider === "gemini" ? geminiModel || DEFAULT_GEMINI_MODEL : undefined,
        customConfig:
          aiProvider === "custom"
            ? {
                name: customName.trim() || "自定义",
                baseUrl: customBaseUrl.trim(),
                model: customModel.trim(),
              }
            : undefined,
      });

      if (isValid) {
        // 加密并保存
        const encrypted = await encryptApiKey(apiKeyInput.trim());
        setEncryptedApiKey(encrypted);
        setMaskedKey(maskApiKey(apiKeyInput.trim()));
        setApiKeyInput("");
        setValidationResult("success");
      } else {
        setValidationResult("error");
      }
    } catch (error) {
      console.error("保存 API Key 失败:", error);
      setValidationResult("error");
    } finally {
      setIsValidating(false);
    }
  };

  // 清除 API Key
  const handleClearApiKey = () => {
    setEncryptedApiKey(undefined);
    setMaskedKey("");
    setApiKeyInput("");
    setValidationResult(null);
  };

  // 切换提示词自定义开关
  const handleTogglePrompts = (enabled: boolean) => {
    setPromptsEnabled(enabled);
    if (enabled) {
      setCustomPrompts({
        enabled: true,
        preset: currentPreset,
        systemPrompt: currentPreset === "custom" ? systemPrompt : undefined,
        userPromptTemplate: currentPreset === "custom" ? userPromptTemplate : undefined,
        contextPromptTemplate: currentPreset === "custom" ? contextPromptTemplate : undefined,
      });
    } else {
      setCustomPrompts(undefined);
    }
  };

  // 选择提示词预设
  const handleSelectPromptPreset = (preset: PromptPreset) => {
    setCurrentPreset(preset);
    if (preset !== "custom") {
      // 使用预设模板
      const presetTemplate = PROMPT_PRESETS[preset];
      setSystemPrompt(presetTemplate.systemPrompt);
      setUserPromptTemplate(presetTemplate.userPromptTemplate);
      setContextPromptTemplate(presetTemplate.contextPromptTemplate);
    }
    setCustomPrompts({
      enabled: true,
      preset,
      systemPrompt: preset === "custom" ? systemPrompt : undefined,
      userPromptTemplate: preset === "custom" ? userPromptTemplate : undefined,
      contextPromptTemplate: preset === "custom" ? contextPromptTemplate : undefined,
    });
  };

  // 保存自定义提示词
  const handleSavePrompts = () => {
    setCustomPrompts({
      enabled: true,
      preset: "custom",
      systemPrompt: systemPrompt.trim() || undefined,
      userPromptTemplate: userPromptTemplate.trim() || undefined,
      contextPromptTemplate: contextPromptTemplate.trim() || undefined,
    });
  };

  // 重置提示词为默认
  const handleResetPrompts = () => {
    resetPrompts();
    setPromptsEnabled(false);
    setCurrentPreset("default");
    setSystemPrompt("");
    setUserPromptTemplate("");
    setContextPromptTemplate("");
  };

  // 打开添加配置模态框
  const handleOpenAddModal = () => {
    setEditingProviderId(null);
    setProviderModalOpen(true);
  };

  // 打开编辑配置模态框
  const handleOpenEditModal = (providerId: string) => {
    setEditingProviderId(providerId);
    setProviderModalOpen(true);
  };

  // 选择已保存的自定义配置
  const handleSelectSavedProvider = (providerId: string) => {
    selectCustomProvider(providerId);
    setValidationResult(null);
    setMaskedKey("");
    setApiKeyInput("");
  };

  // 导出配置
  const handleExportConfigs = () => {
    const exportData = exportCustomProviders();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `syntropy-ai-providers-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const handleImportConfigs = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as CustomProviderExport;

        // 验证格式
        if (data.version !== 1 || !Array.isArray(data.providers)) {
          setImportError("导入文件格式不正确");
          return;
        }

        const result = importCustomProviders(data, "merge");
        setImportError(null);
        alert(`导入完成：添加 ${result.added} 个，跳过 ${result.skipped} 个`);
      } catch {
        setImportError("导入失败，请检查文件格式");
      }
    };
    input.click();
  };

  // 获取当前选中的自定义配置
  const selectedProvider = getSelectedCustomProvider();

  const providerDisplayName = getProviderDisplayName(
    aiProvider,
    selectedProvider || customAIConfig
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 border-b px-4 py-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">设置</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 p-6">
        {/* AI 服务配置 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">AI 服务配置</h2>

          {/* 服务商选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">AI 服务商</label>
            <div className="flex flex-wrap gap-2">
              {(["openai", "deepseek", "gemini"] as AIProvider[]).map((provider) => (
                <Button
                  key={provider}
                  variant={aiProvider === provider ? "default" : "outline"}
                  onClick={() => handleProviderChange(provider)}
                  size="sm"
                >
                  {provider === "openai"
                    ? "OpenAI"
                    : provider === "deepseek"
                      ? "DeepSeek"
                      : "Gemini"}
                </Button>
              ))}

              {/* 自定义提供商下拉 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={aiProvider === "custom" ? "default" : "outline"}
                    size="sm"
                    className="gap-1"
                  >
                    {aiProvider === "custom" ? providerDisplayName : "自定义..."}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {/* 添加新配置 */}
                  <DropdownMenuItem onClick={handleOpenAddModal} className="gap-2">
                    <Plus className="h-4 w-4" />
                    添加新配置
                    <span className="ml-auto text-xs text-muted-foreground">
                      {savedCustomProviders?.length || 0}/{MAX_CUSTOM_PROVIDERS}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* 已保存的配置 */}
                  {savedCustomProviders && savedCustomProviders.length > 0 ? (
                    <>
                      {savedCustomProviders.map((provider) => (
                        <DropdownMenuItem
                          key={provider.id}
                          onClick={() => handleSelectSavedProvider(provider.id)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span>{provider.name}</span>
                            <span className="text-xs text-muted-foreground">{provider.model}</span>
                          </div>
                          {selectedCustomProviderId === provider.id && aiProvider === "custom" && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  ) : null}

                  {/* 快速预设（用于添加） */}
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    快速预设
                  </DropdownMenuItem>
                  {COMMON_CUSTOM_PROVIDERS.slice(0, 3).map((preset) => (
                    <DropdownMenuItem key={preset.name} onClick={() => handleSelectPreset(preset)}>
                      <div className="flex flex-col">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground">{preset.model}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 自定义配置管理 */}
          {aiProvider === "custom" && (
            <div className="space-y-4">
              {/* 当前选中的配置卡片 */}
              {selectedProvider ? (
                <CustomProviderCard provider={selectedProvider} onEdit={handleOpenEditModal} />
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                  <Settings2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    尚未选择自定义配置，请从上方下拉菜单选择或添加新配置
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 gap-1"
                    onClick={handleOpenAddModal}
                  >
                    <Plus className="h-4 w-4" />
                    添加配置
                  </Button>
                </div>
              )}

              {/* 导入/导出按钮 */}
              {savedCustomProviders && savedCustomProviders.length > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    已保存 {savedCustomProviders.length} 个自定义配置
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={handleExportConfigs}
                    >
                      <Download className="h-4 w-4" />
                      导出
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={handleImportConfigs}
                    >
                      <Upload className="h-4 w-4" />
                      导入
                    </Button>
                  </div>
                </div>
              )}

              {/* 导入错误提示 */}
              {importError && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {importError}
                </p>
              )}
            </div>
          )}

          {/* Gemini 模型选择 */}
          {aiProvider === "gemini" && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-medium">Gemini 模型</h3>
              <div className="flex flex-wrap gap-2">
                {GEMINI_MODELS.map((model) => (
                  <Button
                    key={model.id}
                    variant={
                      (geminiModel || DEFAULT_GEMINI_MODEL) === model.id ? "default" : "outline"
                    }
                    onClick={() => setGeminiModel(model.id)}
                    size="sm"
                  >
                    {model.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                当前模型:{" "}
                <code className="rounded bg-muted px-1">{geminiModel || DEFAULT_GEMINI_MODEL}</code>
              </p>
            </div>
          )}

          {/* API Key 输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>

            {/* 已保存的 Key */}
            {maskedKey && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <span className="flex-1 font-mono text-sm">{maskedKey}</span>
                <Button variant="ghost" size="sm" onClick={handleClearApiKey}>
                  清除
                </Button>
              </div>
            )}

            {/* 输入新 Key */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={maskedKey ? "输入新的 API Key..." : "sk-..."}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim() || isValidating}>
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "验证并保存"}
              </Button>
            </div>

            {/* 验证结果 */}
            {validationResult === "success" && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" />
                API Key 验证成功并已保存
              </p>
            )}
            {validationResult === "error" && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                验证失败，请检查 API Key 和配置是否正确
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              API Key 使用设备指纹加密存储在本地，不会上传到服务器。 切换设备需要重新配置。
            </p>
          </div>
        </section>

        {/* AI 提示词配置 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI 提示词配置</h2>
            <div className="flex items-center gap-2">
              <Switch checked={promptsEnabled} onCheckedChange={handleTogglePrompts} />
              <span className="text-sm text-muted-foreground">启用预设/自定义</span>
            </div>
          </div>

          {/* 预设选择 - 始终显示 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">提示词模式</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PROMPT_PRESETS) as Exclude<PromptPreset, "custom">[]).map((key) => (
                <Button
                  key={key}
                  variant={promptsEnabled && currentPreset === key ? "default" : "outline"}
                  onClick={() => {
                    if (!promptsEnabled) {
                      handleTogglePrompts(true);
                    }
                    handleSelectPromptPreset(key);
                  }}
                  size="sm"
                >
                  {PROMPT_PRESETS[key].name}
                </Button>
              ))}
              <Button
                variant={promptsEnabled && currentPreset === "custom" ? "default" : "outline"}
                onClick={() => {
                  if (!promptsEnabled) {
                    handleTogglePrompts(true);
                  }
                  handleSelectPromptPreset("custom");
                }}
                size="sm"
              >
                自定义
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {!promptsEnabled
                ? "点击预设按钮启用并选择提示词模式"
                : currentPreset === "custom"
                  ? "完全自定义提示词内容"
                  : PROMPT_PRESETS[currentPreset as Exclude<PromptPreset, "custom">]?.description}
            </p>
          </div>

          {promptsEnabled && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              {/* 自定义编辑区 */}
              {currentPreset === "custom" && (
                <div className="space-y-4 border-t pt-4">
                  {/* 系统提示词 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">系统提示词</label>
                    <Textarea
                      rows={10}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder={DEFAULT_SYSTEM_PROMPT.slice(0, 200) + "..."}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      定义 AI 角色和输出格式。可用变量：
                      <code className="mx-1 rounded bg-muted px-1">{"{{CURRENT_DATE}}"}</code>
                      <code className="rounded bg-muted px-1">{"{{WEEKDAY}}"}</code>
                    </p>
                  </div>

                  {/* 用户提示词模板 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">用户提示词模板</label>
                    <Textarea
                      rows={4}
                      value={userPromptTemplate}
                      onChange={(e) => setUserPromptTemplate(e.target.value)}
                      placeholder={DEFAULT_USER_PROMPT_TEMPLATE}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      单条指令解析模板。可用变量：
                      <code className="rounded bg-muted px-1">{"{{USER_INPUT}}"}</code>
                    </p>
                  </div>

                  {/* 上下文提示词模板 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">上下文提示词模板</label>
                    <Textarea
                      rows={6}
                      value={contextPromptTemplate}
                      onChange={(e) => setContextPromptTemplate(e.target.value)}
                      placeholder={DEFAULT_CONTEXT_PROMPT_TEMPLATE}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      带任务列表的解析模板。可用变量：
                      <code className="mx-1 rounded bg-muted px-1">{"{{TASK_LIST}}"}</code>
                      <code className="rounded bg-muted px-1">{"{{USER_INPUT}}"}</code>
                    </p>
                  </div>

                  {/* 保存按钮 */}
                  <Button onClick={handleSavePrompts} size="sm">
                    保存提示词
                  </Button>
                </div>
              )}

              {/* 恢复默认按钮 */}
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  提示词决定了 AI 如何理解你的指令并提取任务信息。
                </p>
                <Button variant="outline" size="sm" onClick={handleResetPrompts} className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  恢复默认
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* 主题设置 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">外观</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">主题</label>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? "default" : "outline"}
                  onClick={() => setTheme(t)}
                  className="flex-1"
                >
                  {t === "light" ? "浅色" : t === "dark" ? "深色" : "跟随系统"}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* 设备信息 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">设备信息</h2>

          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm">
              <span className="text-muted-foreground">设备 ID：</span>
              <code className="ml-2 font-mono">{deviceId || "未生成"}</code>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              设备 ID 用于数据同步时识别操作来源，在首次使用时自动生成。
            </p>
          </div>
        </section>

        {/* 数据管理 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">数据管理</h2>

          <div className="flex gap-2">
            <Button variant="outline" disabled>
              导出全部数据
            </Button>
            <Button variant="destructive" disabled>
              清除所有数据
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">数据管理功能将在后续版本中提供。</p>
        </section>

        {/* 关于 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">关于</h2>

          <div className="text-sm text-muted-foreground">
            <p>凝序 Syntropy v0.1.0</p>
            <p className="mt-1">基于&quot;负熵&quot;哲学的全平台 PWA 办公系统</p>
          </div>
        </section>
      </main>

      {/* 自定义提供商添加/编辑模态框 */}
      <CustomProviderModal
        providerId={editingProviderId}
        open={providerModalOpen}
        onOpenChange={setProviderModalOpen}
      />
    </div>
  );
}
