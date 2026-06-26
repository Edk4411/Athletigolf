export default function Contact() {
  const contactOptions = [
    {
      title: "General Support",
      description: "Questions about AthletiGolf, your account or features.",
    },
    {
      title: "Report a Bug",
      description: "Found something broken? Let us know so we can fix it.",
    },
    {
      title: "Feature Request",
      description: "Got an idea that would improve AthletiGolf? We'd love to hear it.",
    },
  ];

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="mx-auto max-w-6xl">

        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-black/40">
            Contact Us
          </p>

          <h1 className="mb-4 text-5xl font-semibold">
            Get in touch
          </h1>

          <p className="text-lg text-black/60 leading-relaxed">
            Need help, found a bug, or have an idea for AthletiGolf?
            We'd love to hear from you.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-3 mb-10">
          {contactOptions.map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-white p-8 shadow-sm border border-line hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <h2 className="text-2xl font-semibold mb-4">
                {item.title}
              </h2>

              <p className="text-black/60 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-xl bg-white p-8 shadow-sm border border-line mb-10">
          <h2 className="text-3xl font-semibold mb-6">
            Contact Information
          </h2>

          <div className="space-y-4 text-lg">
            <div>
              <p className="text-black/40 text-sm mb-1">Email</p>
              <p>support@athletigolf.com</p>
            </div>

            <div>
              <p className="text-black/40 text-sm mb-1">Response Time</p>
              <p>Usually within 24-48 hours</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-dark p-8 text-white shadow-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Feedback
          </p>

          <h2 className="mb-4 text-3xl font-semibold">
            Help shape AthletiGolf
          </h2>

          <p className="text-white/70 text-lg leading-relaxed">
            AthletiGolf is constantly evolving. Every suggestion, bug report,
            and piece of feedback helps us build a better platform for golfers
            and athletes.
          </p>
        </section>

      </div>
    </div>
  );
}