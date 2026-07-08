/**
 * 加密工具
 * 用于 API Key 的本地加密存储
 *
 * 使用 Web Crypto API:
 * - PBKDF2 派生密钥
 * - AES-256-GCM 加密
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

/**
 * 获取设备指纹作为加密密码
 * 结合多个浏览器特征生成唯一标识
 */
function getDeviceFingerprint(): string {
  if (typeof window === "undefined") {
    return "server-side-placeholder";
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];

  return components.join("|");
}

/**
 * 派生加密密钥
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * 加密 API Key
 *
 * @param plaintext 明文 API Key
 * @returns Base64 编码的加密结果 (salt + iv + ciphertext)
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const password = getDeviceFingerprint();

  // 生成随机 salt 和 IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 派生密钥
  const key = await deriveKey(password, salt);

  // 加密
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // 组合: salt + iv + ciphertext
  const combined = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  // Base64 编码（分块避免 apply 栈溢出）
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < combined.length; i += chunkSize) {
    const chunk = combined.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * 解密 API Key
 *
 * @param encrypted Base64 编码的加密数据
 * @returns 明文 API Key
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  const decoder = new TextDecoder();
  const password = getDeviceFingerprint();

  // Base64 解码（直接用 atob + Uint8Array.from，避免 split/map 大字符串开销）
  const binary = atob(encrypted);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  // 分离 salt, iv, ciphertext
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // 派生密钥
  const key = await deriveKey(password, salt);

  // 解密
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
}

/**
 * 验证加密数据是否有效
 */
export async function isEncryptedDataValid(encrypted: string): Promise<boolean> {
  try {
    await decryptApiKey(encrypted);
    return true;
  } catch {
    return false;
  }
}

/**
 * 掩码显示 API Key
 * sk-xxxxxxxxxxxxxx1234 → sk-****...1234
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return "****";

  const prefix = apiKey.slice(0, 3);
  const suffix = apiKey.slice(-4);
  return `${prefix}****...${suffix}`;
}
