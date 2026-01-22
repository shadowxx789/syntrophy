"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Upload, Mail, Settings, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { TabNav } from "@/components/TabNav";
import { TaskList } from "@/components/TaskList";
import { CommandInput } from "@/components/CommandInput";
import { TaskEditModal } from "@/components/TaskEditModal";
import { ImportModal } from "@/components/ImportModal";
import { EmailModal } from "@/components/EmailModal";
import { ExportModal } from "@/components/ExportModal";
import { UndoToast } from "@/components/UndoToast";
import { BottomBar } from "@/components/BottomBar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { exportStyledExcelForProjects } from "@/lib/styledExport";
import { db } from "@/lib/db";
import { useUndo } from "@/hooks/useUndo";
import type { SyntropyTask } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const { tasks, loadTasks } = useTaskStore();
  const { projects, currentProjectId, loadProjects, initializeDefaultProject } = useProjectStore();
  const { initialize: initSettings } = useSettingsStore();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Undo 功能
  const { recordAction, undoAction, pendingAction, clearPending, isUndoing } = useUndo();
  const [undoMessage, setUndoMessage] = useState("");

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        // 初始化设置
        initSettings();

        // 初始化默认项目
        await initializeDefaultProject();

        // 加载项目列表
        await loadProjects();

        setIsInitialized(true);
      } catch (error) {
        console.error("初始化失败:", error);
      }
    }

    init();
  }, [initSettings, initializeDefaultProject, loadProjects]);

  // 当项目切换时加载任务
  useEffect(() => {
    if (isInitialized && currentProjectId) {
      loadTasks(currentProjectId);
    }
  }, [isInitialized, currentProjectId, loadTasks]);

  // 获取当前项目名称
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentProjectName = currentProject?.name || "任务";

  // 导出 Excel
  const handleExport = () => {
    setExportModalOpen(true);
  };

  const handleExportProjects = async (projectIds: string[]) => {
    const selectedProjects = projects.filter((project) => projectIds.includes(project.id));
    const projectTasks = await Promise.all(
      selectedProjects.map(async (project) => ({
        projectName: project.name,
        tasks: await db.getActiveTasks(project.id),
      }))
    );

    const hasTasks = projectTasks.some((project) => project.tasks.length > 0);
    if (!hasTasks) {
      alert("所选项目没有任务可导出");
      return;
    }

    await exportStyledExcelForProjects(projectTasks);
  };

  // 编辑任务
  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
  };

  // 任务创建后的回调
  const handleTaskCreated = useCallback(
    (task: SyntropyTask) => {
      recordAction({
        type: "CREATE",
        entityType: "task",
        entityId: task.id,
        afterSnapshot: task,
      });
      setUndoMessage(`已添加任务: ${task.content.slice(0, 20)}...`);
    },
    [recordAction]
  );

  // 任务更新后的回调
  const handleTaskUpdated = useCallback(
    (task: SyntropyTask, beforeSnapshot: SyntropyTask) => {
      recordAction({
        type: "UPDATE",
        entityType: "task",
        entityId: task.id,
        beforeSnapshot,
        afterSnapshot: task,
      });
      setUndoMessage(`已更新任务: ${task.id}`);
    },
    [recordAction]
  );

  // 任务删除后的回调
  const handleTaskDeleted = useCallback(
    (task: SyntropyTask) => {
      recordAction({
        type: "DELETE",
        entityType: "task",
        entityId: task.id,
        beforeSnapshot: task,
        afterSnapshot: { ...task, deletedAt: new Date().toISOString() },
      });
      setUndoMessage(`已删除任务: ${task.content.slice(0, 20)}...`);
    },
    [recordAction]
  );

  // 执行撤销
  const handleUndo = async () => {
    if (pendingAction) {
      const success = await undoAction(pendingAction.id);
      if (success) {
        // 重新加载任务列表
        await loadTasks(currentProjectId);
      }
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">凝序</h1>
          <span className="text-sm text-muted-foreground">Syntropy</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop: Show all action buttons */}
          {/* Export Button - hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="hidden sm:inline-flex"
          >
            <Download className="mr-1 h-4 w-4" />
            导出
          </Button>

          {/* Email Button - hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailModalOpen(true)}
            className="hidden sm:inline-flex"
          >
            <Mail className="mr-1 h-4 w-4" />
            发送
          </Button>

          {/* Import Button - hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="hidden sm:inline-flex"
          >
            <Upload className="mr-1 h-4 w-4" />
            导入
          </Button>

          {/* Quick Mode Button - hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/quick")}
            className="hidden border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50 sm:inline-flex"
          >
            <Zap className="mr-1 h-4 w-4" />
            闪电
          </Button>

          {/* Settings Button - always visible */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/settings")}
            className="h-10 w-10 touch-manipulation"
            aria-label="设置"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNav />

      {/* Main Content - add padding bottom for mobile BottomBar */}
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        <TaskList onEditTask={handleEditTask} />
      </main>

      {/* Command Input */}
      <CommandInput
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        taskId={editingTaskId}
        open={!!editingTaskId}
        onOpenChange={(open) => {
          if (!open) setEditingTaskId(null);
        }}
      />

      {/* Import Modal */}
      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        projects={projects}
        currentProjectId={currentProjectId}
        onExport={handleExportProjects}
      />

      {/* Email Modal */}
      <EmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        tasks={tasks}
        projectName={currentProjectName}
        projects={projects}
        currentProjectId={currentProjectId}
      />

      {/* Undo Toast */}
      <UndoToast
        message={undoMessage}
        visible={!!pendingAction && !isUndoing}
        onUndo={handleUndo}
        onClose={clearPending}
        duration={5}
      />

      {/* Mobile Bottom Bar */}
      <BottomBar
        onExport={handleExport}
        onImport={() => setImportModalOpen(true)}
        onEmail={() => setEmailModalOpen(true)}
        onQuickMode={() => router.push("/quick")}
      />

      {/* Toast Container */}
      <Toaster />
    </div>
  );
}
