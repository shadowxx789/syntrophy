/**
 * Server-side email send guards (auth is applied in the server action).
 * Kept out of "use server" files so helpers can be unit-tested.
 */

export const MAX_EMAIL_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const EMAIL_RATE_LIMIT_MAX = 10;
export const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function consumeEmailRateLimit(
  key: string,
  now = Date.now()
): { allowed: boolean; retryAfterSec: number } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + EMAIL_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= EMAIL_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Test-only: wipe in-memory buckets. */
export function resetEmailRateLimitForTests(): void {
  rateBuckets.clear();
}

export function validateEmailAttachment(attachment?: {
  filename: string;
  content: string;
  contentType: string;
}): string | null {
  if (!attachment) return null;

  if (!attachment.filename || attachment.filename.length > 200) {
    return "附件文件名无效。";
  }
  if (/[/\\]|\.\./.test(attachment.filename)) {
    return "附件文件名非法。";
  }

  const padding = (attachment.content.match(/=+$/) || [""])[0].length;
  const decodedBytes = Math.floor((attachment.content.length * 3) / 4) - padding;
  if (decodedBytes > MAX_EMAIL_ATTACHMENT_BYTES) {
    return `附件过大（上限 ${Math.floor(MAX_EMAIL_ATTACHMENT_BYTES / 1024 / 1024)}MB）。`;
  }

  return null;
}
