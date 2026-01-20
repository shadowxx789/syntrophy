"use client";

import { useState } from "react";
import type { SavedCustomProvider } from "@/types";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Pencil, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";
import { validateApiKey } from "@/lib/ai";

interface CustomProviderCardProps {
  provider: SavedCustomProvider;
  onEdit: (providerId: string) => void;
}

/**
 * 自定义提供商配置卡片
 * 显示配置详情，支持编辑、删除和 API Key 管理
 */
export function CustomProviderCard({ provider, onEdit }: CustomProviderCardProps) {
  const { deleteCustomProvider, updateCustomProviderApiKey } = useSettingsStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [maskedKey, setMaskedKey] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"success" | "error" | null>(null);
  const [isLoadingMask, setIsLoadingMask] = useState(false);

  // 加载已保存的 API Key 掩码
  const loadMaskedKey = async () => {
    if (provider.encryptedApiKey) {
      setIsLoadingMask(true);
      try {
        const decrypted = await decryptApiKey(provider.encryptedApiKey);
        setMaskedKey(maskApiKey(decrypted));
      } catch {
        setMaskedKey("（解密失败）");
      } finally {
        setIsLoadingMask(false);
      }
    } else {
      setMaskedKey("");
    }
  };

  // 首次渲染加载掩码
  useState(() => {
    loadMaskedKey();
  });

  // 验证并保存 API Key
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const isValid = await validateApiKey({
        provider: "custom",
        apiKey: apiKeyInput.trim(),
        customConfig: {
          name: provider.name,
          baseUrl: provider.baseUrl,
          model: provider.model,
        },
      });

      if (isValid) {
        const encrypted = await encryptApiKey(apiKeyInput.trim());
        updateCustomProviderApiKey(provider.id, encrypted);
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
    updateCustomProviderApiKey(provider.id, undefined);
    setMaskedKey("");
    setApiKeyInput("");
    setValidationResult(null);
  };

  // 删除配置
  const handleDelete = () => {
    deleteCustomProvider(provider.id);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      {/* 头部：名称和操作按钮 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{provider.name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{provider.id}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(provider.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除配置</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除 &quot;{provider.name}&quot; 吗？此操作无法撤销，关联的 API Key
                  也将被删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 配置详情 */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Base URL: </span>
          <code className="rounded bg-muted px-1 font-mono text-xs">{provider.baseUrl}</code>
        </div>
        <div>
          <span className="text-muted-foreground">模型: </span>
          <code className="rounded bg-muted px-1 font-mono text-xs">{provider.model}</code>
        </div>
        {provider.lastUsedAt && (
          <div className="text-xs text-muted-foreground">
            最后使用: {new Date(provider.lastUsedAt).toLocaleString("zh-CN")}
          </div>
        )}
      </div>

      {/* API Key 管理 */}
      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-medium">API Key</label>

        {/* 已保存的 Key */}
        {isLoadingMask ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : maskedKey ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span className="flex-1 font-mono text-sm">{maskedKey}</span>
            <Button variant="ghost" size="sm" onClick={handleClearApiKey}>
              清除
            </Button>
          </div>
        ) : null}

        {/* 输入新 Key */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setValidationResult(null);
              }}
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
          <Button
            onClick={handleSaveApiKey}
            disabled={!apiKeyInput.trim() || isValidating}
            size="sm"
          >
            {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "验证"}
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
            验证失败，请检查 API Key 是否正确
          </p>
        )}
      </div>
    </div>
  );
}
