import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Admin Console</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Choose a module to continue your work.
        </p>
      </div>
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
