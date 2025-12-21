const posts = [
  {
    title: "Best Locations for Family Photos in North County",
    status: "Draft",
  },
  {
    title: "Golden Hour Tips for Graduation Sessions",
    status: "Draft",
  },
];

export default function BlogPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-zinc-900">Blog</h1>
        <p className="max-w-2xl text-sm text-zinc-600">
          This page will surface long-form posts and photo stories.
        </p>
      </header>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.title}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-sm font-medium text-zinc-900">{post.title}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              {post.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
