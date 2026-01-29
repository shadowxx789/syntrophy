import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncMetadata, SyntropyProject, SyntropyTask } from "@/types";
import * as supabaseClient from "./supabaseClient";
import { backupAllToCloud, backupToCloud, fullRestore } from "./syncService";
import { db } from "./db";

type TableMock<T extends { id: string }> = {
  data: T[];
  clear: ReturnType<typeof vi.fn>;
  bulkPut: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  toArray: () => Promise<T[]>;
  filter: (predicate: (item: T) => boolean) => { toArray: () => Promise<T[]> };
};

type SupabaseMockOptions = {
  restoreTasks?: unknown[] | null;
  restoreProjects?: unknown[] | null;
  restoreTaskError?: { message: string } | null;
  restoreProjectError?: { message: string } | null;
  upsertError?: { message: string } | null;
};

type SupabaseMock = {
  from: (table: string) => {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gt: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  calls: {
    select: string[];
    eq: string[];
    gt: string[];
    is: string[];
    upsert: string[];
  };
};

const mockDbState = vi.hoisted(() => {
  const callOrder: string[] = [];

  const createTable = <T extends { id: string }>(name: "tasks" | "projects") => {
    const table: TableMock<T> = {
      data: [],
      clear: vi.fn(async () => {
        callOrder.push(`${name}.clear`);
        table.data = [];
      }),
      bulkPut: vi.fn(async (items: T[]) => {
        callOrder.push(`${name}.bulkPut`);
        table.data = [...items];
      }),
      put: vi.fn(async (item: T) => {
        const index = table.data.findIndex((entry) => entry.id === item.id);
        if (index >= 0) {
          table.data[index] = item;
        } else {
          table.data.push(item);
        }
      }),
      get: vi.fn(async (id: string) => table.data.find((entry) => entry.id === id)),
      toArray: async () => table.data,
      filter: (predicate: (item: T) => boolean) => ({
        toArray: async () => table.data.filter(predicate),
      }),
    };

    return table;
  };

  const tasks = createTable<SyntropyTask>("tasks");
  const projects = createTable<SyntropyProject>("projects");

  const syncMetadata = {
    data: new Map<string, SyncMetadata>(),
    get: vi.fn(async (deviceId: string) => syncMetadata.data.get(deviceId)),
    put: vi.fn(async (item: SyncMetadata) => {
      syncMetadata.data.set(item.deviceId, item);
    }),
  };

  const db = {
    tasks,
    projects,
    syncMetadata,
    transaction: vi.fn(async (_mode: "rw", _tables: unknown[], callback: () => Promise<void>) => {
      callOrder.push("transaction");
      await callback();
    }),
  };

  const reset = () => {
    tasks.data = [];
    projects.data = [];
    syncMetadata.data.clear();
    callOrder.length = 0;
  };

  return { db, tasks, projects, syncMetadata, callOrder, reset };
});

vi.mock("./db", () => ({
  db: mockDbState.db,
}));

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

const mockedSupabaseClient = vi.mocked(supabaseClient);

const baseTask = (overrides: Partial<SyntropyTask> = {}): SyntropyTask => ({
  id: "SYN-2026-0001",
  projectId: "PROJ-0001",
  content: "Remote task",
  status: "pending",
  pic: undefined,
  completedDate: undefined,
  remark: undefined,
  startDate: undefined,
  endDate: undefined,
  rawCommand: undefined,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: undefined,
  ownerId: "user-123",
  createdBy: "DEV-11111111",
  updatedBy: "DEV-11111111",
  ...overrides,
});

const baseProject = (overrides: Partial<SyntropyProject> = {}): SyntropyProject => ({
  id: "PROJ-0001",
  name: "Remote project",
  displayOrder: 0,
  color: undefined,
  isArchived: false,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: undefined,
  ownerId: "user-123",
  createdBy: "DEV-11111111",
  updatedBy: "DEV-11111111",
  ...overrides,
});

const createSupabaseMock = (options: SupabaseMockOptions = {}): SupabaseMock => {
  const calls = {
    select: [] as string[],
    eq: [] as string[],
    gt: [] as string[],
    is: [] as string[],
    upsert: [] as string[],
  };

  return {
    calls,
    from: (table: string) => {
      const query = {
        select: vi.fn(() => {
          calls.select.push(table);
          return query;
        }),
        eq: vi.fn(() => {
          calls.eq.push(table);
          return query;
        }),
        gt: vi.fn(async () => {
          calls.gt.push(table);
          return { data: [], error: null };
        }),
        is: vi.fn(async () => {
          calls.is.push(table);
          if (table === "tasks") {
            return { data: options.restoreTasks ?? [], error: options.restoreTaskError ?? null };
          }
          if (table === "projects") {
            return {
              data: options.restoreProjects ?? [],
              error: options.restoreProjectError ?? null,
            };
          }
          return { data: [], error: null };
        }),
        upsert: vi.fn(async () => {
          calls.upsert.push(table);
          return { error: options.upsertError ?? null };
        }),
      };

      return query;
    },
  };
};

beforeEach(() => {
  mockDbState.reset();
  vi.clearAllMocks();

  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });

  mockedSupabaseClient.isSupabaseConfigured.mockReturnValue(true);
});

