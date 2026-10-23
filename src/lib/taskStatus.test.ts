import { describe, expect, it } from "vitest";
import { nextToggleStatus } from "./taskStatus";

describe("nextToggleStatus", () => {
  it("does not complete pending or delayed in one click", () => {
    expect(nextToggleStatus("pending")).toBe("in_progress");
    expect(nextToggleStatus("delayed")).toBe("in_progress");
  });

  it("completes in_progress, and uncompletes back to pending", () => {
    expect(nextToggleStatus("in_progress")).toBe("completed");
    expect(nextToggleStatus("completed")).toBe("pending");
  });
});
