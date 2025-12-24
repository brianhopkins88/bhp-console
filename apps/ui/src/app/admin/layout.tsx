"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HealthResponse = {
  status: string;
};

type UsageResponse = {
  total_tokens: number;
  updated_at: string;
  last_reset_at: string | null;
  token_budget: number;
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(`${apiBaseUrl}/api/v1/health`)
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

    fetch(`${apiBaseUrl}/api/v1/openai/usage`)
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
  }, [apiBaseUrl]);

  const handleResetUsage = async () => {
    setResetting(true);
    setUsageError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/openai/usage/reset`, {
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
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
            <div className="relative group">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-700"
                aria-label="OpenAI status"
              >
                AI
              </button>
              <div className="pointer-events-none absolute right-0 top-full mt-0 w-72 origin-top-right scale-95 rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600 opacity-0 shadow-lg transition group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      API status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-800">
                      {healthError ? "Offline" : health?.status ?? "Loading..."}
                    </p>
                    {healthError ? (
                      <p className="text-[11px] text-red-500">{healthError}</p>
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
                        ? `As of ${new Date(usage.updated_at).toLocaleString()}`
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
                      <p className="mt-1 text-[11px] text-red-500">{usageError}</p>
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
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
