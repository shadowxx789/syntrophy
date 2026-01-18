"use client";

/**
 * Login Page
 * 凝序 Syntropy - Phase 5: User System
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    clearError();

    // Basic validation
    if (!email.trim()) {
      setFormError("请输入邮箱地址");
      return;
    }
    if (!password) {
      setFormError("请输入密码");
      return;
    }

    try {
      await signIn(email, password);
      router.push("/");
    } catch {
      // Error is handled by the store
    }
  };

  const displayError = formError || error?.message;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">欢迎回来</h1>
          <p className="mt-2 text-sm text-slate-400">登录您的凝序账号</p>
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

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  密码
                </label>
                <Link
                  href="/auth/reset"
                  className="text-sm text-blue-400 transition-colors hover:text-blue-300"
                >
                  忘记密码？
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                登录中...
              </>
            ) : (
              "登录"
            )}
          </Button>
        </form>

        {/* Register Link */}
        <p className="text-center text-sm text-slate-400">
          还没有账号？{" "}
          <Link
            href="/auth/register"
            className="font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            立即注册
          </Link>
        </p>

        {/* Privacy Note */}
        <p className="text-center text-xs text-slate-500">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
