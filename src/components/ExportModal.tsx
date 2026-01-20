"use client";

import { useEffect, useState } from "react";
import type { SyntropyProject } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: SyntropyProject[];
  currentProjectId: string;
  onExport: (projectIds: string[]) => Promise<void> | void;
}

export function ExportModal({
  open,
  onOpenChange,
  projects,
  currentProjectId,
  onExport,
}: ExportModalProps) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([currentProjectId]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedProjectIds([currentProjectId]);
      setError(null);
    }
  }, [open, currentProjectId]);

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleExport = async () => {
    if (selectedProjectIds.length === 0) {
      setError("请至少选择一个项目");
      return;
    }

    setIsExporting(true);
    try {
      await onExport(selectedProjectIds);
      onOpenChange(false);
    } catch (err) {
      console.error("导出失败:", err);
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出项目</DialogTitle>
          <DialogDescription>选择要导出的项目，将生成单个 Excel 文件（多工作表）</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择项目</label>
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              {projects.map((project) => (
                <label key={project.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedProjectIds.includes(project.id)}
                    onCheckedChange={() => handleToggleProject(project.id)}
                  />
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.id === currentProjectId && (
                    <span className="text-xs text-muted-foreground">当前</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">已选 {selectedProjectIds.length} 个项目</p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "导出中..." : "开始导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
