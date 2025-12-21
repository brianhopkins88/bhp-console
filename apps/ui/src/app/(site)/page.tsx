export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Photography in San Diego
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          Warm, natural portraits for families, grads, and couples.
        </h1>
        <p className="max-w-2xl text-base text-zinc-600">
          This is the public website. We will replace this copy with your
          brand voice, featured galleries, and a booking call-to-action.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {["Family", "Graduation", "Couples"].map((service) => (
          <div
            key={service}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6"
          >
            <p className="text-sm uppercase tracking-wide text-zinc-500">
              {service}
            </p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-900">
              {service} Sessions
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Placeholder for featured gallery and a short description.
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8">
        <h3 className="text-lg font-semibold text-zinc-900">
          Ready to book?
        </h3>
        <p className="mt-2 text-sm text-zinc-600">
          We will wire this to the inquiry form once the contact flow is ready.
        </p>
      </section>
    </div>
  );
}
