import Dexie, { type EntityTable } from "dexie";
import type { SyntropyTask, SyntropyProject, Operation, Counter, SyncMetadata } from "@/types";
import type { OfflineOperation } from "./offlineQueue";

/**
 * Syntropy 本地数据库
 * 使用 Dexie.js 封装 IndexedDB
 */
class SyntropyDatabase extends Dexie {
  /** 任务表 */
  tasks!: EntityTable<SyntropyTask, "id">;

  /** 项目表 */
  projects!: EntityTable<SyntropyProject, "id">;

  /** 操作日志表 - 用于离线同步 */
  operations!: EntityTable<Operation, "id">;

  /** 计数器表 - 用于 ID 生成 */
  counters!: EntityTable<Counter, "name">;

  /** 同步元数据表 */
  syncMetadata!: EntityTable<SyncMetadata, "deviceId">;

  /** 离线操作队列 */
  offlineQueue!: EntityTable<OfflineOperation, "id">;

  constructor() {
    super("SyntropyDB");

    // 版本 1: 初始 Schema
    this.version(1).stores({
      // 任务表索引
      tasks: "id, projectId, status, createdAt, updatedAt, deletedAt, ownerId",

      // 项目表索引
      projects: "id, displayOrder, isArchived, createdAt, deletedAt, ownerId",

      // 操作日志索引 - 按时间排序，按同步状态过滤
      operations: "id, entityType, entityId, timestamp, synced, lamportClock",

      // 计数器表 - 主键是 name
      counters: "name",

      // 同步元数据表
      syncMetadata: "deviceId",

      // 离线操作队列
      offlineQueue: "id, entityType, entityId, timestamp",
    });

    // 版本 2: 重构任务数据结构（删除 priority，新增 pic/completedDate/remark，更新 status）
    this.version(2)
      .stores({
        // 任务表索引（保持不变）
        tasks: "id, projectId, status, createdAt, updatedAt, deletedAt, ownerId",
        projects: "id, displayOrder, isArchived, createdAt, deletedAt, ownerId",
        operations: "id, entityType, entityId, timestamp, synced, lamportClock",
        counters: "name",
        syncMetadata: "deviceId",
        offlineQueue: "id, entityType, entityId, timestamp",
      })
      .upgrade(async (tx) => {
        // 数据迁移：
        // 1. status: "todo" -> "pending", "done" -> "completed"
        // 2. 删除 priority 字段（Dexie 会自动忽略旧字段）
        const tasks = await tx.table("tasks").toArray();
        const updates: SyntropyTask[] = [];

        for (const task of tasks) {
          const updatedTask: SyntropyTask = { ...task };

          // 迁移状态
          if (task.status === "todo") {
            updatedTask.status = "pending";
          } else if (task.status === "done") {
            updatedTask.status = "completed";
          }

          // 如果是 completed 状态且有 endDate，则设置 completedDate
          if (updatedTask.status === "completed" && task.endDate) {
            updatedTask.completedDate = task.endDate;
          }

          // 删除 priority（通过不包含该字段来实现）
          delete (updatedTask as unknown as { priority?: string }).priority;

          updates.push(updatedTask);
        }

        await tx.table("tasks").bulkPut(updates);
      });

    // 映射类型 (Dexie 4.x 语法)
    this.tasks.mapToClass(
      class implements SyntropyTask {
        id!: string;
        projectId!: string;
        content!: string;
        startDate?: string;
        endDate?: string;
        status!: "pending" | "in_progress" | "completed" | "delayed";
        pic?: string;
        completedDate?: string;
        remark?: string;
        rawCommand?: string;
        version!: number;
        createdAt!: string;
        updatedAt!: string;
        deletedAt?: string;
        ownerId?: string;
        createdBy!: string;
        updatedBy!: string;
      }
    );
  }

  /**
   * 获取所有未删除的任务
   */
  async getActiveTasks(projectId?: string): Promise<SyntropyTask[]> {
    let query = this.tasks.filter((task) => !task.deletedAt);

    if (projectId) {
      query = this.tasks.filter((task) => task.projectId === projectId && !task.deletedAt);
    }

    return await query.toArray();
  }

  /**
   * 修复历史删除记录：为缺失 deletedAt 的任务补全删除标记
   */
  async reconcileDeletedTasks(): Promise<number> {
    const deleteOps = await this.operations
      .filter((op) => op.entityType === "task" && op.type === "DELETE")
      .toArray();

    if (deleteOps.length === 0) {
      return 0;
    }

    let updatedCount = 0;
    for (const op of deleteOps) {
      const task = await this.tasks.get(op.entityId);
      if (task && !task.deletedAt) {
        await this.tasks.put({
          ...task,
          deletedAt: op.timestamp,
          updatedAt: op.timestamp,
          version: task.version + 1,
        });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * 获取所有未归档的项目
   */
  async getActiveProjects(): Promise<SyntropyProject[]> {
    return await this.projects
      .filter((project) => !project.deletedAt && !project.isArchived)
      .sortBy("displayOrder");
  }

  /**
   * 获取未同步的操作日志
   */
  async getPendingOperations(): Promise<Operation[]> {
    return await this.operations.filter((op) => !op.synced).sortBy("lamportClock");
  }

  /**
   * 标记操作为已同步
   */
  async markOperationsSynced(operationIds: string[]): Promise<void> {
    await this.operations.where("id").anyOf(operationIds).modify({ synced: true });
  }

  /**
   * 清理已同步的旧操作日志 (保留最近 7 天)
   */
  async cleanupOldOperations(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    const oldOps = await this.operations
      .filter((op) => op.synced && op.timestamp < cutoffDate)
      .toArray();

    const idsToDelete = oldOps.map((op) => op.id);
    await this.operations.bulkDelete(idsToDelete);

    return idsToDelete.length;
  }
}

// 单例导出
export const db = new SyntropyDatabase();

// 默认项目常量
export const DEFAULT_PROJECT_ID = "PROJ-0001";
export const DEFAULT_PROJECT_NAME = "默认项目";
