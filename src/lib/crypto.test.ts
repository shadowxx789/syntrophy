import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptApiKey, decryptApiKey, maskApiKey } from "./crypto";

// Mock Web Crypto API and browser objects
beforeEach(() => {
  // Mock navigator
  Object.defineProperty(global, "navigator", {
    value: {
      userAgent: "mock-user-agent",
      language: "en-US",
      hardwareConcurrency: 4,
    },
    writable: true,
  });

  // Mock screen
  Object.defineProperty(global, "screen", {
    value: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
    },
    writable: true,
  });

  // Mock Date.getTimezoneOffset
  vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-480);
});

describe("encryptApiKey", () => {
  it("should encrypt a plaintext API key", async () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted = await encryptApiKey(plaintext);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);
    expect(encrypted).not.toBe(plaintext);
  });

  it("should produce different encrypted output for same input (due to random salt/IV)", async () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted1 = await encryptApiKey(plaintext);
    const encrypted2 = await encryptApiKey(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should handle empty string", async () => {
    const encrypted = await encryptApiKey("");
    expect(encrypted).toBeDefined();
  });
});

describe("decryptApiKey", () => {
  it("should decrypt an encrypted API key correctly", async () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted = await encryptApiKey(plaintext);
    const decrypted = await decryptApiKey(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle multiple encryption/decryption cycles", async () => {
    const original = "sk-multi-cycle-test-key";
    let current = original;

    for (let i = 0; i < 3; i++) {
      const encrypted = await encryptApiKey(current);
      current = await decryptApiKey(encrypted);
    }

    expect(current).toBe(original);
  });

  it("should throw error for invalid encrypted data", async () => {
    await expect(decryptApiKey("invalid-base64-data")).rejects.toThrow();
  });
});

describe("encrypt/decrypt integration", () => {
  it("should correctly encrypt and decrypt various API key formats", async () => {
    const testCases = [
      "sk-1234567890abcdef",
      "sk-proj-abc123-def456-ghi789",
      "r-8b3a4c2d1e5f6a7b8c9d0e1f",
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "a-very-long-api-key-with-many-characters-abcdefghijklmnopqrstuvwxyz",
    ];

    for (const original of testCases) {
      const encrypted = await encryptApiKey(original);
      const decrypted = await decryptApiKey(encrypted);
      expect(decrypted).toBe(original);
    }
  });
});

describe("maskApiKey", () => {
  it("should mask API key correctly", () => {
    expect(maskApiKey("sk-1234567890abcdef")).toBe("sk-****...cdef");
  });

  it("should mask shorter API keys", () => {
    expect(maskApiKey("sk-123456")).toBe("sk-****...3456");
  });

  it("should handle keys exactly at threshold", () => {
    expect(maskApiKey("12345678")).toBe("123****...5678");
  });

  it("should return placeholder for very short keys", () => {
    expect(maskApiKey("abc")).toBe("****");
  });

  it("should return placeholder for empty string", () => {
    expect(maskApiKey("")).toBe("****");
  });

  it("should return placeholder for null/undefined", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(maskApiKey(null as any)).toBe("****");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(maskApiKey(undefined as any)).toBe("****");
  });

  it("should preserve prefix and suffix", () => {
    const apiKey = "prefix-middle-suffix";
    const masked = maskApiKey(apiKey);
    expect(masked.startsWith("pre")).toBe(true);
    expect(masked.endsWith("fix")).toBe(true);
    expect(masked).toContain("****");
  });
});
