const galleries = [
  "Family Sessions",
  "Graduation Portraits",
  "Couples + Engagements",
  "Lifestyle + Branding",
];

export default function PortfolioPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-zinc-900">Portfolio</h1>
        <p className="max-w-2xl text-sm text-zinc-600">
          This page will be driven by curated galleries selected by the admin
          console.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {galleries.map((gallery) => (
          <div
            key={gallery}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-sm font-medium text-zinc-800">{gallery}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Placeholder for featured images.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
