/**
 * Access Guard - Cookie-based password protection utilities
 *
 * Uses HMAC-SHA256 to sign cookies, preventing tampering.
 * Works in both Edge Runtime (middleware) and Node.js (server actions).
 */

// Cookie configuration
export const ACCESS_COOKIE_NAME = "syntropy_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Generate HMAC-SHA256 signature for a value
 * Uses Web Crypto API (works in Edge Runtime)
 */
export async function signValue(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const valueData = encoder.encode(value);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, valueData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Create a signed cookie value
 * Format: timestamp.signature
 */
export async function createAccessToken(password: string): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await signValue(timestamp, password);
  return `${timestamp}.${signature}`;
}

/**
 * Verify a signed cookie value
 */
export async function verifyAccessToken(
  token: string | undefined,
  password: string
): Promise<boolean> {
  if (!token || !password) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;

  // Check if token is expired (older than max age)
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (isNaN(tokenAge) || tokenAge > ACCESS_COOKIE_MAX_AGE * 1000) {
    return false;
  }

  // Verify signature
  const expectedSignature = await signValue(timestamp, password);
  return signature === expectedSignature;
}

/**
 * Get cookie options for setting the access token
 */
export function getAccessCookieOptions(isProduction: boolean) {
  return {
    name: ACCESS_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  };
}
