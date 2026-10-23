import type { TaskStatus } from "@/types";

/**
 * Checkbox toggle for the 4-state machine.
 * pending → in_progress → completed → pending
 * delayed → in_progress (resume, do not complete in one click)
 */
export function nextToggleStatus(status: TaskStatus): TaskStatus {
  if (status === "completed") return "pending";
  if (status === "pending") return "in_progress";
  if (status === "delayed") return "in_progress";
  return "completed";
}
