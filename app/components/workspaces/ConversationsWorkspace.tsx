'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConversationsWorkspace() {
  const [inventory, setInventory] = useState<any[]>([])
  const [buyerConversations, setBuyerConversations] = useState<any[]>([])
  const [selectedBuyerConversation, setSelectedBuyerConversation] = useState<any>(null)
  const [buyerMessages, setBuyerMessages] = useState<any[]>([])
  const [buyerReply, setBuyerReply] = useState('')

  useEffect(() => {
  loadInventory()
  loadBuyerConversations()
}, [])

  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('id', { ascending: false })

    setInventory(data || [])
  }
  async function loadBuyerConversations() {
  const { data } = await supabase
    .from('buyer_conversations')
    .select('*')
    .order('created_at', { ascending: false })

  setBuyerConversations(data || [])
}

  return (
    <div className="space-y-6">
     <div className="card-standard">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold">
        Buyer Conversations
      </h2>

      <p className="text-zinc-400 mt-2">
        Conversations created by the AI Buyer Match Agent.
      </p>
    </div>

    <div className="bg-cyan-500/10 border border-cyan-500 px-4 py-2 rounded-2xl">
      <p className="text-cyan-400 font-semibold">
        {buyerConversations.length} Active
      </p>
    </div>
  </div>

  {buyerConversations.length === 0 ? (
    <p className="text-zinc-400">
      No buyer conversations yet.
    </p>
  ) : (
    <div className="space-y-4">
      {buyerConversations.map((conversation) => (
        <div
    
  key={conversation.id}
  onClick={async () => {
    const { data, error } = await supabase
      .from('buyer_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversation.id)
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    setSelectedBuyerConversation(data)
    const { data: messagesData } = await supabase
  .from('buyer_conversation_messages')
  .select('*')
  .eq('buyer_conversation_id', conversation.id)
  .order('created_at', { ascending: true })

setBuyerMessages(messagesData || [])

    setBuyerConversations((prev) =>
      prev.map((item) =>
        item.id === conversation.id ? data : item
      )
    )
  }}
  className="cursor-pointer bg-black border border-zinc-800 rounded-2xl p-5 hover:border-cyan-500 transition"
>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">
                {conversation.buyer_name}
              </h3>

              <p className="text-zinc-400 mt-1">
                {conversation.buyer_email}
              </p>

              <p className="text-zinc-500 mt-2">
                Interested in: {conversation.inventory_title}
              </p>
            </div>

            <div className="text-right">
              <p className="text-green-400 font-bold capitalize">
                {conversation.conversation_stage?.replace("_", " ")}
              </p>

              {conversation.unread_count > 0 && (
                <p className="mt-2 rounded-full bg-green-500 px-3 py-1 text-sm font-bold text-black">
                  {conversation.unread_count} unread
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-zinc-300">
              {conversation.last_message}
            </p>

            <p className="text-zinc-500 text-xs mt-3">
              {new Date(conversation.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )}
</div> 
{selectedBuyerConversation && (
  <div className="fixed inset-0 z-[80] bg-black/80 p-6 overflow-y-auto">
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">
            {selectedBuyerConversation.buyer_name}
          </h2>

          <p className="text-zinc-400 mt-2">
            {selectedBuyerConversation.buyer_email}
          </p>

          <p className="text-zinc-500 mt-1">
            Interested in: {selectedBuyerConversation.inventory_title}
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedBuyerConversation(null)
            setBuyerMessages([])
            setBuyerReply('')
          }}
          className="text-zinc-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-sm text-cyan-400 font-semibold mb-2">
            Buyer Conversation
          </p>

          <p className="text-zinc-300 text-lg leading-relaxed">
            {selectedBuyerConversation.last_message}
          </p>

          <p className="mt-4 text-xs text-zinc-500">
            {new Date(selectedBuyerConversation.created_at).toLocaleString()}
          </p>
        </div>

        {buyerMessages.map((message) => (
          <div
            key={message.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="text-sm text-green-400 font-semibold mb-2">
              {message.sender}
            </p>

            <p className="text-zinc-300 text-lg leading-relaxed">
              {message.message}
            </p>

            <p className="mt-4 text-xs text-zinc-500">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-zinc-800 pt-5">
        <textarea
          placeholder="Type reply to buyer..."
          value={buyerReply}
          onChange={(e) => setBuyerReply(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <button
          onClick={async () => {
            if (!buyerReply.trim()) return

            const { data, error } = await supabase
              .from('buyer_conversation_messages')
              .insert({
                buyer_conversation_id: selectedBuyerConversation.id,
                sender: 'DealHaus',
                message: buyerReply,
              })
              .select()
              .single()

            if (error) {
              alert(error.message)
              return
            }

          if (data) {
  setBuyerMessages((prev) => [...prev, data])
  setBuyerReply('')

  await supabase
    .from('inventory')
    .update({
      deal_stage: 'negotiating',
    })
    .eq('id', selectedBuyerConversation.inventory_id)
}
          }}
          className="mt-4 w-full rounded-xl bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400 transition"
        >
          Send Reply
        </button>
      </div>
    </div>
  </div>
)}
      <div className="card-standard">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

          <div>

            <h2 className="text-2xl sm:text-3xl font-bold">
              Buyer Match Engine
            </h2>

            <p className="text-zinc-400 mt-2">
              AI-powered buyer targeting and conversion intelligence
            </p>

          </div>

          <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl">

            <p className="text-green-400 font-semibold">
              AI Matching Active
            </p>

          </div>

        </div>

        <div className="space-y-4">

          {inventory.map((item: any) => {

            const buyerScore = 94

            const buyerCount = 18

            const urgency = 'High Intent'

            return (

              <div
                key={item.id}
                className="bg-black border border-zinc-800 rounded-2xl p-5"
              >

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

                  <div>

                    <h3 className="text-xl font-semibold">
                      {item.title}
                    </h3>

                    <p className="text-zinc-400 mt-2">
                      {buyerCount} AI-matched buyers identified
                    </p>

                    <p className="text-cyan-400 mt-3 font-semibold">
                      {urgency}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-4xl font-bold text-green-400">
                      {buyerScore}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      Match Score
                    </p>

                  </div>

                </div>
<div className="mt-5 bg-zinc-900 border border-zinc-800 rounded-xl p-4">

  <p className="text-zinc-500 text-sm mb-2">
    AI Outreach Preview
  </p>

  <p className="text-zinc-200 leading-relaxed">
    Hi — we identified a buyer currently searching for a product similar to "{item.title}". Based on current marketplace demand and pricing trends, we believe this item could sell quickly at a premium price point. Would you like to review potential buyer offers?
  </p>

</div>
<div className="mt-4 bg-black border border-green-500/30 rounded-xl p-4">

  <div className="flex items-center justify-between mb-3">

    <p className="text-green-400 font-semibold">
      AI Negotiation Strategy
    </p>

    <p className="text-zinc-500 text-sm">
      Close Probability: 92%
    </p>

  </div>

  <div className="space-y-2 text-sm">

    <p className="text-zinc-300">
      • AI recommends holding firm above market median pricing
    </p>

    <p className="text-zinc-300">
      • Buyer urgency signals detected in current demand pool
    </p>

    <p className="text-zinc-300">
      • Suggested counteroffer range: $
      {Math.floor(item.price * 0.92)} – $
      {Math.floor(item.price * 1.05)}
    </p>

  </div>

</div>
<div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">

  <div className="flex items-center justify-between mb-3">

    <p className="text-zinc-400 text-sm">
      AI CRM Status
    </p>

    <p className="text-green-400 text-sm font-semibold">
      Follow-Up Active
    </p>

  </div>

  <div className="grid grid-cols-3 gap-3">

    <div>

      <p className="text-zinc-500 text-xs mb-1">
        Buyer Stage
      </p>

      <p className="text-cyan-400 text-sm font-semibold">
        Negotiating
      </p>

    </div>

    <div>

      <p className="text-zinc-500 text-xs mb-1">
        Last Contact
      </p>

      <p className="text-zinc-300 text-sm">
        12 mins ago
      </p>

    </div>

    <div>

      <p className="text-zinc-500 text-xs mb-1">
        AI Sentiment
      </p>

      <p className="text-purple-400 text-sm font-semibold">
        Positive
      </p>

    </div>

  </div>

</div>
<div className="mt-4 bg-black border border-zinc-800 rounded-xl p-4">

  <div className="flex items-center justify-between mb-4">

    <p className="text-zinc-400 text-sm">
      AI Communication Timeline
    </p>

    <p className="text-green-400 text-sm font-semibold">
      Live Activity
    </p>

  </div>

  <div className="space-y-3">

    <div className="border-l-2 border-cyan-500 pl-3">

      <p className="text-zinc-200 text-sm">
        AI generated buyer outreach campaign
      </p>

      <p className="text-zinc-500 text-xs mt-1">
        12 minutes ago
      </p>

    </div>

    <div className="border-l-2 border-purple-500 pl-3">

      <p className="text-zinc-200 text-sm">
        Buyer engagement score increased
      </p>

      <p className="text-zinc-500 text-xs mt-1">
        8 minutes ago
      </p>

    </div>

    <div className="border-l-2 border-green-500 pl-3">

      <p className="text-zinc-200 text-sm">
        AI negotiation sequence initiated
      </p>

      <p className="text-zinc-500 text-xs mt-1">
        3 minutes ago
      </p>

    </div>

  </div>

</div>
<div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">

  <div className="flex items-center justify-between mb-3">

    <p className="text-zinc-400 text-sm">
      AI Generated Outreach
    </p>

    <p className="text-cyan-400 text-sm font-semibold">
      Ready To Send
    </p>

  </div>

  <div className="bg-black border border-zinc-800 rounded-xl p-4">

    <p className="text-zinc-200 text-sm leading-relaxed">
      {
  `Hi ${item.sellerName || 'Seller'} — our AI acquisition system identified strong market demand for your inventory. Based on current buyer activity, we believe your listing may qualify for premium placement and accelerated closing opportunities.`
}
    </p>

  </div>

</div>
                <div className="mt-5 flex gap-3 flex-wrap">

                  <button

  onClick={async () => {

    await fetch('/api/send-email')

    alert('AI outreach email sent')

  }}

  className="bg-cyan-600 hover:bg-cyan-500 transition px-4 py-2 rounded-xl font-semibold"
>

  Launch AI Outreach

</button>

                  <button className="bg-zinc-800 hover:bg-zinc-700 transition px-4 py-2 rounded-xl font-semibold">
                    View Buyer Profiles
                  </button>

                </div>

              </div>

            )
          })}

        </div>

      </div>

    </div>
  )
}