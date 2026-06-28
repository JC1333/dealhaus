export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <a href="/launch" className="text-cyan-400 font-bold">
          ← Back to DealHaus
        </a>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-cyan-400 text-sm font-bold uppercase">
            Contact DealHaus
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Need help with a listing, submission, or buyer inquiry?
          </h1>

          <p className="mt-5 text-zinc-400">
            DealHaus helps local sellers and buyers coordinate marketplace opportunities.
            Contact us below and we will follow up as soon as possible.
          </p>

          <div className="mt-8 grid gap-4">
            <a
              href="mailto:hello@dealhaus.us"
              className="rounded-2xl border border-zinc-800 bg-black p-5 hover:border-cyan-500"
            >
              <p className="text-sm text-zinc-500">Email</p>
              <p className="mt-1 text-xl font-bold text-cyan-400">
                hello@dealhaus.us
              </p>
            </a>

            <a
              href="tel:+17026081303"
              className="rounded-2xl border border-zinc-800 bg-black p-5 hover:border-cyan-500"
            >
              <p className="text-sm text-zinc-500">Phone</p>
              <p className="mt-1 text-xl font-bold text-cyan-400">
                (702) 608-1303
              </p>
            </a>

            <div className="rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-500">Location</p>
              <p className="mt-1 text-xl font-bold">Las Vegas, Nevada</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}