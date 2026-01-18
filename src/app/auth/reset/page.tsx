"use client";

/**
 * Password Reset Page
 * 凝序 Syntropy - Phase 5: User System
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, Mail, ArrowLeft, Check } from "lucide-react";

export default function ResetPasswordPage() {
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    clearError();

    // Validation
    if (!email.trim()) {
      setFormError("请输入邮箱地址");
      return;
    }

    try {
      await resetPassword(email);
      setShowSuccess(true);
    } catch {
      // Error is handled by the store
    }
  };

  const displayError = formError || error?.message;

  if (showSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">邮件已发送</h1>
          <p className="text-slate-400">
            我们已向 <span className="text-white">{email}</span> 发送了密码重置邮件。
            <br />
            请查收邮件并点击重置链接。
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => setShowSuccess(false)}
              variant="outline"
              className="h-12 w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              重新发送
            </Button>
            <Link
              href="/auth/login"
              className="text-sm text-blue-400 transition-colors hover:text-blue-300"
            >
              返回登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link
            href="/auth/login"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回登录
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">重置密码</h1>
          <p className="mt-2 text-sm text-slate-400">输入您的邮箱地址，我们将发送重置链接</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-2xl bg-slate-800/50 p-6 backdrop-blur-sm">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-slate-600 bg-slate-700/50 pl-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {displayError}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="h-12 w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              "发送重置邮件"
            )}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-slate-400">
          想起密码了？{" "}
          <Link
            href="/auth/login"
            className="font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
