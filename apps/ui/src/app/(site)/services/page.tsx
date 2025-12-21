const services = [
  {
    title: "Family Portraits",
    description: "Outdoor sessions that feel relaxed and authentic.",
  },
  {
    title: "Graduation Sessions",
    description: "Celebrate milestones with clean, modern portraits.",
  },
  {
    title: "Couples + Engagements",
    description: "Golden hour storytelling with natural direction.",
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-zinc-900">Services</h1>
        <p className="max-w-2xl text-sm text-zinc-600">
          This page will include service details, pricing ranges, and booking
          guidance.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.title}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6"
          >
            <h2 className="text-lg font-semibold text-zinc-900">
              {service.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {service.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
