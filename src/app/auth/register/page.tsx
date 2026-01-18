"use client";

/**
 * Register Page
 * 凝序 Syntropy - Phase 5: User System
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2, Mail, Lock, User, ArrowLeft, Check, X } from "lucide-react";

// Password strength requirements
const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "至少8个字符", test: (p: string) => p.length >= 8 },
  { id: "number", label: "包含数字", test: (p: string) => /\d/.test(p) },
  {
    id: "letter",
    label: "包含字母",
    test: (p: string) => /[a-zA-Z]/.test(p),
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordStrength = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password),
  }));

  const isPasswordValid = passwordStrength.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    clearError();

    // Validation
    if (!email.trim()) {
      setFormError("请输入邮箱地址");
      return;
    }
    if (!isPasswordValid) {
      setFormError("密码不符合要求");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("两次输入的密码不一致");
      return;
    }

    try {
      await signUp(email, password, displayName || undefined);
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
          <h1 className="text-2xl font-bold text-white">注册成功！</h1>
          <p className="text-slate-400">
            我们已向 <span className="text-white">{email}</span> 发送了验证邮件。
            <br />
            请查收邮件并点击验证链接以激活账号。
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => router.push("/auth/login")}
              className="h-12 w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              前往登录
            </Button>
            <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
              返回首页
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
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">创建账号</h1>
          <p className="mt-2 text-sm text-slate-400">开始使用凝序管理您的任务</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-2xl bg-slate-800/50 p-6 backdrop-blur-sm">
            {/* Display Name (Optional) */}
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-slate-300">
                昵称 <span className="text-slate-500">（可选）</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="您的昵称"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-12 border-slate-600 bg-slate-700/50 pl-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>

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
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                密码
              </label>
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
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordStrength.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? "text-green-400" : "text-slate-500"
                      }`}
                    >
                      {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 border-slate-600 bg-slate-700/50 pl-10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400">两次输入的密码不一致</p>
              )}
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
            disabled={isLoading || !isPasswordValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              "创建账号"
            )}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-slate-400">
          已有账号？{" "}
          <Link
            href="/auth/login"
            className="font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            立即登录
          </Link>
        </p>

        {/* Privacy Note */}
        <p className="text-center text-xs text-slate-500">
          注册即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
