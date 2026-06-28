export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <a href="/launch" className="text-cyan-400 font-bold">
          ← Back to DealHaus
        </a>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <p className="text-cyan-400 text-sm font-bold uppercase">
            Privacy Policy
          </p>

          <h1 className="mt-3 text-4xl font-black">
            DealHaus Privacy Policy
          </h1>

          <p className="mt-4 text-sm text-zinc-500">
            Last updated: June 2026
          </p>

          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              DealHaus AI respects your privacy. This Privacy Policy explains how we collect,
              use, and protect information submitted through our website, marketplace, seller
              submission forms, buyer inquiry forms, and related services.
            </p>

            <h2 className="text-2xl font-bold text-white">Information We Collect</h2>
            <p>
              We may collect your name, email address, phone number, item details, asking price,
              location information, marketplace listing links, uploaded photos, buyer inquiry
              messages, and other information you choose to submit.
            </p>

            <h2 className="text-2xl font-bold text-white">How We Use Information</h2>
            <p>
              We use submitted information to review seller items, prepare marketplace listings,
              respond to buyer inquiries, coordinate communication, improve DealHaus services,
              and support successful local transactions.
            </p>

            <h2 className="text-2xl font-bold text-white">Photos and Listings</h2>
            <p>
              When you upload item photos or submit listing details, you authorize DealHaus to
              review, organize, display, and use that information to help market or coordinate
              interest in your item.
            </p>

            <h2 className="text-2xl font-bold text-white">Sharing Information</h2>
            <p>
              DealHaus may share necessary listing or contact details with potential buyers,
              sellers, service providers, or marketplace partners when needed to help coordinate
              a transaction. We do not sell your personal information.
            </p>

            <h2 className="text-2xl font-bold text-white">Data Security</h2>
            <p>
              We use reasonable safeguards to protect submitted information. However, no online
              system can be guaranteed completely secure.
            </p>

            <h2 className="text-2xl font-bold text-white">Contact</h2>
            <p>
              For privacy questions, contact us at hello@dealhaus.us or call (702) 608-1303.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}