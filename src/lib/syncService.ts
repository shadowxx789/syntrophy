/**
 * Sync Service
 * 凝序 Syntropy - Phase 5: User System
 *
 * Handles bidirectional sync between IndexedDB (local) and Supabase (cloud)
 * Architecture: Local-first with cloud backup
 */

import { db } from "./db";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import type { SyntropyTask, SyntropyProject } from "@/types";

// ============================================
// Types
// ============================================

export type SyncState = "idle" | "syncing" | "error" | "offline";

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: Date | null;
  pendingChanges: number;
  isOnline: boolean;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: { tasks: number; projects: number };
  downloaded: { tasks: number; projects: number };
  conflicts: ConflictItem[];
  errors: SyncError[];
}

export interface BackupResult {
  success: boolean;
  uploaded: { tasks: number; projects: number };
  errors: SyncError[];
}

type BackupMode = "incremental" | "full";

export interface ConflictItem {
  entityType: "task" | "project";
  entityId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  resolution: "local" | "remote";
}

export interface SyncError {
  entityType: "task" | "project";
  entityId: string;
  error: string;
}

// Remote data types from Supabase
interface RemoteTask {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "in_progress" | "completed" | "delayed" | "todo" | "done";
  pic?: string | null;
  completed_date?: string | null;
  remark?: string | null;
  priority?: "low" | "medium" | "high" | null;
  raw_command: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RemoteProject {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// Sync State Management
// ============================================

let syncStatus: SyncStatus = {
  state: "idle",
  lastSyncAt: null,
  pendingChanges: 0,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
};

const syncListeners: Set<(status: SyncStatus) => void> = new Set();

function notifyListeners() {
  syncListeners.forEach((listener) => listener(syncStatus));
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncListeners.add(listener);
  listener(syncStatus);
  return () => syncListeners.delete(listener);
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

// ============================================
// Device ID Management
// ============================================

const DEVICE_ID_KEY = "syntropy_device_id";

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// ============================================
// Core Sync Functions
// ============================================

/**
 * Initialize sync service
 * Call this after user login
 */
export async function initializeSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log("[Sync] Supabase not configured, running in local-only mode");
    return;
  }

  // Set up online/offline listeners
  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  // Initial sync
  await performSync(userId);
}

/**
 * Cleanup sync service
 * Call this on user logout
 */
export function cleanupSync(): void {
  if (typeof window !== "undefined") {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  }

  syncStatus = {
    state: "idle",
    lastSyncAt: null,
    pendingChanges: 0,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
  notifyListeners();
}

function handleOnline() {
  syncStatus.isOnline = true;
  syncStatus.state = "idle";
  notifyListeners();
}

function handleOffline() {
  syncStatus.isOnline = false;
  syncStatus.state = "offline";
  notifyListeners();
}

/**
 * Main sync function - pushes local changes and pulls remote changes
 */
export async function performSync(userId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      uploaded: { tasks: 0, projects: 0 },
      downloaded: { tasks: 0, projects: 0 },
      conflicts: [],
      errors: [],
    };
  }

  if (!syncStatus.isOnline) {
    return {
      success: false,
      uploaded: { tasks: 0, projects: 0 },
      downloaded: { tasks: 0, projects: 0 },
      conflicts: [],
      errors: [{ entityType: "task", entityId: "", error: "Offline" }],
    };
  }

  syncStatus.state = "syncing";
  notifyListeners();

  const result: SyncResult = {
    success: true,
    uploaded: { tasks: 0, projects: 0 },
    downloaded: { tasks: 0, projects: 0 },
    conflicts: [],
    errors: [],
  };

  try {
    // Step 1: Push local changes to cloud
    const pushResult = await pushChanges(userId, "incremental");
    result.uploaded = pushResult.uploaded;
    result.errors.push(...pushResult.errors);

    // Step 2: Pull remote changes to local
    const pullResult = await pullChanges(userId);
    result.downloaded = pullResult.downloaded;
    result.conflicts.push(...pullResult.conflicts);
    result.errors.push(...pullResult.errors);

    // Update sync metadata
    await updateSyncMetadata();

    syncStatus.state = "idle";
    syncStatus.lastSyncAt = new Date();
    syncStatus.pendingChanges = 0;
  } catch (error) {
    result.success = false;
    syncStatus.state = "error";
    syncStatus.error = error instanceof Error ? error.message : "Unknown sync error";
    result.errors.push({
      entityType: "task",
      entityId: "",
      error: syncStatus.error,
    });
  }

