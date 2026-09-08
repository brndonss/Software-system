"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const passwordRequirements = [
  { label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
  { label: "One symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "expired" | "success">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");

    if (!code) {
      setStatus("expired");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setStatus("expired");
          setError(error.message || "This password reset link is invalid or expired.");
          return;
        }

        setStatus("ready");
      })
      .catch(() => {
        setStatus("expired");
        setError("This password reset link is invalid or expired.");
      });
  }, []);

  const checks = useMemo(() => passwordRequirements.map((requirement) => ({
    ...requirement,
    valid: requirement.test(password),
  })), [password]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Choose a stronger password that meets the requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const missing = checks.some((check) => !check.valid);
    if (missing) {
      setError("Your password must meet each requirement before continuing.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setStatus("success");
      setPassword("");
      setConfirmPassword("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to update your password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") {
    return <main className="auth-page-shell"><div className="auth-page-card"><p className="eyebrow">Northstar</p><h1>Checking your reset link…</h1></div></main>;
  }

  if (status === "expired") {
    return <main className="auth-page-shell"><div className="auth-page-card"><p className="eyebrow">Northstar</p><h1>Reset link expired</h1><p className="auth-subtitle">This link is invalid, expired, or has already been used.</p>{error && <p className="form-error">{error}</p>}<button className="primary wide" onClick={() => router.push("/")}>Back to sign in</button></div></main>;
  }

  if (status === "success") {
    return <main className="auth-page-shell"><div className="auth-page-card"><p className="eyebrow">Northstar</p><h1>Password updated</h1><p className="auth-subtitle">Your password has been updated successfully. You can sign in with your new credentials.</p><button className="primary wide" onClick={() => router.push("/")}>Continue to sign in</button></div></main>;
  }

  return <main className="auth-page-shell"><div className="auth-page-card"><p className="eyebrow">Northstar</p><h1>Create a new password</h1><p className="auth-subtitle">Choose a strong password to protect your workspace.</p><form onSubmit={submit} className="stack-form"><label className="auth-label"><span>Password</span><div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Choose a secure password" /><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div></label><label className="auth-label"><span>Confirm password</span><input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" /></label><ul className="password-checklist">{checks.map((check) => <li key={check.label} className={check.valid ? "pass" : ""}>{check.valid ? "✓" : "○"} {check.label}</li>)}</ul>{error && <p className="form-error">{error}</p>}<button className="primary wide" type="submit" disabled={loading}>{loading ? "Updating password…" : "Update password"}</button></form></div></main>;
}
