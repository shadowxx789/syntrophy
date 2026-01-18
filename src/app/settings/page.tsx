"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Check, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";
import { validateApiKey, COMMON_CUSTOM_PROVIDERS, getProviderDisplayName } from "@/lib/ai";
import type { AIProvider } from "@/types";

export default function SettingsPage() {
  const {
    aiProvider,
    encryptedApiKey,
    customAIConfig,
    theme,
    deviceId,
    setAIProvider,
    setEncryptedApiKey,
    setCustomAIConfig,
    setTheme,
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
  const handleSelectPreset = (preset: typeof COMMON_CUSTOM_PROVIDERS[number]) => {
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
        customConfig: aiProvider === "custom" ? {
          name: customName.trim() || "自定义",
          baseUrl: customBaseUrl.trim(),
          model: customModel.trim(),
        } : undefined,
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

  const providerDisplayName = getProviderDisplayName(aiProvider, customAIConfig);

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
              {(["openai", "deepseek"] as AIProvider[]).map((provider) => (
                <Button
                  key={provider}
                  variant={aiProvider === provider ? "default" : "outline"}
                  onClick={() => handleProviderChange(provider)}
                  size="sm"
                >
                  {provider === "openai" ? "OpenAI" : "DeepSeek"}
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
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => handleProviderChange("custom")}>
                    手动配置
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {COMMON_CUSTOM_PROVIDERS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <div className="flex flex-col">
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.model}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 自定义配置表单 */}
          {aiProvider === "custom" && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-medium">自定义提供商配置</h3>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">名称</label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="如: 本地 Ollama"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  API Base URL (OpenAI 兼容格式)
                </label>
                <Input
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="h-9 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">模型名称</label>
                <Input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="如: gpt-4, llama3.2, qwen2.5"
                  className="h-9 font-mono text-sm"
                />
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleSaveCustomConfig}
                disabled={!customName.trim() || !customBaseUrl.trim() || !customModel.trim()}
              >
                保存配置
              </Button>

              <p className="text-xs text-muted-foreground">
                支持所有 OpenAI Chat Completions API 兼容的服务。
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
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || isValidating}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "验证并保存"
                )}
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
              API Key 使用设备指纹加密存储在本地，不会上传到服务器。
              切换设备需要重新配置。
            </p>
          </div>
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
          <p className="text-xs text-muted-foreground">
            数据管理功能将在后续版本中提供。
          </p>
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
    </div>
  );
}
