import Link from "next/link";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <Link href="/" className="text-sm text-zinc-500">
            Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
