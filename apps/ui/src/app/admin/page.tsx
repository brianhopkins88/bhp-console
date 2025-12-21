"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HealthResponse = {
  status: string;
};

export default function AdminPage() {
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          API Status
        </p>
        <p className="mt-2 text-lg font-semibold text-zinc-900">
          {health ? health.status : "Checking..."}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{apiBaseUrl}</p>
        {error ? (
          <p className="mt-2 text-sm text-red-600">Error: {error}</p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Photo Library",
            description: "Upload, tag, and score new images.",
            href: "/admin/photos",
          },
          {
            title: "Gallery Assignments",
            description: "Review AI picks for services and galleries.",
            href: "/admin/galleries",
          },
          {
            title: "Drafts",
            description: "Review auto-generated copy and approve.",
            href: "/admin/drafts",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-300"
          >
            <h2 className="text-base font-semibold text-zinc-900">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
