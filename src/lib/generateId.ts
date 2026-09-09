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
 * 设备命名空间：嵌入任务/项目 ID，避免多设备共用 SYN-YYYY-0001 撞主键。
 * 历史 ID（SYN-2026-0001 / PROJ-0001）保持不动。
 */
export function getIdNamespace(): string {
  const deviceId = getOrCreateDeviceId();
  const match = /^DEV-([a-f0-9]{8})$/i.exec(deviceId);
  if (match) return match[1].toLowerCase();

  // 兼容 syncService 写入的 device_${timestamp}_${random}
  let hash = 0x811c9dc5;
  for (let i = 0; i < deviceId.length; i++) {
    hash ^= deviceId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function nextCounterValue(counterName: string): Promise<number> {
  return db.transaction("rw", db.counters, async () => {
    let counter = await db.counters.get(counterName);

    if (!counter) {
      counter = { name: counterName, value: 0 };
    }

    counter.value += 1;
    await db.counters.put(counter);

    return counter.value;
  });
}

/**
 * 生成任务 ID
 * 格式: SYN-YYYY-{device}-{seq}（device = 8 hex 命名空间）
 *
 * @example
 * generateTaskId() // => "SYN-2026-a1b2c3d4-0001"
 */
export async function generateTaskId(): Promise<string> {
  const year = new Date().getFullYear();
  const namespace = getIdNamespace();
  const newValue = await nextCounterValue(`task-${year}`);
  const paddedNumber = String(newValue).padStart(4, "0");
  return `SYN-${year}-${namespace}-${paddedNumber}`;
}

/**
 * 生成项目 ID
 * 格式: PROJ-{device}-{seq}
 * 默认项目 PROJ-0001 不走此函数，保持兼容。
 *
 * @example
 * generateProjectId() // => "PROJ-a1b2c3d4-0001"
 */
export async function generateProjectId(): Promise<string> {
  const namespace = getIdNamespace();
  const newValue = await nextCounterValue("project");
  const paddedNumber = String(newValue).padStart(4, "0");
  return `PROJ-${namespace}-${paddedNumber}`;
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
