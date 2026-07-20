import Link from "next/link";

export default function SubmissionSuccessPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">

        <div className="mb-8 rounded-full bg-green-600/20 p-6">
          <span className="text-5xl">✓</span>
        </div>

        <h1 className="text-5xl font-black">
          Listing Submitted Successfully
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-zinc-300">
          Thank you for choosing DealHaus.
          Your marketplace listing has been received and entered into our
          AI-powered brokerage system.
        </p>

        <div className="mt-12 w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-left">

          <h2 className="mb-6 text-2xl font-bold">
            What Happens Next?
          </h2>

          <div className="space-y-5">

            <div>
              <div className="font-bold text-green-400">
                ✓ AI Review
              </div>
              <p className="text-zinc-300">
                Our AI reviews your listing and verifies pricing,
                category and listing quality.
              </p>
            </div>

            <div>
              <div className="font-bold text-green-400">
                ✓ Seller Verification
              </div>
              <p className="text-zinc-300">
                If additional information is needed we'll contact you
                using your preferred contact method.
              </p>
            </div>

            <div>
              <div className="font-bold text-green-400">
                ✓ Buyer Search
              </div>
              <p className="text-zinc-300">
                Once approved, DealHaus begins locating qualified buyers
                across supported marketplaces.
              </p>
            </div>

            <div>
              <div className="font-bold text-green-400">
                ✓ Negotiation & Coordination
              </div>
              <p className="text-zinc-300">
                Our brokerage team helps negotiate offers and coordinate
                the sale while keeping you informed.
              </p>
            </div>

          </div>
        </div>

        <Link
          href="/"
          className="mt-10 rounded-xl bg-cyan-500 px-8 py-4 font-bold text-black hover:bg-cyan-400"
        >
          Return Home
        </Link>

      </div>
    </main>
  );
}