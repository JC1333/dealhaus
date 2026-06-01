'use client'

import { useState } from "react"
import { supabase } from "@/lib/supabase"
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
  const [buyerStatus, setBuyerStatus] = useState(deal?.buyer_outreach_status || "not_contacted")
  const [buyerNotes, setBuyerNotes] = useState(deal?.buyer_followup_notes || "")
  const [scheduledTime, setScheduledTime] = useState(deal?.buyer_scheduled_time || "")

  if (!deal) return null

  const buyerMessage =
    deal.buyer_outreach_message ||
    `Hi, I saw you're interested in quality furniture. We have ${deal.title} available now for $${deal.price || 0}. Let me know if you'd like details or want to schedule a pickup.`

  async function updateBuyerStatus(status: string) {
    const { error } = await supabase
      .from("inventory")
      .update({ buyer_outreach_status: status })
      .eq("id", deal.id)

    if (error) {
      alert(error.message)
      return
    }

    setBuyerStatus(status)
  }

  async function saveBuyerFollowUp() {
    const { error } = await supabase
      .from("inventory")
      .update({
        buyer_followup_notes: buyerNotes,
        buyer_scheduled_time: scheduledTime,
      })
      .eq("id", deal.id)

    if (error) {
      alert(error.message)
      return
    }

    alert("Buyer follow-up saved.")
  }

  async function markReadyToClose() {
    const { error } = await supabase
      .from("inventory")
      .update({
        ready_to_close: true,
        buyer_outreach_status: "ready_to_close",
      })
      .eq("id", deal.id)

    if (error) {
      alert(error.message)
      return
    }

    setBuyerStatus("ready_to_close")
    alert("Deal marked ready to close.")
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

          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <h3 className="text-xl font-bold text-white">Buyer Outreach</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Copy buyer message, track follow-up, schedule pickup, and mark ready to close.
            </p>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Buyer Message</p>
              <p className="text-sm text-zinc-300">{buyerMessage}</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(buyerMessage)
                alert("Buyer message copied.")
              }}
              className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black hover:bg-cyan-300"
            >
              Copy Buyer Message
            </button>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => updateBuyerStatus("buyer_contacted")}
                className="rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black hover:bg-yellow-300"
              >
                Mark Buyer Contacted
              </button>

              <button
                onClick={() => updateBuyerStatus("buyer_responded")}
                className="rounded-xl bg-purple-400 px-4 py-3 font-bold text-black hover:bg-purple-300"
              >
                Mark Buyer Responded
              </button>

              <button
                onClick={markReadyToClose}
                className="rounded-xl bg-green-400 px-4 py-3 font-bold text-black hover:bg-green-300"
              >
                Mark Ready To Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="Scheduled pickup / meeting time"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              />

              <button
                onClick={saveBuyerFollowUp}
                className="rounded-lg bg-white px-4 py-2 font-bold text-black hover:bg-zinc-200"
              >
                Save Buyer Follow-Up
              </button>
            </div>

            <textarea
              value={buyerNotes}
              onChange={(e) => setBuyerNotes(e.target.value)}
              placeholder="Buyer follow-up notes..."
              className="mt-3 min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
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