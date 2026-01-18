import { describe, it, expect, beforeEach, vi } from "vitest";
import * as idUtils from "../lib/generateId";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Mock crypto.getRandomValues
const mockGetRandomValues = vi.fn();
Object.defineProperty(global.crypto, "getRandomValues", {
  value: mockGetRandomValues,
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, "randomUUID", {
  value: vi.fn(() => "mock-uuid-1234"),
});

describe("generateDeviceId", () => {
  it("should generate a device ID in format DEV-XXXXXXXX", () => {
    // Mock random bytes to [0, 1, 2, 3] => '00010203'
    mockGetRandomValues.mockImplementationOnce((arr: Uint8Array) => {
      arr[0] = 0;
      arr[1] = 1;
      arr[2] = 2;
      arr[3] = 3;
      return arr;
    });

    const id = idUtils.generateDeviceId();
    expect(id).toBe("DEV-00010203");
    expect(id).toMatch(/^DEV-[a-f0-9]{8}$/);
  });
});

describe("getOrCreateDeviceId", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockGetRandomValues.mockClear();
  });

  it("should create a new device ID if none exists", () => {
    mockGetRandomValues.mockImplementationOnce((arr: Uint8Array) => {
      arr[0] = 0xff;
      arr[1] = 0xff;
      arr[2] = 0xff;
      arr[3] = 0xff;
      return arr;
    });

    const id = idUtils.getOrCreateDeviceId();
    expect(id).toBe("DEV-ffffffff");
    expect(localStorageMock.getItem("syntropy_device_id")).toBe("DEV-ffffffff");
  });

  it("should return existing device ID if it exists", () => {
    localStorageMock.setItem("syntropy_device_id", "DEV-abcd1234");

    const id = idUtils.getOrCreateDeviceId();
    expect(id).toBe("DEV-abcd1234");
    expect(mockGetRandomValues).not.toHaveBeenCalled();
  });
});

describe("generateOperationId", () => {
  it("should generate an operation ID in format OP-{timestamp}-{random}", () => {
    // Mock Date.now() to return a fixed timestamp
    const mockTimestamp = 1640995200000; // 2022-01-01
    vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

    const id = idUtils.generateOperationId();
    expect(id).toMatch(/^OP-[a-z0-9]+-[a-z0-9]{4}$/);
    expect(id.startsWith("OP-")).toBe(true);
  });
});

describe("generateUUID", () => {
  it("should generate a valid UUID", () => {
    const uuid = idUtils.generateUUID();
    expect(uuid).toBe("mock-uuid-1234");
  });
});
