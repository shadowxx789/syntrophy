import { create } from "zustand";
import type { SyntropyProject, CreateProjectInput } from "@/types";
import { db, DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME } from "@/lib/db";
import { generateProjectId, getOrCreateDeviceId, generateOperationId } from "@/lib/generateId";

interface ProjectState {
  /** 所有项目列表 */
  projects: SyntropyProject[];

  /** 当前选中的项目 ID */
  currentProjectId: string;

  /** 是否正在加载 */
  isLoading: boolean;

  /** 错误信息 */
  error: string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** 加载所有项目 */
  loadProjects: () => Promise<void>;

  /** 初始化默认项目 (如果不存在) */
  initializeDefaultProject: () => Promise<void>;

  /** 创建新项目 */
  createProject: (input: CreateProjectInput) => Promise<SyntropyProject>;

  /** 重命名项目 */
  renameProject: (id: string, name: string) => Promise<void>;

  /** 删除项目 (归档) */
  archiveProject: (id: string) => Promise<void>;

  /** 切换当前项目 */
  setCurrentProject: (id: string) => void;

  /** 更新项目顺序 */
  reorderProjects: (projectIds: string[]) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  currentProjectId: DEFAULT_PROJECT_ID,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });

    try {
      const projects = await db.getActiveProjects();
      set({ projects, isLoading: false });

      // 如果当前项目不在列表中，切换到第一个项目
      const currentId = get().currentProjectId;
      if (!projects.find((p) => p.id === currentId) && projects.length > 0) {
        set({ currentProjectId: projects[0].id });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "加载项目失败",
        isLoading: false,
      });
    }
  },

  initializeDefaultProject: async () => {
    const existing = await db.projects.get(DEFAULT_PROJECT_ID);

    if (!existing) {
      const deviceId = getOrCreateDeviceId();
      const now = new Date().toISOString();

      const defaultProject: SyntropyProject = {
        id: DEFAULT_PROJECT_ID,
        name: DEFAULT_PROJECT_NAME,
        displayOrder: 0,
        isArchived: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: deviceId,
        updatedBy: deviceId,
      };

      await db.projects.add(defaultProject);

      // 记录操作日志
      await db.operations.add({
        id: generateOperationId(),
        type: "CREATE",
        entityType: "project",
        entityId: DEFAULT_PROJECT_ID,
        afterSnapshot: JSON.stringify(defaultProject),
        lamportClock: 1,
        timestamp: now,
        deviceId,
        synced: false,
      });
    }
  },

  createProject: async (input: CreateProjectInput) => {
    const deviceId = getOrCreateDeviceId();
    const now = new Date().toISOString();

    // 获取最大 displayOrder
    const projects = get().projects;
    const maxOrder = projects.reduce((max, p) => Math.max(max, p.displayOrder), -1);

    const project: SyntropyProject = {
      id: await generateProjectId(),
      name: input.name,
      displayOrder: maxOrder + 1,
      color: input.color,
      isArchived: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: deviceId,
      updatedBy: deviceId,
    };

    await db.projects.add(project);

    // 记录操作日志
    await db.operations.add({
      id: generateOperationId(),
      type: "CREATE",
      entityType: "project",
      entityId: project.id,
      afterSnapshot: JSON.stringify(project),
      lamportClock: Date.now(), // 简化的时钟
      timestamp: now,
      deviceId,
      synced: false,
    });

    set((state) => ({
      projects: [...state.projects, project],
    }));

    return project;
  },

  renameProject: async (id: string, name: string) => {
    const deviceId = getOrCreateDeviceId();
    const now = new Date().toISOString();

    const existing = await db.projects.get(id);
    if (!existing) {
      throw new Error(`项目 ${id} 不存在`);
    }

    const beforeSnapshot = JSON.stringify(existing);

    const updated: SyntropyProject = {
      ...existing,
      name,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: deviceId,
    };

    await db.projects.put(updated);

    await db.operations.add({
      id: generateOperationId(),
      type: "UPDATE",
      entityType: "project",
      entityId: id,
      beforeSnapshot,
      afterSnapshot: JSON.stringify(updated),
      lamportClock: Date.now(),
      timestamp: now,
      deviceId,
      synced: false,
    });

    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  archiveProject: async (id: string) => {
    if (id === DEFAULT_PROJECT_ID) {
      throw new Error("无法删除默认项目");
    }

    const deviceId = getOrCreateDeviceId();
    const now = new Date().toISOString();

    const existing = await db.projects.get(id);
    if (!existing) {
      throw new Error(`项目 ${id} 不存在`);
    }

    const beforeSnapshot = JSON.stringify(existing);

    const archived: SyntropyProject = {
      ...existing,
      isArchived: true,
      deletedAt: now,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: deviceId,
    };

    await db.projects.put(archived);

    await db.operations.add({
      id: generateOperationId(),
      type: "DELETE",
      entityType: "project",
      entityId: id,
      beforeSnapshot,
      afterSnapshot: JSON.stringify(archived),
      lamportClock: Date.now(),
      timestamp: now,
      deviceId,
      synced: false,
    });

    // 如果删除的是当前项目，切换到默认项目
    const currentId = get().currentProjectId;
    const newCurrentId = currentId === id ? DEFAULT_PROJECT_ID : currentId;

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: newCurrentId,
    }));
  },

  setCurrentProject: (id: string) => {
    set({ currentProjectId: id });
  },

  reorderProjects: async (projectIds: string[]) => {
    const deviceId = getOrCreateDeviceId();
    const now = new Date().toISOString();

    // 批量更新 displayOrder
    await db.transaction("rw", db.projects, async () => {
      for (let i = 0; i < projectIds.length; i++) {
        const project = await db.projects.get(projectIds[i]);
        if (project) {
          await db.projects.update(project.id, {
            displayOrder: i,
            updatedAt: now,
            updatedBy: deviceId,
            version: project.version + 1,
          });
        }
      }
    });

    // 重新加载
    await get().loadProjects();
  },
}));
