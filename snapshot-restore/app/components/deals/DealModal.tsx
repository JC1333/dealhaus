import BuyerMatchPanel from "./BuyerMatchPanel"
type DealModalProps = {
  deal: any
  onClose: () => void
  onContactSeller: () => void
  onCloseDeal: () => void
}

export default function DealModal({
  deal,
  onClose,
  onContactSeller,
onCloseDeal,
}: DealModalProps) {
  if (!deal) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-6 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-zinc-950 border border-zinc-800">
        <img
          src={deal.image}
          alt={deal.title}
          className="h-80 w-full object-cover"
        />

        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white">{deal.title}</h2>
              <p className="text-zinc-400 mt-2">{deal.description}</p>
            </div>

            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-zinc-800 pt-5">
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">Asking Price</p>
              <p className="text-2xl font-bold text-white">
                ${Number(deal.price || 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">Market Value</p>
              <p className="text-2xl font-bold text-green-400">
                ${Number(deal.estimated_market_value || 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">AI Spread</p>
              <p className="text-2xl font-bold text-cyan-400">
                ${Number(deal.arbitrage_spread || 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">Confidence</p>
              <p className="text-2xl font-bold text-purple-400">
                {deal.ai_confidence || 75}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">Seller Status</p>
              <p className="text-xl font-bold capitalize text-green-400">
                {deal.seller_status || "new"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">Buyer Demand</p>
              <p className="text-xl font-bold capitalize text-cyan-400">
                {deal.buyer_demand || "medium"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-zinc-500 text-sm">Estimated Days To Sell</p>
              <p className="text-xl font-bold text-purple-400">
                {deal.estimated_days_to_sell || 7} days
              </p>
            </div>
          </div>
             <BuyerMatchPanel deal={deal} />
          <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-5">
            <p className="text-cyan-400 font-bold text-lg mb-2">
              AI Arbitrage Summary
            </p>

            <p className="text-zinc-300 leading-relaxed">
              DealHaus AI estimates this item may have a resale spread of{" "}
              <span className="font-bold text-cyan-400">
                ${Number(deal.arbitrage_spread || 0).toLocaleString()}
              </span>{" "}
              with{" "}
              <span className="font-bold text-purple-400">
                {deal.ai_confidence || 75}% confidence
              </span>
              . Buyer demand is currently{" "}
              <span className="font-bold text-green-400 capitalize">
                {deal.buyer_demand || "medium"}
              </span>
              , making this a{" "}
              <span className="font-bold text-white capitalize">
                {deal.ai_priority || "medium"}
              </span>{" "}
              priority opportunity for seller outreach.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <button
              onClick={onCloseDeal}
              className="rounded-xl bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400 transition"
            >
              Close Deal
            </button>

            <button
              onClick={onContactSeller}
              className="rounded-xl border border-zinc-700 px-4 py-3 font-semibold text-white hover:bg-zinc-900 transition"
            >
              Contact Seller
            </button>

            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-ai-outreach"))
              }}
              className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black hover:bg-cyan-300 transition"
            >
              AI Outreach
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}