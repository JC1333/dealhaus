export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <p className="text-cyan-400 text-sm font-bold uppercase">
          DealHaus AI
        </p>

        <h1 className="mt-4 text-5xl font-black">
          Page not found
        </h1>

        <p className="mt-5 max-w-2xl text-zinc-400">
          The page you are looking for may have moved, expired, or does not exist.
          You can return to DealHaus or browse active marketplace listings.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/"
            className="rounded-xl bg-cyan-400 px-6 py-4 font-bold text-black"
          >
            Back to Home
          </a>

          <a
            href="/marketplace"
            className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white hover:border-cyan-400"
          >
            Browse Listings
          </a>

          <a
            href="/submit"
            className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white hover:border-cyan-400"
          >
            Submit Item
          </a>
        </div>
      </div>
    </main>
  );
}