describe("backupToCloud", () => {
  it("pushes local changes only (no pull)", async () => {
    const supabaseMock = createSupabaseMock();
    mockedSupabaseClient.getSupabaseClient.mockReturnValue(
      supabaseMock as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>
    );

    const tasksTable = db.tasks as unknown as TableMock<SyntropyTask>;
    const projectsTable = db.projects as unknown as TableMock<SyntropyProject>;

    tasksTable.data = [baseTask({ id: "SYN-2026-0002", updatedAt: "2026-01-02T00:00:00.000Z" })];
    projectsTable.data = [baseProject({ id: "PROJ-0002", updatedAt: "2026-01-02T00:00:00.000Z" })];

    const result = await backupToCloud("user-123");

    expect(result.success).toBe(true);
    expect(result.uploaded.tasks).toBe(1);
    expect(result.uploaded.projects).toBe(1);
    expect(supabaseMock.calls.select.length).toBe(0);
    expect(supabaseMock.calls.upsert.length).toBe(2);
  });

  it("returns safe result when Supabase is not configured", async () => {
    mockedSupabaseClient.isSupabaseConfigured.mockReturnValue(false);

    const result = await backupToCloud("user-123");

    expect(result.success).toBe(true);
    expect(result.uploaded).toEqual({ tasks: 0, projects: 0 });
    expect(result.errors).toEqual([]);
    expect(mockedSupabaseClient.getSupabaseClient).not.toHaveBeenCalled();
  });
});

describe("backupAllToCloud", () => {
  it("uploads all local rows regardless lastSyncAt", async () => {
    const supabaseMock = createSupabaseMock();
    mockedSupabaseClient.getSupabaseClient.mockReturnValue(
      supabaseMock as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>
    );

    // Force a stable device id so we can set sync metadata.
    const storage = globalThis.localStorage as unknown as {
      getItem: ReturnType<typeof vi.fn>;
      setItem: ReturnType<typeof vi.fn>;
    };
    storage.getItem.mockImplementation((key: string) =>
      key === "syntropy_device_id" ? "device-fixed" : null
    );

    const tasksTable = db.tasks as unknown as TableMock<SyntropyTask>;
    const projectsTable = db.projects as unknown as TableMock<SyntropyProject>;

    // These rows are "older" than lastSyncAt and would be skipped by incremental backup.
    tasksTable.data = [baseTask({ id: "SYN-2026-0002", updatedAt: "2026-01-01T00:00:00.000Z" })];
    projectsTable.data = [baseProject({ id: "PROJ-0002", updatedAt: "2026-01-01T00:00:00.000Z" })];

    const syncMetadataTable = db.syncMetadata as unknown as {
      data: Map<string, SyncMetadata>;
    };
    syncMetadataTable.data.set("device-fixed", {
      deviceId: "device-fixed",
      lastSyncAt: "2026-02-01T00:00:00.000Z",
      lamportClock: 1,
    });

    const result = await backupAllToCloud("user-123");

    expect(result.success).toBe(true);
    expect(result.uploaded.tasks).toBe(1);
    expect(result.uploaded.projects).toBe(1);
    expect(supabaseMock.calls.upsert.length).toBe(2);
  });
});

describe("fullRestore", () => {
  it("clears local tables before inserting remote data", async () => {
    const remoteTasks = [
      {
        id: "SYN-2026-1000",
        user_id: "user-123",
        project_id: "PROJ-0001",
        content: "Remote task",
        start_date: null,
        end_date: null,
        status: "pending",
        pic: null,
        completed_date: null,
        remark: null,
        priority: null,
        raw_command: null,
        created_at: "2026-01-10T00:00:00.000Z",
        updated_at: "2026-01-10T00:00:00.000Z",
        deleted_at: null,
      },
    ];

    const remoteProjects = [
      {
        id: "PROJ-0001",
        user_id: "user-123",
        name: "Remote project",
        display_order: 0,
        color: null,
        is_archived: false,
        created_at: "2026-01-10T00:00:00.000Z",
        updated_at: "2026-01-10T00:00:00.000Z",
        deleted_at: null,
      },
    ];

    const supabaseMock = createSupabaseMock({
      restoreTasks: remoteTasks,
      restoreProjects: remoteProjects,
    });
    mockedSupabaseClient.getSupabaseClient.mockReturnValue(
      supabaseMock as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>
    );

    const tasksTable = db.tasks as unknown as TableMock<SyntropyTask>;
    const projectsTable = db.projects as unknown as TableMock<SyntropyProject>;

    tasksTable.data = [baseTask({ id: "SYN-2026-OLD" })];
    projectsTable.data = [baseProject({ id: "PROJ-OLD" })];

    const result = await fullRestore("user-123");

    expect(result.success).toBe(true);
    expect(tasksTable.data.map((task) => task.id)).toEqual(["SYN-2026-1000"]);
    expect(projectsTable.data.map((project) => project.id)).toEqual(["PROJ-0001"]);
    expect(mockDbState.callOrder.indexOf("tasks.clear")).toBeLessThan(
      mockDbState.callOrder.indexOf("tasks.bulkPut")
    );
    expect(mockDbState.callOrder.indexOf("projects.clear")).toBeLessThan(
      mockDbState.callOrder.indexOf("projects.bulkPut")
    );
  });

  it("returns deterministic errors when Supabase fails", async () => {
    const supabaseMock = createSupabaseMock({
      restoreTaskError: { message: "Supabase unavailable" },
    });
    mockedSupabaseClient.getSupabaseClient.mockReturnValue(
      supabaseMock as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>
    );

    const result = await fullRestore("user-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Supabase unavailable");
    expect(result.tasks).toBe(0);
    expect(result.projects).toBe(0);
  });
});