  notifyListeners();
  return result;
}

/**
 * Backup local data to cloud (push-only)
 */
export async function backupToCloud(userId: string): Promise<BackupResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      uploaded: { tasks: 0, projects: 0 },
      errors: [],
    };
  }

  if (!syncStatus.isOnline) {
    return {
      success: false,
      uploaded: { tasks: 0, projects: 0 },
      errors: [{ entityType: "task", entityId: "", error: "Offline" }],
    };
  }

  syncStatus.state = "syncing";
  notifyListeners();

  const result: BackupResult = {
    success: true,
    uploaded: { tasks: 0, projects: 0 },
    errors: [],
  };

  try {
    const pushResult = await pushChanges(userId, "incremental");
    result.uploaded = pushResult.uploaded;
    result.errors.push(...pushResult.errors);

    await updateSyncMetadata();

    syncStatus.state = "idle";
    syncStatus.lastSyncAt = new Date();
    syncStatus.pendingChanges = 0;

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    syncStatus.state = "error";
    syncStatus.error = error instanceof Error ? error.message : "Unknown backup error";
    result.errors.push({
      entityType: "task",
      entityId: "",
      error: syncStatus.error,
    });
  }

  notifyListeners();
  return result;
}

/**
 * Manual backup: upload ALL local rows to cloud (push-only)
 *
 * This avoids confusion where an incremental backup uploads 0 rows.
 */
export async function backupAllToCloud(userId: string): Promise<BackupResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      uploaded: { tasks: 0, projects: 0 },
      errors: [],
    };
  }

  if (!syncStatus.isOnline) {
    return {
      success: false,
      uploaded: { tasks: 0, projects: 0 },
      errors: [{ entityType: "task", entityId: "", error: "Offline" }],
    };
  }

  syncStatus.state = "syncing";
  notifyListeners();

  const result: BackupResult = {
    success: true,
    uploaded: { tasks: 0, projects: 0 },
    errors: [],
  };

  try {
    const pushResult = await pushChanges(userId, "full");
    result.uploaded = pushResult.uploaded;
    result.errors.push(...pushResult.errors);

    await updateSyncMetadata();

    syncStatus.state = "idle";
    syncStatus.lastSyncAt = new Date();
    syncStatus.pendingChanges = 0;

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    syncStatus.state = "error";
    syncStatus.error = error instanceof Error ? error.message : "Unknown backup error";
    result.errors.push({
      entityType: "task",
      entityId: "",
      error: syncStatus.error,
    });
  }

  notifyListeners();
  return result;
}

/**
 * Push local changes to Supabase
 */
