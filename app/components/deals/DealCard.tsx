type DealCardProps = {
  item: any
  onClick: () => void
}

export default function DealCard({ item, onClick }: DealCardProps) {
  const priorityColor =
    item.ai_priority === "high"
      ? "text-green-400 border-green-500 bg-green-500/10"
      : item.ai_priority === "low"
      ? "text-zinc-400 border-zinc-700 bg-zinc-800/50"
      : "text-cyan-400 border-cyan-500 bg-cyan-500/10"

  const sellerStatusColor =
    item.seller_status === "approved"
      ? "text-green-400 border-green-500 bg-green-500/10"
      : item.seller_status === "contacted"
      ? "text-orange-400 border-orange-500 bg-orange-500/10"
      : "text-zinc-400 border-zinc-700 bg-zinc-800/50"

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl overflow-hidden border border-zinc-800 bg-black hover:border-zinc-600 transition"
    >
      <img
        src={item.image}
        alt={item.title}
        className="h-64 w-full object-cover"
      />

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{item.title}</h3>

            <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
              {item.description}
            </p>
          </div>

          <div className="text-right">
            <p className="text-zinc-500 text-xs">Price</p>
            <p className="text-xl font-bold text-white">
              ${Number(item.price || 0).toLocaleString()}
            </p>
          </div>
        </div>

     <div className="grid grid-cols-3 gap-3">
  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
    <p className="text-zinc-500 text-xs">Spread</p>
    <p className="text-cyan-400 font-bold">
      ${Number(item.arbitrage_spread || 0).toLocaleString()}
    </p>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
    <p className="text-zinc-500 text-xs">Commission</p>
    <p className="text-green-400 font-bold">
      ${Number(item.projected_commission || 0).toLocaleString()}
    </p>
  </div>

  <div className={`rounded-xl border p-3 ${priorityColor}`}>
    <p className="text-xs opacity-80">Priority</p>
    <p className="font-bold capitalize">
      {item.ai_priority || "medium"}
    </p>
  </div>
</div>

        <div className="grid grid-cols-3 gap-3">
  <div className={`rounded-xl border p-3 ${sellerStatusColor}`}>
    <p className="text-xs opacity-80">Seller</p>
    <p className="font-bold capitalize">
      {item.seller_status || "new"}
    </p>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
    <p className="text-zinc-500 text-xs">Close Chance</p>
    <p className="font-bold text-green-400">
      {item.close_probability || 50}%
    </p>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
    <p className="text-zinc-500 text-xs">Follow-up</p>
    <p className="font-bold capitalize text-purple-400">
      {item.ai_followup_due || "pending"}
    </p>
  </div>
</div>

       <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
  <div>
    <p className="text-zinc-500 text-xs">Deal Stage</p>
    <p className="font-bold capitalize text-green-400">
      {(item.deal_stage || "new_lead").replace("_", " ")}
    </p>
  </div>

  <div>
    <p className="text-zinc-500 text-xs">Active Buyers</p>
    <p className="font-bold text-cyan-400">
      {item.active_buyers || 0}
    </p>
  </div>

  <div>
    <p className="text-zinc-500 text-xs">Close Chance</p>
    <p className="font-bold text-purple-400">
      {item.close_probability || 50}%
    </p>
  </div>
</div>
      </div>
    </div>
  )
}