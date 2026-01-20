import { describe, it, expect, vi, beforeEach } from "vitest";
import { diffTasks, getDiffSummary, hasDiffChanges } from "./diffEngine";
import type { SyntropyTask, DiffResult } from "@/types";
import type { ImportedTask } from "./importExcel";

// Mock dates for consistent testing
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-18T10:00:00.000Z"));
});

const createExistingTask = (overrides: Partial<SyntropyTask> = {}): SyntropyTask => ({
  id: "SYN-2026-0001",
  projectId: "PROJ-0001",
  content: "Test task",
  status: "pending",
  pic: undefined,
  completedDate: undefined,
  remark: undefined,
  startDate: undefined,
  endDate: undefined,
  version: 1,
  createdAt: "2026-01-17T10:00:00.000Z",
  updatedAt: "2026-01-17T10:00:00.000Z",
  createdBy: "DEV-12345678",
  updatedBy: "DEV-12345678",
  ...overrides,
});

const createImportedTask = (overrides: Partial<ImportedTask> = {}): ImportedTask => ({
  rowNumber: 1,
  content: "Test task",
  status: "pending",
  pic: undefined,
  completedDate: undefined,
  remark: undefined,
  startDate: undefined,
  endDate: undefined,
  ...overrides,
});

describe("diffTasks", () => {
  it("should detect new tasks (no ID in imported)", () => {
    const imported: ImportedTask[] = [createImportedTask({ content: "New task" })];
    const existing: SyntropyTask[] = [];

    const result = diffTasks(imported, existing);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].content).toBe("New task");
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  it("should detect new tasks (ID not found in existing)", () => {
    const imported: ImportedTask[] = [
      createImportedTask({ id: "SYN-2026-9999", content: "New task with unknown ID" }),
    ];
    const existing: SyntropyTask[] = [createExistingTask()];

    const result = diffTasks(imported, existing);

    expect(result.added).toHaveLength(1);
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(1); // existing task not in imported
  });

  it("should detect modified tasks", () => {
    const imported: ImportedTask[] = [
      createImportedTask({
        id: "SYN-2026-0001",
        content: "Updated content",
        status: "completed",
      }),
    ];
    const existing: SyntropyTask[] = [createExistingTask()];

    const result = diffTasks(imported, existing);

    expect(result.added).toHaveLength(0);
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].changedFields).toContain("content");
    expect(result.modified[0].changedFields).toContain("status");
    expect(result.deleted).toHaveLength(0);
  });

  it("should detect deleted tasks", () => {
    const imported: ImportedTask[] = [
      createImportedTask({ id: "SYN-2026-0002", content: "Another task" }),
    ];
    const existing: SyntropyTask[] = [
      createExistingTask({ id: "SYN-2026-0001" }),
      createExistingTask({ id: "SYN-2026-0002", content: "Another task" }),
    ];

    const result = diffTasks(imported, existing);

    expect(result.deleted).toHaveLength(1);
    expect(result.deleted[0].id).toBe("SYN-2026-0001");
  });

  it("should not detect deletions when imported has no IDs", () => {
    const imported: ImportedTask[] = [createImportedTask({ content: "New task without ID" })];
    const existing: SyntropyTask[] = [createExistingTask()];

    const result = diffTasks(imported, existing);

    expect(result.deleted).toHaveLength(0);
    expect(result.added).toHaveLength(1);
  });

  it("should handle empty imports", () => {
    const imported: ImportedTask[] = [];
    const existing: SyntropyTask[] = [createExistingTask()];

    const result = diffTasks(imported, existing);

    expect(result.added).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  it("should handle identical tasks (no changes)", () => {
    const imported: ImportedTask[] = [
      createImportedTask({
        id: "SYN-2026-0001",
        content: "Test task",
        status: "pending",
      }),
    ];
    const existing: SyntropyTask[] = [createExistingTask()];

    const result = diffTasks(imported, existing);

    expect(result.added).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  it("should detect pic changes", () => {
    const imported: ImportedTask[] = [
      createImportedTask({
        id: "SYN-2026-0001",
        pic: "Alice",
      }),
    ];
    const existing: SyntropyTask[] = [createExistingTask({ pic: "Bob" })];

    const result = diffTasks(imported, existing);

    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].changedFields).toContain("pic");
  });

  it("should detect date changes", () => {
    const imported: ImportedTask[] = [
      createImportedTask({
        id: "SYN-2026-0001",
        startDate: "2026-01-20",
        endDate: "2026-01-25",
      }),
    ];
    const existing: SyntropyTask[] = [
      createExistingTask({
        startDate: "2026-01-18",
        endDate: "2026-01-22",
      }),
    ];

    const result = diffTasks(imported, existing);

    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].changedFields).toContain("startDate");
    expect(result.modified[0].changedFields).toContain("endDate");
  });
});

describe("getDiffSummary", () => {
  it("should return '无变更' for empty diff", () => {
    const diff: DiffResult = { added: [], modified: [], deleted: [] };
    expect(getDiffSummary(diff)).toBe("无变更");
  });

  it("should summarize added tasks", () => {
    const diff: DiffResult = {
      added: [createExistingTask()],
      modified: [],
      deleted: [],
    };
    expect(getDiffSummary(diff)).toBe("新增 1 项");
  });

  it("should summarize modified tasks", () => {
    const diff: DiffResult = {
      added: [],
      modified: [
        {
          id: "SYN-2026-0001",
          before: createExistingTask(),
          after: createExistingTask({ content: "Updated" }),
          changedFields: ["content"],
        },
      ],
      deleted: [],
    };
    expect(getDiffSummary(diff)).toBe("修改 1 项");
  });

  it("should summarize deleted tasks", () => {
    const diff: DiffResult = {
      added: [],
      modified: [],
      deleted: [createExistingTask()],
    };
    expect(getDiffSummary(diff)).toBe("删除 1 项");
  });

  it("should summarize multiple changes", () => {
    const diff: DiffResult = {
      added: [createExistingTask(), createExistingTask()],
      modified: [
        {
          id: "SYN-2026-0001",
          before: createExistingTask(),
          after: createExistingTask(),
          changedFields: [],
        },
      ],
      deleted: [createExistingTask(), createExistingTask(), createExistingTask()],
    };
    expect(getDiffSummary(diff)).toBe("新增 2 项，修改 1 项，删除 3 项");
  });
});

describe("hasDiffChanges", () => {
  it("should return false for empty diff", () => {
    const diff: DiffResult = { added: [], modified: [], deleted: [] };
    expect(hasDiffChanges(diff)).toBe(false);
  });

  it("should return true when there are added tasks", () => {
    const diff: DiffResult = {
      added: [createExistingTask()],
      modified: [],
      deleted: [],
    };
    expect(hasDiffChanges(diff)).toBe(true);
  });

  it("should return true when there are modified tasks", () => {
    const diff: DiffResult = {
      added: [],
      modified: [
        {
          id: "SYN-2026-0001",
          before: createExistingTask(),
          after: createExistingTask(),
          changedFields: [],
        },
      ],
      deleted: [],
    };
    expect(hasDiffChanges(diff)).toBe(true);
  });

  it("should return true when there are deleted tasks", () => {
    const diff: DiffResult = {
      added: [],
      modified: [],
      deleted: [createExistingTask()],
    };
    expect(hasDiffChanges(diff)).toBe(true);
  });
});
