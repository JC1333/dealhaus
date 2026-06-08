type AiPipelineStatsProps = {
  deals: any[]
}

export default function AiPipelineStats({
  deals,
}: AiPipelineStatsProps) {
  const totalLeads = deals.length

  const contacted = deals.filter(
    (deal) => deal.seller_status === "contacted"
  ).length

  const approved = deals.filter(
    (deal) => deal.seller_status === "approved"
  ).length

  const activeBuyers = deals.reduce(
    (total, deal) => total + Number(deal.active_buyers || 0),
    0
  )

  const totalSpread = deals.reduce(
    (total, deal) => total + Number(deal.arbitrage_spread || 0),
    0
  )
  const totalCommission = deals.reduce(
  (total, deal) => total + Number(deal.projected_commission || 0),
  0
)

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-4xl font-bold tracking-tight">
            AI Acquisition Pipeline
          </h3>

          <p className="text-zinc-400 mt-2">
            Live AI marketplace acquisition metrics.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500 bg-cyan-500/10 px-4 py-2">
          <p className="text-cyan-400 font-semibold">
            Autonomous Marketplace
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-zinc-500 text-sm">AI Leads</p>

          <p className="text-4xl font-bold text-white mt-2">
            {totalLeads}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-zinc-500 text-sm">Sellers Contacted</p>

          <p className="text-4xl font-bold text-orange-400 mt-2">
            {contacted}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-zinc-500 text-sm">Seller Approvals</p>

          <p className="text-4xl font-bold text-green-400 mt-2">
            {approved}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-zinc-500 text-sm">Buyer Demand</p>

          <p className="text-4xl font-bold text-cyan-400 mt-2">
            {activeBuyers}
          </p>
        </div>

       <div className="rounded-2xl border border-zinc-800 bg-black p-5">
  <p className="text-zinc-500 text-sm">Projected Commission</p>

  <p className="text-4xl font-bold text-green-400 mt-2">
    ${totalCommission.toLocaleString()}
  </p>
</div>
      </div>
    </div>
  )
}