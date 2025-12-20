"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
};

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

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
          setError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-2xl rounded-2xl bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          BHP Console
        </h1>
        <p className="mt-3 text-base text-zinc-600">
          UI is calling the API health check on load.
        </p>
        <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm uppercase tracking-wide text-zinc-500">
            API Status
          </p>
          <p className="mt-2 text-lg font-medium text-zinc-900">
            {health ? health.status : "Checking..."}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{apiBaseUrl}</p>
          {error ? (
            <p className="mt-2 text-sm text-red-600">Error: {error}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
