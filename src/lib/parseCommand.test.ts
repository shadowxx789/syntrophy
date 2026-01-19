import { describe, it, expect } from "vitest";
import { parseCommand, findTaskCandidates } from "@/lib/ai";
import type { SyntropyTask } from "@/types";

const baseTask = (overrides: Partial<SyntropyTask> = {}): SyntropyTask => ({
  id: "SYN-2026-0001",
  projectId: "PROJ-0001",
  content: "修复登录页面",
  status: "todo",
  priority: undefined,
  startDate: undefined,
  endDate: undefined,
  rawCommand: undefined,
  version: 1,
  createdAt: "2026-01-18T10:00:00.000Z",
  updatedAt: "2026-01-18T10:00:00.000Z",
  createdBy: "DEV-12345678",
  updatedBy: "DEV-12345678",
  ...overrides,
});

const aiConfig = {
  provider: "openai" as const,
  apiKey: "sk-test",
};

describe("parseCommand quick match", () => {
  it("should parse delete command with targetId", async () => {
    const result = await parseCommand("删除 修复登录页面", aiConfig, []);

    expect(result.action).toBe("DELETE");
    expect(result.targetId).toBe("修复登录页面");
  });
});

describe("findTaskCandidates", () => {
  it("should return id match as best", () => {
    const tasks = [
      baseTask({ id: "SYN-2026-0001", content: "修复登录页面" }),
      baseTask({ id: "SYN-2026-0002", content: "修复登录流程" }),
    ];

    const result = findTaskCandidates("SYN-2026-0002", tasks);

    expect(result.best?.task.id).toBe("SYN-2026-0002");
    expect(result.isAmbiguous).toBe(false);
  });

  it("should mark ambiguous when multiple fuzzy matches exist", () => {
    const tasks = [
      baseTask({ id: "SYN-2026-0001", content: "修复登录页面" }),
      baseTask({ id: "SYN-2026-0002", content: "修复登录流程" }),
    ];

    const result = findTaskCandidates("修复登录", tasks);

    expect(result.candidates.length).toBeGreaterThan(1);
    expect(result.isAmbiguous).toBe(true);
  });

  it("should match ordinal selection", () => {
    const tasks = [
      baseTask({ id: "SYN-2026-0001", content: "任务一" }),
      baseTask({ id: "SYN-2026-0002", content: "任务二" }),
    ];

    const result = findTaskCandidates("第二个", tasks);

    expect(result.best?.task.id).toBe("SYN-2026-0002");
    expect(result.isAmbiguous).toBe(true);
  });
});
