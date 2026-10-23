import { create } from "zustand";
import type { SyntropyTask, CreateTaskInput, UpdateTaskInput } from "@/types";
import { db, DEFAULT_PROJECT_ID } from "@/lib/db";
import { generateTaskId, getOrCreateDeviceId, generateOperationId } from "@/lib/generateId";
import { nextToggleStatus } from "@/lib/taskStatus";

interface TaskState {
  /** 当前加载的任务列表 */
  tasks: SyntropyTask[];

  /** 是否正在加载 */
  isLoading: boolean;

  /** 错误信息 */
  error: string | null;

  /** Lamport 时钟 */
  lamportClock: number;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** 加载指定项目的任务 */
  loadTasks: (projectId?: string) => Promise<void>;

  /** 创建新任务 */
  createTask: (input: CreateTaskInput) => Promise<SyntropyTask>;

  /** 更新任务 */
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>;

  /** 切换任务完成状态 */
  toggleTaskStatus: (id: string) => Promise<void>;

  /** 软删除任务 */
  deleteTask: (id: string) => Promise<void>;

  /** 递增 Lamport 时钟 */
  incrementClock: () => number;
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  lamportClock: 0,

  loadTasks: async (projectId?: string) => {
    set({ isLoading: true, error: null });

    try {
      await db.reconcileDeletedTasks();
      const tasks = await db.getActiveTasks(projectId);
      // 按创建时间倒序排列
      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      set({ tasks, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "加载任务失败",
        isLoading: false,
      });
    }
  },

  createTask: async (input: CreateTaskInput) => {
    const deviceId = getOrCreateDeviceId();
    const clock = get().incrementClock();
    const now = new Date().toISOString();

    const task: SyntropyTask = {
      id: await generateTaskId(),
      projectId: input.projectId || DEFAULT_PROJECT_ID,
      content: input.content,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      pic: input.pic,
      completedDate: input.completedDate,
      remark: input.remark,
      rawCommand: input.rawCommand,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: deviceId,
      updatedBy: deviceId,
    };

    // 写入数据库
    await db.tasks.add(task);

    // 记录操作日志
    await db.operations.add({
      id: generateOperationId(),
      type: "CREATE",
      entityType: "task",
      entityId: task.id,
      afterSnapshot: JSON.stringify(task),
      lamportClock: clock,
      timestamp: now,
      deviceId,
      synced: false,
    });

    // 更新本地状态 (添加到列表头部)
    set((state) => ({
      tasks: [task, ...state.tasks],
    }));

    return task;
  },

  updateTask: async (id: string, input: UpdateTaskInput) => {
    const deviceId = getOrCreateDeviceId();
    const clock = get().incrementClock();
    const now = new Date().toISOString();

    const existingTask = await db.tasks.get(id);
    if (!existingTask) {
      throw new Error(`任务 ${id} 不存在`);
    }

    const beforeSnapshot = JSON.stringify(existingTask);

    const updatedTask: SyntropyTask = {
      ...existingTask,
      ...input,
      version: existingTask.version + 1,
      updatedAt: now,
      updatedBy: deviceId,
    };

    // 清理 undefined 值：spread 会把 input 中 undefined 字段写入对象，
    // 显式删除以保持语义干净（Dexie/IndexedDB 不区分 undefined 和 absent）
    for (const key of Object.keys(updatedTask) as (keyof SyntropyTask)[]) {
      if (updatedTask[key] === undefined) {
        delete updatedTask[key];
      }
    }

    // 离开 completed 时必须清掉完成日，不能靠“不传字段”指望 spread 删掉旧值
    if (input.status && input.status !== "completed") {
      delete updatedTask.completedDate;
    }

    await db.tasks.put(updatedTask);

    // 记录操作日志
    await db.operations.add({
      id: generateOperationId(),
      type: "UPDATE",
      entityType: "task",
      entityId: id,
      beforeSnapshot,
      afterSnapshot: JSON.stringify(updatedTask),
      lamportClock: clock,
      timestamp: now,
      deviceId,
      synced: false,
    });

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
    }));
  },

  toggleTaskStatus: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = nextToggleStatus(task.status);

    const updates: UpdateTaskInput = { status: newStatus };
    if (newStatus === "completed") {
      updates.completedDate = new Date().toISOString().split("T")[0];
    }

    await get().updateTask(id, updates);
  },

  deleteTask: async (id: string) => {
    const deviceId = getOrCreateDeviceId();
    const clock = get().incrementClock();
    const now = new Date().toISOString();

    const existingTask = await db.tasks.get(id);
    if (!existingTask) {
      throw new Error(`任务 ${id} 不存在`);
    }

    const beforeSnapshot = JSON.stringify(existingTask);

    // 软删除
    const deletedTask: SyntropyTask = {
      ...existingTask,
      version: existingTask.version + 1,
      updatedAt: now,
      updatedBy: deviceId,
      deletedAt: now,
    };

    await db.tasks.put(deletedTask);

    // 记录操作日志
    await db.operations.add({
      id: generateOperationId(),
      type: "DELETE",
      entityType: "task",
      entityId: id,
      beforeSnapshot,
      afterSnapshot: JSON.stringify(deletedTask),
      lamportClock: clock,
      timestamp: now,
      deviceId,
      synced: false,
    });

    // 从本地状态移除
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  incrementClock: () => {
    const newClock = get().lamportClock + 1;
    set({ lamportClock: newClock });
    return newClock;
  },
}));
