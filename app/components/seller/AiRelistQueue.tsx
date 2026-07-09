type AiRelistQueueProps = {
  submissions: any[]
  onGenerateListing: (submission: any) => void
}

export default function AiRelistQueue({
  submissions,
  onGenerateListing,
}: AiRelistQueueProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="mb-8">
        <h2 className="text-4xl font-bold tracking-tight">
          AI Relist Queue
        </h2>

        <p className="text-zinc-400 mt-2">
          Approved seller items waiting for AI-generated buyer-facing listings.
        </p>
      </div>

      {submissions.length === 0 ? (
        <p className="text-zinc-400">
          No seller submissions ready for relisting yet.
        </p>
      ) : (
        <div className="space-y-4">
          {submissions.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-black p-6"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-cyan-400 font-semibold">
                    Seller Submission
                  </p>

                  <h3 className="text-2xl font-bold text-white mt-1">
                    {item.item_title}
                  </h3>

                  <p className="text-zinc-400 mt-2">
                    {item.item_description}
                  </p>

                  <p className="text-zinc-500 text-sm mt-3">
                    Seller: {item.seller_name} • {item.city}, {item.state}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-zinc-500 text-sm">Seller Ask</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${Number(item.asking_price || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {item.ai_listing_title && (
                <div className="mt-6 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-5">
                  <p className="text-cyan-400 font-bold mb-2">
                    AI Buyer-Facing Listing
                  </p>

                  <h4 className="text-xl font-bold text-white">
                    {item.ai_listing_title}
                  </h4>

                  <p className="text-zinc-300 mt-2">
                    {item.ai_listing_description}
                  </p>

                  <p className="text-green-400 font-bold mt-3">
                    Relist Price: ${Number(item.ai_listing_price || 0).toLocaleString()}
                  </p>
                </div>
              )}

              <button
                onClick={() => onGenerateListing(item)}
                className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black hover:bg-cyan-300 transition"
              >
                Generate AI Relist Listing
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}