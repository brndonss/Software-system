"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signup" | "login";

type AuthExperienceProps = {
  mode: AuthMode;
  embedded?: boolean;
  onClose?: () => void;
  onModeChange?: (mode: AuthMode) => void;
};

export default function AuthExperience({ mode, embedded = false, onClose, onModeChange }: AuthExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailStep, setEmailStep] = useState<"choice" | "email" | "password">("choice");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";
  const initialError = searchParams.get("error");

  useEffect(() => {
    if (!embedded) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, input, a")?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button, input, a[href]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [embedded, onClose]);

  async function routeAfterAuth() {
    const onboarding = await fetch("/api/v1/onboarding");
    if (onboarding.ok) {
      const onboardingData = await onboarding.json() as { onboarding?: { status?: string } };
      router.push(onboardingData.onboarding?.status === "completed" ? "/dashboard" : "/system-builder");
      return;
    }
    router.push(isSignup ? "/system-builder" : "/dashboard");
  }

  async function continueWithGoogle() {
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${isSignup ? "/system-builder" : "/dashboard"}` },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(friendlyAuthError(caught));
      setLoading(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (emailStep === "email") {
      setEmailStep("password");
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const registration = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, confirmPassword }),
        });
        const registrationData = await readResponse(registration);
        if (!registration.ok) throw new Error(registrationData?.error?.message ?? "Unable to create your account.");
      }

      const login = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: true }),
      });
      const loginData = await readResponse(login);
      if (!login.ok) throw new Error(loginData?.error?.message ?? "Unable to sign in.");
      await routeAfterAuth();
    } catch (caught) {
      setError(friendlyAuthError(caught));
      setLoading(false);
    }
  }

  const content = (
    <div className="auth-modal-panel" ref={panelRef} role="dialog" aria-modal={embedded} aria-labelledby="auth-title">
      {embedded && <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Close authentication">×</button>}
      <Link className="auth-brand" href="/" aria-label="Northstar home"><span>N</span><b>NORTHSTAR</b></Link>
      <div className="auth-copy">
        <p className="auth-kicker">AI business operating system</p>
        <h1 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p>{isSignup ? "Your business. Your system. Built with AI." : "Continue where you left off."}</p>
      </div>

      <button className="auth-google" type="button" onClick={continueWithGoogle} disabled={loading}>
        <span className="google-mark" aria-hidden="true"><GoogleMark /></span>
        <span>{loading ? "Connecting..." : "Continue with Google"}</span>
      </button>
      <div className="auth-divider"><span>OR</span></div>

      {emailStep === "choice" ? (
        <button className="auth-email-trigger" type="button" onClick={() => setEmailStep("email")}>Continue with email</button>
      ) : (
        <form className="auth-email-form" onSubmit={submitEmail}>
          {emailStep === "email" ? (
            <>
              <label><span>Work email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" autoFocus /></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit">Continue <span>↗</span></button>
            </>
          ) : (
            <>
              <label><span>Password</span><div className="auth-password"><input required {...(isSignup ? { minLength: 12 } : {})} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "12+ characters" : "Your password"} autoComplete={isSignup ? "new-password" : "current-password"} autoFocus /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div></label>
              {isSignup && <label><span>Confirm password</span><input required minLength={12} type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" autoComplete="new-password" /></label>}
              {isSignup && <p className="auth-password-note">Use 12+ characters with uppercase, a number, and a symbol.</p>}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Working..." : isSignup ? "Create account" : "Sign in"}<span>↗</span></button>
            </>
          )}
        </form>
      )}

      {!isSignup && emailStep === "password" && <Link className="auth-forgot" href="/reset-password">Forgot password?</Link>}
      {(error || initialError) && emailStep === "choice" ? <p className="auth-error" role="alert">{error || initialError}</p> : null}
      <p className="auth-switch">{isSignup ? "Already have an account?" : "New to Northstar?"} {embedded ? <button type="button" onClick={() => onModeChange?.(isSignup ? "login" : "signup")}>{isSignup ? "Sign in" : "Create an account"}</button> : <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>}</p>
      <p className="auth-privacy">Secure authentication through Supabase.</p>
    </div>
  );

  if (embedded) {
    return <div className="auth-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>{content}</div>;
  }
  return <main className="auth-experience">{content}</main>;
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" role="img"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.9-4.2 2.9-7.42Z" /><path fill="#34A853" d="M12 21.9c2.65 0 4.88-.88 6.5-2.4l-3.15-2.45c-.88.59-2 .94-3.35.94-2.57 0-4.75-1.74-5.53-4.08H3.22v2.53A9.82 9.82 0 0 0 12 21.9Z" /><path fill="#FBBC05" d="M6.47 13.91a5.9 5.9 0 0 1 0-3.82V7.56H3.22a9.83 9.83 0 0 0 0 8.88l3.25-2.53Z" /><path fill="#EA4335" d="M12 6.01c1.44 0 2.73.5 3.75 1.49l2.81-2.81C16.88 3.1 14.65 2.1 12 2.1a9.82 9.82 0 0 0-8.78 5.46l3.25 2.53C7.25 7.75 9.43 6.01 12 6.01Z" /></svg>;
}

function friendlyAuthError(caught: unknown) {
  const message = caught instanceof Error ? caught.message.toLowerCase() : "";
  if (message.includes("already registered") || message.includes("already exists")) return "An account already exists for this email. Try signing in.";
  if (message.includes("invalid login") || message.includes("invalid credentials")) return "That email or password is not correct.";
  if (message.includes("network") || message.includes("fetch")) return "We could not reach Northstar. Check your connection and try again.";
  return caught instanceof Error ? caught.message : "Authentication failed. Please try again.";
}

async function readResponse(response: Response): Promise<{ error?: { message?: string } } | null> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as { error?: { message?: string } }; } catch { return null; }
}

export function AuthLoadingState() {
  return <main className="auth-experience"><section className="auth-modal-panel auth-loading-panel" aria-label="Loading Northstar authentication"><span className="auth-loading-mark">N</span><p>Preparing Northstar...</p></section></main>;
}
