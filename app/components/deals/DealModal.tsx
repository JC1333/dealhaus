'use client'

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
  const buyerStatus = deal?.buyer_outreach_status || "not_contacted"

  if (!deal) return null

  function contactSellerByPreference() {
    const preferredMethod = String(
      deal.preferred_contact_method || "email"
    ).toLowerCase()

    const sellerPhone = String(deal.seller_phone || "").replace(/[^\d+]/g, "")
    const sellerEmail = String(deal.seller_email || "").trim()

    const message = `Hi ${
      deal.seller_name || "there"
    }, this is DealHaus regarding your listing "${deal.title}".`

    if (preferredMethod === "text") {
      if (!sellerPhone) {
        alert("This seller selected text, but no phone number is available.")
        onContactSeller()
        return
      }

      onContactSeller()
        return
    }

    if (preferredMethod === "call") {
      if (!sellerPhone) {
        alert("This seller selected phone call, but no phone number is available.")
        onContactSeller()
        return
      }

      onContactSeller()
        return
    }

    if (!sellerEmail) {
      alert("This seller selected email, but no email address is available.")
      onContactSeller()
      return
    }

    const subject = `DealHaus: ${deal.title}`

    const gmailComposeUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(sellerEmail)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(message)}`

    window.open(gmailComposeUrl, "_blank", "noopener,noreferrer")
  }

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
              <p className="text-zinc-500 text-sm">Buyer Status</p>
              <p className="text-xl font-bold capitalize text-purple-400">
                {buyerStatus.replaceAll("_", " ")}
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
              priority opportunity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            <button
              onClick={onCloseDeal}
              className="rounded-xl bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400 transition"
            >
              Complete Sale
            </button>

            <button
              onClick={contactSellerByPreference}
              className="rounded-xl border border-zinc-700 px-4 py-3 font-semibold text-white hover:bg-zinc-900 transition"
            >
              Contact Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}