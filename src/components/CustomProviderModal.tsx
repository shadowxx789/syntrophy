"use client";

import { useState, useEffect } from "react";
// SavedCustomProvider type is used via store's return types
import { MAX_CUSTOM_PROVIDERS } from "@/types";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { COMMON_CUSTOM_PROVIDERS } from "@/lib/ai";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, AlertCircle } from "lucide-react";

interface CustomProviderModalProps {
  /** 编辑模式下的提供商 ID，添加模式下为 null */
  providerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 自定义提供商添加/编辑模态框
 */
export function CustomProviderModal({ providerId, open, onOpenChange }: CustomProviderModalProps) {
  const { savedCustomProviders, addCustomProvider, updateCustomProvider } = useSettingsStore();

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = providerId !== null;
  const existingProvider = isEditMode
    ? savedCustomProviders?.find((p) => p.id === providerId)
    : null;

  const currentCount = savedCustomProviders?.length || 0;
  const canAdd = currentCount < MAX_CUSTOM_PROVIDERS;

  // 初始化表单
  useEffect(() => {
    if (open) {
      if (existingProvider) {
        setName(existingProvider.name);
        setBaseUrl(existingProvider.baseUrl);
        setModel(existingProvider.model);
      } else {
        setName("");
        setBaseUrl("");
        setModel("");
      }
      setError(null);
    }
  }, [open, existingProvider]);

  // 选择预设模板
  const handleSelectPreset = (preset: (typeof COMMON_CUSTOM_PROVIDERS)[number]) => {
    setName(preset.name);
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
    setError(null);
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError("请输入配置名称");
      return false;
    }
    if (!baseUrl.trim()) {
      setError("请输入 API Base URL");
      return false;
    }
    if (!model.trim()) {
      setError("请输入模型名称");
      return false;
    }

    // 验证 URL 格式
    try {
      new URL(baseUrl.trim());
    } catch {
      setError("API Base URL 格式不正确");
      return false;
    }

    // 检查重名（排除当前编辑的配置）
    const isDuplicate = savedCustomProviders?.some(
      (p) => p.name === name.trim() && p.baseUrl === baseUrl.trim() && p.id !== providerId
    );
    if (isDuplicate) {
      setError("已存在相同名称和 URL 的配置");
      return false;
    }

    return true;
  };

  // 保存
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);

    try {
      if (isEditMode && providerId) {
        // 更新模式
        const success = updateCustomProvider(providerId, {
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
        });
        if (!success) {
          setError("更新失败，配置可能已被删除");
          return;
        }
      } else {
        // 添加模式
        if (!canAdd) {
          setError(`最多只能添加 ${MAX_CUSTOM_PROVIDERS} 个自定义配置`);
          return;
        }
        const result = addCustomProvider({
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
        });
        if (!result) {
          setError(`已达到最大配置数量限制 (${MAX_CUSTOM_PROVIDERS})`);
          return;
        }
      }

      onOpenChange(false);
    } catch (err) {
      console.error("保存自定义提供商失败:", err);
      setError("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "编辑自定义配置" : "添加自定义配置"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "修改自定义 AI 服务商配置"
              : `添加新的自定义 AI 服务商 (${currentCount}/${MAX_CUSTOM_PROVIDERS})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 预设模板选择 */}
          {!isEditMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">快速填充预设</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    选择预设模板...
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[350px]">
                  {COMMON_CUSTOM_PROVIDERS.map((preset) => (
                    <DropdownMenuItem key={preset.name} onClick={() => handleSelectPreset(preset)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">{preset.model}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* 名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">配置名称</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="如: Moonshot、本地 Ollama"
            />
          </div>

          {/* API Base URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://api.example.com/v1"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              需要兼容 OpenAI Chat Completions API 格式
            </p>
          </div>

          {/* 模型名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">模型名称</label>
            <Input
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setError(null);
              }}
              placeholder="如: gpt-4o, llama3.2, qwen2.5"
              className="font-mono text-sm"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !baseUrl.trim() || !model.trim() || isSaving}
          >
            {isSaving ? "保存中..." : isEditMode ? "保存修改" : "添加配置"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
