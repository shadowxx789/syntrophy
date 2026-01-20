import { db } from "./db";

/**
 * 生成设备唯一标识符
 * 格式: DEV-xxxxxxxx (8位随机十六进制)
 */
export function generateDeviceId(): string {
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `DEV-${hex}`;
}

/**
 * 获取或创建设备ID
 * 优先从 localStorage 读取，不存在则生成新的
 */
export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = "syntropy_device_id";

  if (typeof window === "undefined") {
    // SSR 环境返回临时 ID
    return "DEV-00000000";
  }

  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

/**
 * 生成任务 ID
 * 格式: SYN-YYYY-XXXX (年份 + 4位自增序号)
 *
 * @example
 * generateTaskId() // => "SYN-2026-0001"
 */
export async function generateTaskId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterName = `task-${year}`;

  // 使用事务确保原子性
  const newValue = await db.transaction("rw", db.counters, async () => {
    let counter = await db.counters.get(counterName);

    if (!counter) {
      counter = { name: counterName, value: 0 };
    }

    counter.value += 1;
    await db.counters.put(counter);

    return counter.value;
  });

  const paddedNumber = String(newValue).padStart(4, "0");
  return `SYN-${year}-${paddedNumber}`;
}

/**
 * 生成项目 ID
 * 格式: PROJ-XXXX (4位自增序号)
 *
 * @example
 * generateProjectId() // => "PROJ-0001"
 */
export async function generateProjectId(): Promise<string> {
  const counterName = "project";

  const newValue = await db.transaction("rw", db.counters, async () => {
    let counter = await db.counters.get(counterName);

    if (!counter) {
      counter = { name: counterName, value: 0 };
    }

    counter.value += 1;
    await db.counters.put(counter);

    return counter.value;
  });

  const paddedNumber = String(newValue).padStart(4, "0");
  return `PROJ-${paddedNumber}`;
}

/**
 * 生成操作日志 ID
 * 格式: OP-{timestamp}-{random}
 */
export function generateOperationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `OP-${timestamp}-${random}`;
}

/**
 * 生成 UUID v4
 * 用于通用唯一标识符需求
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 生成自定义提供商 ID
 * 格式: CUSTOM-xxxxxxxx (8位随机十六进制)
 */
export function generateCustomProviderId(): string {
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `CUSTOM-${hex}`;
}
