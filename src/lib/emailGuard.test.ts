import { describe, expect, it, beforeEach } from "vitest";
import {
  consumeEmailRateLimit,
  EMAIL_RATE_LIMIT_MAX,
  MAX_EMAIL_ATTACHMENT_BYTES,
  resetEmailRateLimitForTests,
  validateEmailAttachment,
} from "./emailGuard";

describe("validateEmailAttachment", () => {
  it("accepts missing attachment", () => {
    expect(validateEmailAttachment(undefined)).toBeNull();
  });

  it("rejects path-like filenames", () => {
    expect(
      validateEmailAttachment({
        filename: "../secret.xlsx",
        content: "AAAA",
        contentType: "application/vnd.ms-excel",
      })
    ).toBe("附件文件名非法。");
  });

  it("rejects oversized base64 payload", () => {
    const tooBig = "A".repeat(Math.ceil(((MAX_EMAIL_ATTACHMENT_BYTES + 1024) * 4) / 3));
    expect(
      validateEmailAttachment({
        filename: "tasks.xlsx",
        content: tooBig,
        contentType: "application/vnd.ms-excel",
      })
    ).toMatch(/附件过大/);
  });
});

describe("consumeEmailRateLimit", () => {
  beforeEach(() => {
    resetEmailRateLimitForTests();
  });

  it("allows up to the window max then blocks", () => {
    const now = 1_000_000;
    for (let i = 0; i < EMAIL_RATE_LIMIT_MAX; i++) {
      expect(consumeEmailRateLimit("user-1", now).allowed).toBe(true);
    }
    const blocked = consumeEmailRateLimit("user-1", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates buckets per user", () => {
    const now = 1_000_000;
    for (let i = 0; i < EMAIL_RATE_LIMIT_MAX; i++) {
      consumeEmailRateLimit("user-1", now);
    }
    expect(consumeEmailRateLimit("user-2", now).allowed).toBe(true);
  });
});
