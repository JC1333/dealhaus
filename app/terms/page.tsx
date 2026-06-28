export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <a href="/launch" className="text-cyan-400 font-bold">
          ← Back to DealHaus
        </a>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-cyan-400 text-sm font-bold uppercase">
            Terms of Service
          </p>

          <h1 className="mt-3 text-4xl font-black">
            DealHaus Terms of Service
          </h1>

          <p className="mt-4 text-sm text-zinc-500">
            Effective: June 2026
          </p>

          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">

            <p>
              By using DealHaus, you agree to these Terms of Service. If you do not
              agree, please do not use our website or services.
            </p>

            <h2 className="text-2xl font-bold text-white">
              Our Service
            </h2>

            <p>
              DealHaus is an AI-powered marketplace brokerage that helps connect
              sellers with potential buyers. DealHaus does not guarantee the sale
              of any item and does not take ownership of inventory unless
              explicitly agreed in writing.
            </p>

            <h2 className="text-2xl font-bold text-white">
              Seller Responsibilities
            </h2>

            <p>
              Sellers are responsible for providing accurate descriptions,
              truthful information, legal ownership of listed items, and honoring
              any agreed-upon sales.
            </p>

            <h2 className="text-2xl font-bold text-white">
              Buyer Responsibilities
            </h2>

            <p>
              Buyers are responsible for inspecting items, confirming condition,
              arranging payment directly with the seller when applicable, and
              complying with all applicable laws.
            </p>

            <h2 className="text-2xl font-bold text-white">
              Fees
            </h2>

            <p>
              DealHaus earns a success-based commission only when a qualifying
              transaction is completed under the agreed brokerage arrangement.
            </p>

            <h2 className="text-2xl font-bold text-white">
              Limitation of Liability
            </h2>

            <p>
              DealHaus is not responsible for disputes, product defects,
              marketplace interruptions, or losses arising from transactions
              between buyers and sellers.
            </p>

            <h2 className="text-2xl font-bold text-white">
              Contact
            </h2>

            <p>
              Questions regarding these Terms may be sent to
              hello@dealhaus.us or by calling (702) 608-1303.
            </p>

          </div>
        </section>
      </div>
    </main>
  );
}