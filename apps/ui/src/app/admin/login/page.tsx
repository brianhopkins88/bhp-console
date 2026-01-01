"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  const [recoveryUserId, setRecoveryUserId] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryNewPasswordConfirm, setRecoveryNewPasswordConfirm] =
    useState("");
  const [showRecoveryAnswer, setShowRecoveryAnswer] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  const apiFetch: typeof fetch = (input, init) =>
    globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });

  const handleLogin = async () => {
    setLoginError(null);
    setLoginStatus(null);
    if (!userId.trim() || !password) {
      setLoginError("Enter your user ID and password.");
      return;
    }
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId.trim(), password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      setLoginStatus("Signed in. Redirecting...");
      router.replace("/admin");
    } catch (err) {
      setLoginError((err as Error).message);
    }
  };

  const handleLoadQuestion = async () => {
    setRecoveryError(null);
    setRecoveryStatus(null);
    setRecoveryQuestion(null);
    if (!recoveryUserId.trim()) {
      setRecoveryError("Enter the user ID first.");
      return;
    }
    try {
      const response = await apiFetch(
        `${apiBaseUrl}/api/v1/auth/recovery/question?user_id=${encodeURIComponent(
          recoveryUserId.trim()
        )}`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as { question: string };
      setRecoveryQuestion(data.question);
    } catch (err) {
      setRecoveryError((err as Error).message);
    }
  };

  const handleRecoveryReset = async () => {
    setRecoveryError(null);
    setRecoveryStatus(null);
    if (
      !recoveryUserId.trim() ||
      !recoveryAnswer ||
      !recoveryNewPassword ||
      !recoveryNewPasswordConfirm
    ) {
      setRecoveryError("Fill in all recovery fields.");
      return;
    }
    if (recoveryNewPassword !== recoveryNewPasswordConfirm) {
      setRecoveryError("New passwords do not match.");
      return;
    }
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/auth/recovery/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: recoveryUserId.trim(),
          answer: recoveryAnswer,
          new_password: recoveryNewPassword,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      setRecoveryStatus("Password reset. Sign in with the new password.");
      setRecoveryAnswer("");
      setRecoveryNewPassword("");
      setRecoveryNewPasswordConfirm("");
    } catch (err) {
      setRecoveryError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">Sign in</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Use your admin credentials to access the console.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-600">
            User ID
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
              placeholder="admin"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Password
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3.25" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3.25 3.25 0 0 0 4.6 4.6" />
                    <path d="M6.2 6.2C4.1 7.7 2.25 12 2.25 12s3.5 6 9.75 6c2.1 0 3.9-.5 5.4-1.2" />
                    <path d="M14.2 9.2A3.25 3.25 0 0 0 9.2 14.2" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {loginError ? (
            <p className="text-xs text-rose-500">{loginError}</p>
          ) : loginStatus ? (
            <p className="text-xs text-emerald-600">{loginStatus}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleLogin()}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
          >
            Sign in
          </button>
        </div>
      </div>

      <details className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
          Recover password
        </summary>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-600">
            User ID
            <input
              value={recoveryUserId}
              onChange={(event) => setRecoveryUserId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
              placeholder="admin"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleLoadQuestion()}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
          >
            Load secret question
          </button>
          {recoveryQuestion ? (
            <p className="text-xs text-zinc-600">{recoveryQuestion}</p>
          ) : null}
          <label className="block text-xs font-semibold text-zinc-600">
            Answer
            <div className="relative mt-2">
              <input
                type={showRecoveryAnswer ? "text" : "password"}
                value={recoveryAnswer}
                onChange={(event) => setRecoveryAnswer(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                placeholder="Answer"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryAnswer((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                aria-label={showRecoveryAnswer ? "Hide answer" : "Show answer"}
              >
                {showRecoveryAnswer ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3.25" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3.25 3.25 0 0 0 4.6 4.6" />
                    <path d="M6.2 6.2C4.1 7.7 2.25 12 2.25 12s3.5 6 9.75 6c2.1 0 3.9-.5 5.4-1.2" />
                    <path d="M14.2 9.2A3.25 3.25 0 0 0 9.2 14.2" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            New password
            <div className="relative mt-2">
              <input
                type={showRecoveryPassword ? "text" : "password"}
                value={recoveryNewPassword}
                onChange={(event) => setRecoveryNewPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                aria-label={showRecoveryPassword ? "Hide password" : "Show password"}
              >
                {showRecoveryPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3.25" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3.25 3.25 0 0 0 4.6 4.6" />
                    <path d="M6.2 6.2C4.1 7.7 2.25 12 2.25 12s3.5 6 9.75 6c2.1 0 3.9-.5 5.4-1.2" />
                    <path d="M14.2 9.2A3.25 3.25 0 0 0 9.2 14.2" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Re-enter new password
            <div className="relative mt-2">
              <input
                type={showRecoveryConfirm ? "text" : "password"}
                value={recoveryNewPasswordConfirm}
                onChange={(event) =>
                  setRecoveryNewPasswordConfirm(event.target.value)
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryConfirm((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                aria-label={showRecoveryConfirm ? "Hide password" : "Show password"}
              >
                {showRecoveryConfirm ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3.25" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3.25 3.25 0 0 0 4.6 4.6" />
                    <path d="M6.2 6.2C4.1 7.7 2.25 12 2.25 12s3.5 6 9.75 6c2.1 0 3.9-.5 5.4-1.2" />
                    <path d="M14.2 9.2A3.25 3.25 0 0 0 9.2 14.2" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {recoveryError ? (
            <p className="text-xs text-rose-500">{recoveryError}</p>
          ) : recoveryStatus ? (
            <p className="text-xs text-emerald-600">{recoveryStatus}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleRecoveryReset()}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
          >
            Reset password
          </button>
        </div>
      </details>
    </div>
  );
}
