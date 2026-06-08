type BuyerMatchAgentProps = {
  matches: any[]
  onGenerateBuyerMatches: () => void
  onContactBuyer: (match: any) => void
}

export default function BuyerMatchAgent({
  matches,
  onGenerateBuyerMatches,
  onContactBuyer,
}: BuyerMatchAgentProps) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-4xl font-bold tracking-tight">
            AI Buyer Match Agent
          </h3>

          <p className="text-zinc-400 mt-2">
            Generates and contacts potential buyer leads for active DealHaus inventory.
          </p>
        </div>

        <button
          onClick={onGenerateBuyerMatches}
          className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black hover:bg-green-400 transition"
        >
          Generate Buyer Matches
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="text-zinc-400">No buyer matches generated yet.</p>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="rounded-2xl border border-zinc-800 bg-black p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cyan-400 font-semibold">
                    Buyer Match
                  </p>

                  <h4 className="text-2xl font-bold text-white mt-1">
                    {match.buyer_name}
                  </h4>

                  <p className="text-zinc-400 mt-1">
                    {match.buyer_email}
                  </p>

                  <p className="text-zinc-500 mt-2">
                    Interested in: {match.inventory_title}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-zinc-500 text-sm">Interest Score</p>
                  <p className="text-3xl font-bold text-green-400">
                    {match.buyer_interest_score}%
                  </p>

                  <p className="mt-2 text-sm text-purple-400 capitalize">
                    {match.outreach_status}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onContactBuyer(match)}
                className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black hover:bg-cyan-300 transition"
              >
                Contact Buyer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}