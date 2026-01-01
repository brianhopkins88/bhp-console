"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type HealthResponse = {
  status: string;
};

type UsageResponse = {
  total_tokens: number;
  updated_at: string;
  last_reset_at: string | null;
  token_budget: number;
};

type ApprovalRecord = {
  id: number;
  action: string;
  status: string;
  requester: string;
  created_at: string;
  decided_at: string | null;
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
  const apiFetch: typeof fetch = (input, init) =>
    globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
  const pathname = usePathname();
  const router = useRouter();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [approvalsLog, setApprovalsLog] = useState<ApprovalRecord[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [accountUserId, setAccountUserId] = useState("");
  const [accountNewUserId, setAccountNewUserId] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountNewPassword, setAccountNewPassword] = useState("");
  const [accountNewPasswordConfirm, setAccountNewPasswordConfirm] = useState("");
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showAccountNewPassword, setShowAccountNewPassword] = useState(false);
  const [showAccountConfirmPassword, setShowAccountConfirmPassword] = useState(false);
  const [recoveryCurrentQuestion, setRecoveryCurrentQuestion] = useState<string | null>(null);
  const [recoverySetupQuestion, setRecoverySetupQuestion] = useState("");
  const [recoverySetupAnswer, setRecoverySetupAnswer] = useState("");
  const [recoverySetupStatus, setRecoverySetupStatus] = useState<string | null>(null);
  const [recoverySetupError, setRecoverySetupError] = useState<string | null>(null);
  const [showRecoverySetupAnswer, setShowRecoverySetupAnswer] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const authCheckKey = `${apiBaseUrl}:${pathname}`;

  useEffect(() => {
    let isMounted = true;

    setAuthChecked(false);
    apiFetch(`${apiBaseUrl}/api/v1/auth/me`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: { user_id: string }) => {
        if (isMounted) {
          setIsAuthenticated(true);
          setAccountUserId(data.user_id);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAuthChecked(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authCheckKey]);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
    if (isAuthenticated && pathname === "/admin/login") {
      router.replace("/admin");
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    apiFetch(`${apiBaseUrl}/api/v1/health`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: HealthResponse) => {
        if (isMounted) {
          setHealth(data);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setHealthError(err.message);
        }
      });

    apiFetch(`${apiBaseUrl}/api/v1/openai/usage`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail ?? `HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: UsageResponse) => {
        if (isMounted) {
          setUsage(data);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setUsageError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, isAuthenticated]);

  useEffect(() => {
    if (!settingsMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!settingsMenuRef.current) return;
      if (!settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsMenuOpen(false);
        setShowAiPanel(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [settingsMenuOpen]);

  const handleResetUsage = async () => {
    setResetting(true);
    setUsageError(null);
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/openai/usage/reset`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as UsageResponse;
      setUsage(data);
    } catch (err) {
      setUsageError((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const loadApprovalsLog = async () => {
    setApprovalsLoading(true);
    setApprovalsError(null);
    try {
      const response = await apiFetch(
        `${apiBaseUrl}/api/v1/approvals?limit=25&status=approved`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as ApprovalRecord[];
      setApprovalsLog(data);
    } catch (err) {
      setApprovalsError((err as Error).message);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const loadRecoveryQuestion = async () => {
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/auth/recovery/me`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as { question: string | null };
      setRecoveryCurrentQuestion(data.question);
    } catch {
      setRecoveryCurrentQuestion(null);
    }
  };

  const handleOpenSettings = () => {
    setShowSettingsPanel(true);
    setSettingsMenuOpen(false);
    setShowAiPanel(false);
    void loadApprovalsLog();
    void loadRecoveryQuestion();
  };

  const handleChangePassword = async () => {
    setAccountError(null);
    setAccountStatus(null);
    if (!accountPassword || !accountNewPassword) {
      setAccountError("Enter current and new passwords.");
      return;
    }
    if (accountNewPassword !== accountNewPasswordConfirm) {
      setAccountError("New passwords do not match.");
      return;
    }
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: accountPassword,
          new_password: accountNewPassword,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      setAccountNewPassword("");
      setAccountNewPasswordConfirm("");
      setAccountStatus("Password updated.");
    } catch (err) {
      setAccountError((err as Error).message);
    }
  };

  const handleChangeUserId = async () => {
    setAccountError(null);
    setAccountStatus(null);
    if (!accountPassword || !accountNewUserId.trim()) {
      setAccountError("Enter your current password and new user ID.");
      return;
    }
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/auth/change-user-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: accountPassword,
          new_user_id: accountNewUserId.trim(),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as { user_id: string };
      setAccountUserId(data.user_id);
      setAccountNewUserId("");
      setAccountStatus(`User ID updated to ${data.user_id}.`);
    } catch (err) {
      setAccountError((err as Error).message);
    }
  };

  const handleHeaderSignOut = async () => {
    setAccountError(null);
    setAccountStatus(null);
    try {
      await apiFetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: "POST",
      });
    } finally {
      setIsAuthenticated(false);
      setAuthChecked(true);
      router.replace("/admin/login");
    }
  };

  const handleSetRecovery = async () => {
    setRecoverySetupError(null);
    setRecoverySetupStatus(null);
    if (!recoverySetupQuestion.trim() || !recoverySetupAnswer) {
      setRecoverySetupError("Enter a recovery question and answer.");
      return;
    }
    try {
      const response = await apiFetch(`${apiBaseUrl}/api/v1/auth/recovery/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: recoverySetupQuestion.trim(),
          answer: recoverySetupAnswer,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? `HTTP ${response.status}`);
      }
      setRecoveryCurrentQuestion(recoverySetupQuestion.trim());
      setRecoverySetupQuestion("");
      setRecoverySetupAnswer("");
      setRecoverySetupStatus("Recovery question saved.");
    } catch (err) {
      setRecoverySetupError((err as Error).message);
    }
  };

  const isLoginPage = pathname === "/admin/login";
  const allowContent = isLoginPage || isAuthenticated;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {!isLoginPage ? (
        <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Admin Console
            </p>
            <h1 className="text-lg font-semibold">BHP Console</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link href="/admin" className="hover:text-zinc-700">
              Admin home
            </Link>
            <Link href="/" className="hover:text-zinc-700">
              Back to site
            </Link>
            <button
              type="button"
              onClick={() => void handleHeaderSignOut()}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
            >
              Sign out
            </button>
            <div ref={settingsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setSettingsMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-700"
                aria-label="Admin settings"
                aria-expanded={settingsMenuOpen}
              >
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
                  <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
                  <path d="M19.4 12a7.4 7.4 0 0 0-.1-1.2l2.02-1.58-1.92-3.32-2.44.98a7.74 7.74 0 0 0-2.06-1.2l-.37-2.6H9.47l-.37 2.6a7.74 7.74 0 0 0-2.06 1.2l-2.44-.98-1.92 3.32 2.02 1.58a7.4 7.4 0 0 0 0 2.4l-2.02 1.58 1.92 3.32 2.44-.98c.62.5 1.32.9 2.06 1.2l.37 2.6h4.26l.37-2.6c.74-.3 1.44-.7 2.06-1.2l2.44.98 1.92-3.32-2.02-1.58c.06-.4.1-.8.1-1.2Z" />
                </svg>
              </button>
              {settingsMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Admin settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiPanel((prev) => !prev)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
                  >
                    {showAiPanel ? "Hide AI status" : "AI status"}
                  </button>
                  {showAiPanel ? (
                    <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                            API status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-800">
                            {healthError
                              ? "Offline"
                              : health?.status ?? "Loading..."}
                          </p>
                          {healthError ? (
                            <p className="text-[11px] text-red-500">
                              {healthError}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                            OpenAI tokens
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-800">
                            {usage
                              ? `${usage.total_tokens.toLocaleString()} tokens`
                              : "Loading..."}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {usage?.updated_at
                              ? `As of ${new Date(
                                  usage.updated_at
                                ).toLocaleString()}`
                              : "Waiting for usage data"}
                          </p>
                          <button
                            type="button"
                            onClick={handleResetUsage}
                            disabled={resetting}
                            className="mt-2 rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed"
                          >
                            {resetting ? "Resetting..." : "Reset counter"}
                          </button>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{
                                width: usage
                                  ? `${Math.min(
                                      100,
                                      Math.round(
                                        (usage.total_tokens / usage.token_budget) * 100
                                      )
                                    )}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                            <span>Budget</span>
                            <span>
                              {usage
                                ? `${usage.total_tokens.toLocaleString()} / ${usage.token_budget.toLocaleString()}`
                                : "--"}
                            </span>
                          </div>
                          {usageError ? (
                            <p className="mt-1 text-[11px] text-red-500">
                              {usageError}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <a
                            href="https://platform.openai.com/account/billing/overview"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                          >
                            Check OpenAI balance →
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      ) : null}
      <main className={isLoginPage ? "mx-auto w-full max-w-2xl px-6 py-12" : "mx-auto w-full max-w-6xl px-6 py-10"}>
        {!allowContent ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            Checking session...
          </div>
        ) : (
          children
        )}
      </main>
      {showSettingsPanel && isAuthenticated ? (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setShowSettingsPanel(false)}
            className="absolute inset-0 cursor-default bg-black/20"
          />
          <aside className="absolute right-6 top-24 w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Settings</h3>
                <p className="text-xs text-zinc-500">
                  Admin console logs and account configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 transition hover:border-zinc-300"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <details className="rounded-2xl border border-zinc-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                  Logs
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      Latest approved canonical changes.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadApprovalsLog()}
                      className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300"
                    >
                      {approvalsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                  {approvalsError ? (
                    <p className="text-xs text-rose-500">{approvalsError}</p>
                  ) : null}
                  {approvalsLoading ? (
                    <p className="text-xs text-zinc-500">Loading approvals...</p>
                  ) : approvalsLog.length ? (
                    <div className="space-y-2">
                      {approvalsLog.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-zinc-700">
                            {item.action} • {item.status}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {item.requester} • {formatTimestamp(item.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">No approvals yet.</p>
                  )}
                </div>
              </details>

              <details className="rounded-2xl border border-zinc-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                  Account settings
                </summary>
                <div className="mt-3 space-y-5">
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-zinc-600">
                      Current user ID
                      <input
                        value={accountUserId}
                        readOnly
                        className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-zinc-600">
                      Change user ID
                      <input
                        value={accountNewUserId}
                        onChange={(event) => setAccountNewUserId(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                        placeholder="new-admin"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-zinc-600">
                      Current password
                      <div className="relative mt-2">
                        <input
                          type={showAccountPassword ? "text" : "password"}
                          value={accountPassword}
                          onChange={(event) => setAccountPassword(event.target.value)}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                          placeholder="Current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                          aria-label={showAccountPassword ? "Hide password" : "Show password"}
                        >
                          {showAccountPassword ? (
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
                      Change password
                      <div className="relative mt-2">
                        <input
                          type={showAccountNewPassword ? "text" : "password"}
                          value={accountNewPassword}
                          onChange={(event) => setAccountNewPassword(event.target.value)}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                          placeholder="At least 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountNewPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                          aria-label={showAccountNewPassword ? "Hide password" : "Show password"}
                        >
                          {showAccountNewPassword ? (
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
                      Re-enter password
                      <div className="relative mt-2">
                        <input
                          type={showAccountConfirmPassword ? "text" : "password"}
                          value={accountNewPasswordConfirm}
                          onChange={(event) =>
                            setAccountNewPasswordConfirm(event.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                          placeholder="Re-enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                          aria-label={showAccountConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showAccountConfirmPassword ? (
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
                    {accountError ? (
                      <p className="text-xs text-rose-500">{accountError}</p>
                    ) : accountStatus ? (
                      <p className="text-xs text-emerald-600">{accountStatus}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleChangeUserId()}
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
                      >
                        Update user ID
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleChangePassword()}
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
                      >
                        Update password
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Secret question
                    </p>
                    {recoveryCurrentQuestion ? (
                      <p className="text-xs text-zinc-600">
                        Current question: {recoveryCurrentQuestion}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        No recovery question set yet.
                      </p>
                    )}
                    <label className="block text-xs font-semibold text-zinc-600">
                      New secret question
                      <input
                        value={recoverySetupQuestion}
                        onChange={(event) => setRecoverySetupQuestion(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                        placeholder="Example: First concert?"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-zinc-600">
                      Secret answer
                      <div className="relative mt-2">
                        <input
                          type={showRecoverySetupAnswer ? "text" : "password"}
                          value={recoverySetupAnswer}
                          onChange={(event) => setRecoverySetupAnswer(event.target.value)}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-700"
                          placeholder="Answer"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoverySetupAnswer((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                          aria-label={showRecoverySetupAnswer ? "Hide answer" : "Show answer"}
                        >
                          {showRecoverySetupAnswer ? (
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
                    {recoverySetupError ? (
                      <p className="text-xs text-rose-500">{recoverySetupError}</p>
                    ) : recoverySetupStatus ? (
                      <p className="text-xs text-emerald-600">{recoverySetupStatus}</p>
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        Store a recovery question for password resets.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSetRecovery()}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
                    >
                      Save recovery question
                    </button>
                  </div>

                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
