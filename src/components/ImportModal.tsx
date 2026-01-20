"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiDiffPreview } from "@/components/MultiDiffPreview";
import {
  parseExcelWorkbook,
  type WorkbookParseResult,
  type SheetParseResult,
} from "@/lib/importExcel";
import { diffMultipleSheets, getMultiDiffSummary, hasMultiDiffChanges } from "@/lib/diffEngine";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { SheetMapping, MultiProjectDiffResult, SyntropyTask } from "@/types";
import { IMPORT_NEW_PROJECT_ID } from "@/types";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "done";

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [workbookResult, setWorkbookResult] = useState<WorkbookParseResult | null>(null);
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);
  const [multiDiffResult, setMultiDiffResult] = useState<MultiProjectDiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string>("");

  const { createTask, updateTask, deleteTask, loadTasks } = useTaskStore();
  const { projects, currentProjectId, createProject } = useProjectStore();

  // 重置状态
  const resetState = () => {
    setStep("upload");
    setWorkbookResult(null);
    setSheetMappings([]);
    setMultiDiffResult(null);
    setError(null);
    setImportProgress("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const result = await parseExcelWorkbook(file);
      setWorkbookResult(result);

      // 过滤出有任务的 Sheet
      const validSheets = result.sheets.filter((s) => s.tasks.length > 0);

      if (validSheets.length === 0) {
        setError("Excel 文件中没有找到有效任务");
        return;
      }

      // 初始化 Sheet 映射 - 精确匹配项目名
      const initialMappings: SheetMapping[] = validSheets.map((sheet) => {
        const matchedProject = projects.find(
          (p) => p.name.trim().toLowerCase() === sheet.sheetName.trim().toLowerCase()
        );
        return {
          sheetName: sheet.sheetName,
          targetProjectId: matchedProject?.id || null,
          newProjectName: sheet.sheetName,
        };
      });

      setSheetMappings(initialMappings);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件解析失败");
    }
  };

  // 更新单个 Sheet 的映射
  const updateMapping = (sheetName: string, targetProjectId: string | null) => {
    setSheetMappings((prev) =>
      prev.map((m) =>
        m.sheetName === sheetName
          ? {
              ...m,
              targetProjectId,
              newProjectName: targetProjectId === IMPORT_NEW_PROJECT_ID ? sheetName : undefined,
            }
          : m
      )
    );
  };

  // 更新新项目名称
  const updateNewProjectName = (sheetName: string, name: string) => {
    setSheetMappings((prev) =>
      prev.map((m) => (m.sheetName === sheetName ? { ...m, newProjectName: name } : m))
    );
  };

  // 确认映射，生成差异预览
  const handleConfirmMapping = async () => {
    if (!workbookResult) return;

    const activeMappings = sheetMappings.filter((m) => m.targetProjectId);
    if (activeMappings.length === 0) {
      setError("请至少选择一个项目进行导入");
      return;
    }

    setError(null);

    try {
      // 获取各项目的现有任务
      const projectTasksMap = new Map<string, SyntropyTask[]>();
      const projectNamesMap = new Map<string, string>();

      for (const mapping of activeMappings) {
        if (mapping.targetProjectId && mapping.targetProjectId !== IMPORT_NEW_PROJECT_ID) {
          const tasks = await db.getActiveTasks(mapping.targetProjectId);
          projectTasksMap.set(mapping.targetProjectId, tasks);
          const project = projects.find((p) => p.id === mapping.targetProjectId);
          if (project) {
            projectNamesMap.set(mapping.targetProjectId, project.name);
          }
        }
      }

      // 计算多项目差异
      const validSheets = workbookResult.sheets.filter((s) => s.tasks.length > 0);
      const diffResult = diffMultipleSheets(
        validSheets,
        activeMappings,
        projectTasksMap,
        projectNamesMap
      );

      setMultiDiffResult(diffResult);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成差异预览失败");
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!multiDiffResult || !workbookResult) return;

    setStep("importing");
    setError(null);

    try {
      // 先创建新项目
      const newProjectIdMap = new Map<string, string>();

      for (const pd of multiDiffResult.projectDiffs) {
        if (pd.isNewProject) {
          setImportProgress(`正在创建项目: ${pd.projectName}`);
          const mapping = sheetMappings.find((m) => m.sheetName === pd.sheetName);
          const newProject = await createProject({
            name: mapping?.newProjectName || pd.sheetName,
          });
          newProjectIdMap.set(pd.sheetName, newProject.id);
        }
      }

      // 执行各项目的导入
      for (const pd of multiDiffResult.projectDiffs) {
        const actualProjectId = pd.isNewProject ? newProjectIdMap.get(pd.sheetName)! : pd.projectId;

        setImportProgress(`正在导入: ${pd.projectName}`);

        // 处理新增
        for (const task of pd.diff.added) {
          await createTask({
            content: task.content,
            projectId: actualProjectId,
            startDate: task.startDate,
            endDate: task.endDate,
            pic: task.pic,
            completedDate: task.completedDate,
            remark: task.remark,
          });
        }

        // 处理修改
        for (const diff of pd.diff.modified) {
          await updateTask(diff.id, {
            content: diff.after.content,
            status: diff.after.status,
            pic: diff.after.pic,
            startDate: diff.after.startDate,
            endDate: diff.after.endDate,
            completedDate: diff.after.completedDate,
            remark: diff.after.remark,
          });
        }

        // 处理删除
        for (const task of pd.diff.deleted) {
          await deleteTask(task.id);
        }
      }

      // 重新加载当前项目任务
      await loadTasks(currentProjectId);

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
      setStep("preview");
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // 获取有效 Sheet 数量
  const validSheetCount = workbookResult?.sheets.filter((s) => s.tasks.length > 0).length || 0;
  const selectedMappingCount = sheetMappings.filter((m) => m.targetProjectId).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "导入 Excel"}
            {step === "mapping" && "选择目标项目"}
            {step === "preview" && "预览变更"}
            {step === "importing" && "导入中..."}
            {step === "done" && "导入完成"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "选择要导入的 Excel 文件，支持多 Sheet 导入"}
            {step === "mapping" &&
              `已解析 ${validSheetCount} 个 Sheet，请为每个 Sheet 选择目标项目`}
            {step === "preview" && multiDiffResult && getMultiDiffSummary(multiDiffResult)}
            {step === "importing" && importProgress}
            {step === "done" && "所有变更已成功应用"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* 上传步骤 */}
          {step === "upload" && (
            <div className="space-y-4 py-4">
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">点击选择文件</p>
                <p className="mt-1 text-xs text-muted-foreground">支持 .xlsx, .xls 格式</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">Excel 格式要求：</p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <li>• 每个 Sheet 可导入为一个项目</li>
                  <li>• 第一行为表头（ID、内容、状态、优先级、截止日期）</li>
                  <li>• Sheet 名称与项目名称匹配时自动关联</li>
                </ul>
              </div>
            </div>
          )}

          {/* 映射步骤 */}
          {step === "mapping" && workbookResult && (
            <div className="space-y-4 py-4">
              {/* Sheet 列表 */}
              <div className="space-y-3">
                {workbookResult.sheets
                  .filter((s) => s.tasks.length > 0)
                  .map((sheet) => {
                    const mapping = sheetMappings.find((m) => m.sheetName === sheet.sheetName);
                    return (
                      <SheetMappingRow
                        key={sheet.sheetName}
                        sheet={sheet}
                        mapping={mapping}
                        projects={projects}
                        onTargetChange={(targetId) => updateMapping(sheet.sheetName, targetId)}
                        onNewNameChange={(name) => updateNewProjectName(sheet.sheetName, name)}
                      />
                    );
                  })}
              </div>

              {/* 空 Sheet 提示 */}
              {workbookResult.sheets.some((s) => s.tasks.length === 0) && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <p>以下 Sheet 为空或无有效数据，将被跳过：</p>
                  <p className="mt-1 text-xs">
                    {workbookResult.sheets
                      .filter((s) => s.tasks.length === 0)
                      .map((s) => s.sheetName)
                      .join("、")}
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* 预览步骤 */}
          {step === "preview" && multiDiffResult && (
            <div className="space-y-4 py-4">
              <MultiDiffPreview result={multiDiffResult} />

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* 导入中 */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">{importProgress || "正在导入..."}</p>
            </div>
          )}

          {/* 完成 */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="h-10 w-10 text-green-500" />
              <p className="mt-4 font-medium">导入成功！</p>
              {multiDiffResult && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {getMultiDiffSummary(multiDiffResult)}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}

          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={resetState}>
                重新选择
              </Button>
              <Button onClick={handleConfirmMapping} disabled={selectedMappingCount === 0}>
                下一步
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                返回修改
              </Button>
              <Button
                onClick={handleImport}
                disabled={!multiDiffResult || !hasMultiDiffChanges(multiDiffResult)}
              >
                确认导入
              </Button>
            </>
          )}

          {step === "done" && <Button onClick={handleClose}>完成</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sheet 映射行组件
interface SheetMappingRowProps {
  sheet: SheetParseResult;
  mapping: SheetMapping | undefined;
  projects: { id: string; name: string }[];
  onTargetChange: (targetId: string | null) => void;
  onNewNameChange: (name: string) => void;
}

function SheetMappingRow({
  sheet,
  mapping,
  projects,
  onTargetChange,
  onNewNameChange,
}: SheetMappingRowProps) {
  const targetId = mapping?.targetProjectId || "";
  const isNewProject = targetId === IMPORT_NEW_PROJECT_ID;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Sheet 信息 */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{sheet.sheetName}</p>
          <p className="text-xs text-muted-foreground">
            {sheet.tasks.length} 条任务
            {sheet.errors.length > 0 && (
              <span className="ml-2 text-yellow-600">({sheet.errors.length} 条解析失败)</span>
            )}
          </p>
        </div>

        {/* 目标选择 */}
        <select
          value={targetId}
          onChange={(e) => onTargetChange(e.target.value || null)}
          className={cn(
            "h-9 rounded-md border border-input bg-background px-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            !targetId && "text-muted-foreground"
          )}
        >
          <option value="">跳过此 Sheet</option>
          <option value={IMPORT_NEW_PROJECT_ID}>+ 创建新项目</option>
          <optgroup label="现有项目">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 新项目名称输入 */}
      {isNewProject && (
        <div className="mt-2">
          <input
            type="text"
            value={mapping?.newProjectName || ""}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="新项目名称"
            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </div>
  );
}
