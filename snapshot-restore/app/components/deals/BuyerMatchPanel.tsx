type BuyerMatchPanelProps = {
  deal: any
}

export default function BuyerMatchPanel({ deal }: BuyerMatchPanelProps) {
  if (!deal) return null

  const buyers = Number(deal.active_buyers || 0)
  const demand = deal.buyer_demand || "medium"
  const days = Number(deal.estimated_days_to_sell || 7)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-2xl font-bold text-white">
            AI Buyer Match
          </h3>

          <p className="text-zinc-400 mt-1">
            Estimated buyer demand for this opportunity.
          </p>
        </div>

        <div className="rounded-2xl border border-green-500 bg-green-500/10 px-4 py-2">
          <p className="text-green-400 font-bold">
            {buyers} Buyers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-zinc-500 text-xs">Demand</p>
          <p className="text-xl font-bold capitalize text-green-400">
            {demand}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-zinc-500 text-xs">Matched Buyers</p>
          <p className="text-xl font-bold text-cyan-400">
            {buyers}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-zinc-500 text-xs">Expected Sell Time</p>
          <p className="text-xl font-bold text-purple-400">
            {days} days
          </p>
        </div>
      </div>

      <p className="mt-5 text-zinc-300 leading-relaxed">
        DealHaus AI estimates this listing has{" "}
        <span className="font-bold capitalize text-green-400">{demand}</span>{" "}
        buyer demand with approximately{" "}
        <span className="font-bold text-cyan-400">{buyers}</span>{" "}
        potential buyers. This helps the agent decide whether to pursue seller outreach,
        buyer matching, and commission negotiation.
      </p>
    </div>
  )
}