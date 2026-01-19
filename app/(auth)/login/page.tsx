"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, KeyRound, Eye, EyeOff, ArrowRight } from "lucide-react";

// Network visualization component
function NetworkVisualization() {
  return (
    <div className="relative h-48 w-full overflow-hidden rounded-lg bg-[#0a1628] border border-cyan-900/30">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 200">
        {/* Connection lines */}
        <line x1="50" y1="80" x2="150" y2="120" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="150" y1="120" x2="200" y2="60" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="200" y1="60" x2="280" y2="100" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="280" y1="100" x2="350" y2="80" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="150" y1="120" x2="220" y2="150" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="220" y1="150" x2="280" y2="100" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="100" y1="160" x2="150" y2="120" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        <line x1="320" y1="150" x2="280" y2="100" stroke="#0d9488" strokeWidth="1" opacity="0.4" />
        
        {/* Nodes */}
        <circle cx="50" cy="80" r="4" fill="#0d9488" opacity="0.8" />
        <circle cx="150" cy="120" r="5" fill="#14b8a6" />
        <circle cx="200" cy="60" r="4" fill="#0d9488" opacity="0.8" />
        <circle cx="280" cy="100" r="6" fill="#14b8a6" />
        <circle cx="350" cy="80" r="4" fill="#0d9488" opacity="0.8" />
        <circle cx="220" cy="150" r="4" fill="#0d9488" opacity="0.8" />
        <circle cx="100" cy="160" r="3" fill="#0d9488" opacity="0.6" />
        <circle cx="320" cy="150" r="3" fill="#0d9488" opacity="0.6" />
        
        {/* Animated pulse on main nodes */}
        <circle cx="150" cy="120" r="8" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="280" cy="100" r="8" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="6;14;6" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </svg>
      
      {/* Status indicators */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-400 font-medium">NODES:</span>
          <span className="text-cyan-300">ACTIVE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          <span className="text-teal-400 font-medium">LATENCY:</span>
          <span className="text-teal-300">2ms</span>
        </div>
      </div>
    </div>
  );
}

// Google icon component
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// GitHub icon component
function GitHubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [keepSession, setKeepSession] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      if (result.success) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setError("Error al iniciar sesión. Por favor intenta de nuevo.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Social login is disabled - show message
    alert(`${provider} login está temporalmente deshabilitado. Por favor usa email y contraseña.`);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Dark with branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0f172a] p-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-16">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
              <svg className="h-5 w-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">ScraperPlatform</span>
          </div>

          {/* Headline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight text-white mb-6">
              Extracting<br />
              intelligence from the<br />
              noise.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Access the world's most powerful distributed scraping network. Monitor targets, manage proxies, and pipe structured data directly to your warehouse.
            </p>
          </div>
        </div>

        {/* Network Visualization */}
        <div className="mt-auto">
          <NetworkVisualization />
        </div>
      </div>

      {/* Right Panel - Light with form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-[#f8fafc] px-8 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
              <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-slate-900">ScraperPlatform</span>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Initialize Session</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your credentials to access the console.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                User Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-slate-100 border-slate-200 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Access Key
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-slate-100 border-slate-200 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keepSession"
                  checked={keepSession}
                  onCheckedChange={(checked) => setKeepSession(checked as boolean)}
                  className="border-slate-300 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                />
                <Label htmlFor="keepSession" className="text-sm text-slate-600 cursor-pointer">
                  Keep session active
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                onClick={() => alert("Función de recuperación de credenciales próximamente.")}
              >
                Recover credentials?
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  AUTHENTICATE
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#f8fafc] px-3 text-slate-400">Or connect via</span>
            </div>
          </div>

          {/* Social Login Buttons (Disabled) */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 opacity-50 cursor-not-allowed"
              onClick={() => handleSocialLogin("Google")}
              disabled
            >
              <GoogleIcon />
              <span className="ml-2">Google</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 opacity-50 cursor-not-allowed"
              onClick={() => handleSocialLogin("GitHub")}
              disabled
            >
              <GitHubIcon />
              <span className="ml-2">GitHub</span>
            </Button>
          </div>

          {/* Request Access Link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <button
              type="button"
              className="text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
              onClick={() => alert("Solicitud de acceso próximamente.")}
            >
              Request Access
            </button>
          </p>

          {/* Version Info */}
          <p className="mt-8 text-center text-[10px] text-slate-400">
            v2.4.0 • SYSTEM: OPERATIONAL
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen" />}>
      <LoginContent />
    </React.Suspense>
  );
}
