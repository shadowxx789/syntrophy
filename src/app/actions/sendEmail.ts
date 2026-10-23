"use server";

import { Resend } from "resend";
import { consumeEmailRateLimit, escapeHtml, validateEmailAttachment } from "@/lib/emailGuard";
import { getAuthenticatedUserId } from "@/lib/supabaseServer";

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  attachment?: {
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Server Action: Send email with optional Excel attachment via Resend API
 *
 * Environment variable required: RESEND_API_KEY
 * Requires a valid Supabase session. Unauthenticated callers are rejected.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      success: false,
      error: "未登录，无法发送邮件。",
    };
  }

  const rate = consumeEmailRateLimit(userId);
  if (!rate.allowed) {
    return {
      success: false,
      error: `发送过于频繁，请 ${rate.retryAfterSec} 秒后再试。`,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "邮件服务未配置。请在 Vercel 环境变量中设置 RESEND_API_KEY。",
    };
  }

  // Validate email address format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.to)) {
    return {
      success: false,
      error: "无效的邮箱地址格式。",
    };
  }

  const attachmentError = validateEmailAttachment(input.attachment);
  if (attachmentError) {
    return {
      success: false,
      error: attachmentError,
    };
  }

  try {
    const resend = new Resend(apiKey);

    const emailPayload: Parameters<typeof resend.emails.send>[0] = {
      from: process.env.RESEND_FROM_EMAIL || "Syntropy <noreply@syntropy.app>",
      to: [input.to],
      subject: input.subject,
      html: formatEmailBody(input.body, input.subject),
    };

    // Add attachment if provided
    if (input.attachment) {
      emailPayload.attachments = [
        {
          filename: input.attachment.filename,
          content: Buffer.from(input.attachment.content, "base64"),
          contentType: input.attachment.contentType,
        },
      ];
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error("[sendEmail] Resend API error:", error);
      return {
        success: false,
        error: `发送失败: ${error.message}`,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("[sendEmail] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "发送邮件时发生未知错误。",
    };
  }
}

/**
 * Format email body with HTML template
 */
function formatEmailBody(body: string, subject: string): string {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(body);
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">
      ✦ 凝序 | Syntropy
    </h1>
    <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 14px;">
      ${safeSubject}
    </p>
  </div>
  
  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
    <div style="white-space: pre-wrap; font-size: 15px;">
${safeBody}
    </div>
  </div>
  
  <div style="background: #f9fafb; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0; font-size: 12px; color: #6b7280;">
      此邮件由 <a href="https://syntropy.app" style="color: #3b82f6; text-decoration: none;">凝序 Syntropy</a> 自动发送
    </p>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">
      在数字杂讯中凝结秩序，于指令流动间止息熵增。
    </p>
  </div>
</body>
</html>
  `.trim();
}
