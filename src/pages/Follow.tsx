export default function Follow() {
  const socials = [
    {
      name: "Instagram",
      handle: "@AthletiGolf",
      description: "Updates, tips and behind-the-scenes content.",
    },
    {
      name: "TikTok",
      handle: "@AthletiGolf",
      description: "Golf, gym and performance content.",
    },
    {
      name: "YouTube",
      handle: "AthletiGolf",
      description: "Training guides, app updates and tutorials.",
    },
    {
      name: "X",
      handle: "@AthletiGolf",
      description: "News, updates and community discussions.",
    },
  ];

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="mx-auto max-w-6xl">

        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-black/40">
            Follow Us
          </p>

          <h1 className="mb-4 text-5xl font-semibold">
            Join the AthletiGolf community
          </h1>

          <p className="text-lg leading-relaxed text-black/60">
            Follow AthletiGolf across social media for updates, tips,
            product news and future feature releases.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          {socials.map((social) => (
            <div
              key={social.name}
              className="rounded-xl border border-line bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <h2 className="mb-2 text-3xl font-semibold">
                {social.name}
              </h2>

              <p className="mb-4 text-[#4157d8] font-medium">
                {social.handle}
              </p>

              <p className="text-black/60 leading-relaxed mb-6">
                {social.description}
              </p>

              <button className="rounded-2xl bg-dark px-6 py-3 text-white font-semibold transition hover:bg-slate-800">
                Follow
              </button>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-xl bg-dark p-8 text-white shadow-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Community
          </p>

          <h2 className="mb-4 text-3xl font-semibold">
            Be part of the journey
          </h2>

          <p className="text-white/70 text-lg leading-relaxed">
            AthletiGolf is being built to connect golf performance and athletic
            development. Follow along as new features, analytics and tools are
            released.
          </p>
        </section>

      </div>
    </div>
  );
}