async function pushChanges(
  userId: string,
  mode: BackupMode
): Promise<{ uploaded: { tasks: number; projects: number }; errors: SyncError[] }> {
  const supabase = getSupabaseClient();
  const deviceId = getDeviceId();
  const errors: SyncError[] = [];
  const uploaded = { tasks: 0, projects: 0 };

  let localTasks: SyntropyTask[];
  let localProjects: SyntropyProject[];

  if (mode === "full") {
    localTasks = await db.tasks.toArray();
    localProjects = await db.projects.toArray();
  } else {
    // Get last sync time
    const syncMeta = await db.syncMetadata.get(deviceId);
    const lastSyncAt = syncMeta?.lastSyncAt ? new Date(syncMeta.lastSyncAt) : new Date(0);

    // Get locally modified tasks
    localTasks = await db.tasks.filter((task) => new Date(task.updatedAt) > lastSyncAt).toArray();

    // Get locally modified projects
    localProjects = await db.projects
      .filter((project) => new Date(project.updatedAt) > lastSyncAt)
      .toArray();
  }

  // Upsert tasks to Supabase
  let useLegacySchema = false;

  for (const task of localTasks) {
    try {
      const taskData = useLegacySchema
        ? buildLegacyTaskPayload(task, userId)
        : buildExtendedTaskPayload(task, userId);

      const { error } = await supabase
        .from("tasks")
        .upsert(taskData as never, { onConflict: "id,user_id" });

      if (error) {
        if (!useLegacySchema && isMissingColumnError(error)) {
          useLegacySchema = true;
          const fallbackData = buildLegacyTaskPayload(task, userId);
          const { error: fallbackError } = await supabase
            .from("tasks")
            .upsert(fallbackData as never, { onConflict: "id,user_id" });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
      uploaded.tasks++;
    } catch (error) {
      errors.push({
        entityType: "task",
        entityId: task.id,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  // Upsert projects to Supabase
  for (const project of localProjects) {
    try {
      const projectData = {
        id: project.id,
        user_id: userId,
        name: project.name,
        display_order: project.displayOrder,
        color: project.color || null,
        is_archived: project.isArchived,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
        deleted_at: project.deletedAt || null,
      };

      const { error } = await supabase
        .from("projects")
        .upsert(projectData as never, { onConflict: "id,user_id" });

      if (error) throw error;
      uploaded.projects++;
    } catch (error) {
      errors.push({
        entityType: "project",
        entityId: project.id,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  return { uploaded, errors };
}

/**
 * Pull remote changes from Supabase
 */
async function pullChanges(userId: string): Promise<{
  downloaded: { tasks: number; projects: number };
  conflicts: ConflictItem[];
  errors: SyncError[];
}> {
  const supabase = getSupabaseClient();
  const deviceId = getDeviceId();
  const errors: SyncError[] = [];
  const conflicts: ConflictItem[] = [];
  const downloaded = { tasks: 0, projects: 0 };

  // Get last sync time
  const syncMeta = await db.syncMetadata.get(deviceId);
  const lastSyncAt = syncMeta?.lastSyncAt || "1970-01-01T00:00:00.000Z";

  // Fetch remote tasks updated since last sync
  const { data: remoteTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastSyncAt);

  if (tasksError) {
    errors.push({ entityType: "task", entityId: "", error: tasksError.message });
  } else if (remoteTasks) {
    for (const remoteTask of remoteTasks as unknown as RemoteTask[]) {
      const localTask = await db.tasks.get(remoteTask.id);

      if (localTask) {
        // Conflict detection: Last Write Wins
        const localUpdated = new Date(localTask.updatedAt);
        const remoteUpdated = new Date(remoteTask.updated_at);

        if (remoteUpdated > localUpdated) {
          // Remote wins - update local
          await db.tasks.put(mapRemoteTaskToLocal(remoteTask));
          downloaded.tasks++;
          conflicts.push({
            entityType: "task",
            entityId: remoteTask.id,
            localVersion: localTask as unknown as Record<string, unknown>,
            remoteVersion: remoteTask as unknown as Record<string, unknown>,
            resolution: "remote",
          });
        }
        // Else: local wins, already pushed in pushChanges
      } else {
        // New task from remote
        await db.tasks.put(mapRemoteTaskToLocal(remoteTask));
        downloaded.tasks++;
      }
    }
  }

  // Fetch remote projects updated since last sync
  const { data: remoteProjects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastSyncAt);

  if (projectsError) {
    errors.push({
      entityType: "project",
      entityId: "",
      error: projectsError.message,
    });
  } else if (remoteProjects) {
    for (const remoteProject of remoteProjects as unknown as RemoteProject[]) {
      const localProject = await db.projects.get(remoteProject.id);

      if (localProject) {
        const localUpdated = new Date(localProject.updatedAt);
        const remoteUpdated = new Date(remoteProject.updated_at);

        if (remoteUpdated > localUpdated) {
          await db.projects.put(mapRemoteProjectToLocal(remoteProject));
          downloaded.projects++;
          conflicts.push({
            entityType: "project",
            entityId: remoteProject.id,
            localVersion: localProject as unknown as Record<string, unknown>,
            remoteVersion: remoteProject as unknown as Record<string, unknown>,
            resolution: "remote",
          });
        }
      } else {
        await db.projects.put(mapRemoteProjectToLocal(remoteProject));
        downloaded.projects++;
      }
    }
  }

  return { downloaded, conflicts, errors };
}

/**
 * Update local sync metadata
 */
async function updateSyncMetadata(): Promise<void> {
  const deviceId = getDeviceId();
  const now = new Date().toISOString();

  const existing = await db.syncMetadata.get(deviceId);

  await db.syncMetadata.put({
    deviceId,
    lastSyncAt: now,
    lamportClock: (existing?.lamportClock ?? 0) + 1,
  });
}

// ============================================
// Data Mapping Helpers
// ============================================

function mapRemoteTaskToLocal(remote: RemoteTask): SyntropyTask {
  const status = normalizeRemoteStatus(remote.status);
  return {
    id: remote.id,
    projectId: remote.project_id,
    content: remote.content,
    startDate: remote.start_date || undefined,
    endDate: remote.end_date || undefined,
    status,
    pic: remote.pic || undefined,
    completedDate: remote.completed_date || undefined,
    remark: remote.remark || undefined,
    rawCommand: remote.raw_command || undefined,
    version: 1,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    deletedAt: remote.deleted_at || undefined,
    ownerId: remote.user_id,
    createdBy: remote.user_id,
    updatedBy: remote.user_id,
  };
}

function normalizeRemoteStatus(status: RemoteTask["status"]): SyntropyTask["status"] {
  if (status === "todo") return "pending";
  if (status === "done") return "completed";
  if (status === "pending") return "pending";
  if (status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "delayed") return "delayed";
  return "pending";
}

function mapStatusToLegacy(status: SyntropyTask["status"]): "todo" | "in_progress" | "done" {
  if (status === "completed") return "done";
  if (status === "in_progress") return "in_progress";
  if (status === "delayed") return "in_progress";
  return "todo";
}

function buildExtendedTaskPayload(task: SyntropyTask, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    project_id: task.projectId,
    content: task.content,
    start_date: task.startDate || null,
    end_date: task.endDate || null,
    status: task.status,
    pic: task.pic || null,
    completed_date: task.completedDate || null,
    remark: task.remark || null,
    raw_command: task.rawCommand || null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt || null,
  };
}

function buildLegacyTaskPayload(task: SyntropyTask, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    project_id: task.projectId,
    content: task.content,
    start_date: task.startDate || null,
    end_date: task.endDate || null,
    status: mapStatusToLegacy(task.status),
    priority: null,
    raw_command: task.rawCommand || null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt || null,
  };
}

function isMissingColumnError(error: unknown): boolean {
  if (!(error && typeof error === "object" && "message" in error)) return false;
  const message = String((error as { message?: string }).message || "");
  return message.includes("column") && message.includes("does not exist");
}

function mapRemoteProjectToLocal(remote: RemoteProject): SyntropyProject {
  return {
    id: remote.id,
    name: remote.name,
    displayOrder: remote.display_order,
    color: remote.color || undefined,
    isArchived: remote.is_archived,
    version: 1,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    deletedAt: remote.deleted_at || undefined,
    ownerId: remote.user_id,
    createdBy: remote.user_id,
    updatedBy: remote.user_id,
  };
}

// ============================================
// Full Restore (New Device)
// ============================================

/**
 * Full restore - download all data from cloud to local
 * Used when logging in on a new device
 */
export async function fullRestore(userId: string): Promise<{
  success: boolean;
  tasks: number;
  projects: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: true, tasks: 0, projects: 0 };
  }

  try {
    const supabase = getSupabaseClient();

    // Fetch all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (tasksError) throw tasksError;

    // Fetch all projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (projectsError) throw projectsError;

    // Clear local data and insert remote data
    await db.transaction("rw", [db.tasks, db.projects], async () => {
      await db.tasks.clear();
      await db.projects.clear();

      const tasksList = tasks as unknown as RemoteTask[] | null;
      const projectsList = projects as unknown as RemoteProject[] | null;

      if (tasksList && tasksList.length > 0) {
        await db.tasks.bulkPut(tasksList.map(mapRemoteTaskToLocal));
      }

      if (projectsList && projectsList.length > 0) {
        await db.projects.bulkPut(projectsList.map(mapRemoteProjectToLocal));
      }
    });

    // Update sync metadata
    await updateSyncMetadata();

    return {
      success: true,
      tasks: (tasks as unknown[] | null)?.length || 0,
      projects: (projects as unknown[] | null)?.length || 0,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "Restore failed")
          : "Restore failed";
    return {
      success: false,
      tasks: 0,
      projects: 0,
      error: message,
    };
  }
}
