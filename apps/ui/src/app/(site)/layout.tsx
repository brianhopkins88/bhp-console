import Link from "next/link";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="text-lg font-semibold">
            Brian Hopkins Photography
          </Link>
          <nav className="flex flex-wrap gap-5 text-sm text-zinc-600">
            <Link href="/services">Services</Link>
            <Link href="/portfolio">Portfolio</Link>
            <Link href="/about">About</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <Link href="/admin" className="text-sm text-zinc-500">
            Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 text-sm text-zinc-500">
          <span>San Diego, CA</span>
          <span>© {new Date().getFullYear()} Brian Hopkins Photography</span>
        </div>
      </footer>
    </div>
  );
}
