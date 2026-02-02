"use server";

import { cookies } from "next/headers";
import { createAccessToken, getAccessCookieOptions, ACCESS_COOKIE_NAME } from "@/lib/accessGuard";

export interface VerifyAccessResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Verify access password and set cookie
 */
export async function verifyAccessPassword(inputPassword: string): Promise<VerifyAccessResult> {
  const correctPassword = process.env.ACCESS_PASSWORD?.trim();

  // If no password is configured, always succeed
  if (!correctPassword) {
    return { success: true };
  }

  // Validate input
  if (!inputPassword || typeof inputPassword !== "string") {
    return { success: false, error: "请输入密码" };
  }

  // Check password
  if (inputPassword.trim() !== correctPassword) {
    return { success: false, error: "密码错误" };
  }

  // Password correct - create and set cookie
  try {
    const token = await createAccessToken(correctPassword);
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = getAccessCookieOptions(isProduction);

    const cookieStore = await cookies();
    cookieStore.set(ACCESS_COOKIE_NAME, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return { success: true };
  } catch (error) {
    console.error("[verifyAccess] Error setting cookie:", error);
    return { success: false, error: "验证失败，请重试" };
  }
}

/**
 * Server Action: Clear access cookie (logout)
 */
export async function clearAccessCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
}
