type AiPriorityQueueProps = {
  deals: any[]
  onSelectDeal: (deal: any) => void
}

export default function AiPriorityQueue({
  deals,
  onSelectDeal,
}: AiPriorityQueueProps) {
  const priorityDeals = [...deals]
    .sort((a, b) => {
      const profitA = Number(a.estimated_profit || 0)
      const profitB = Number(b.estimated_profit || 0)
      const confidenceA = Number(a.ai_confidence || 0)
      const confidenceB = Number(b.ai_confidence || 0)

      return profitB + confidenceB * 10 - (profitA + confidenceA * 10)
    })
    .slice(0, 5)

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-4xl font-bold tracking-tight">
            AI Priority Queue
          </h3>
          <p className="text-zinc-400 mt-2">
            Top arbitrage opportunities ranked by AI profit potential.
          </p>
        </div>

        <div className="rounded-2xl border border-green-500 bg-green-500/10 px-4 py-2">
          <p className="text-green-400 font-semibold">
            {priorityDeals.length} Hot Leads
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {priorityDeals.map((deal, index) => (
          <button
            key={deal.id}
            onClick={() => onSelectDeal(deal)}
            className="w-full rounded-2xl border border-zinc-800 bg-black p-5 text-left hover:border-green-500 transition"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-green-400 font-semibold">
                  #{index + 1} AI Ranked Opportunity
                </p>

                <h4 className="text-2xl font-bold text-white mt-1">
                  {deal.title}
                </h4>

                <p className="text-zinc-400 mt-1">
                  Confidence: {deal.ai_confidence || 75}% • Priority:{" "}
                  {deal.ai_priority || "medium"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-zinc-500 text-sm">Estimated Profit</p>
                <p className="text-3xl font-bold text-green-400">
                  ${Number(deal.estimated_profit || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}