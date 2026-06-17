'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

import DealModal from '../deals/DealModal'
import ContactPanel from '../deals/ContactPanel'
import RecentConversations from '../deals/RecentConversations'
import DealCard from '../deals/DealCard'
import DealFilters from '../deals/DealFilters'
import ConversationThread from '../deals/ConversationThread'
import AiOutreachPanel from '../deals/AiOutreachPanel'
import AiActivityLog from '../deals/AiActivityLog'
import AiPriorityQueue from '../deals/AiPriorityQueue'
import BuyerMatchAgent from '../deals/BuyerMatchAgent'

import BuyerOutreachTaskQueue from './BuyerOutreachTaskQueue'
import NegotiationQueue from './NegotiationQueue'
import MarketplacePublishQueue from './MarketplacePublishQueue'

export default function DealsWorkspace() {
  const [inventory, setInventory] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('Newest')
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [showContactPanel, setShowContactPanel] = useState(false)

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')

  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [conversationMessages, setConversationMessages] = useState<any[]>([])
  const [replyMessage, setReplyMessage] = useState('')

  const [showAiOutreach, setShowAiOutreach] = useState(false)
  const [outreachMessage, setOutreachMessage] = useState('')
  const [aiLogs, setAiLogs] = useState<any[]>([])
  const [buyerMatches, setBuyerMatches] = useState<any[]>([])
  const [activeBuyerTab, setActiveBuyerTab] = useState('matches')

  useEffect(() => {
    loadInventory()
    loadConversations()
    loadAiLogs()
    loadBuyerMatches()

    const channel = supabase
      .channel('inventory-live-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
        },
        () => {
          loadInventory()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('id', { ascending: false })

    setInventory(data || [])
  }

  async function loadConversations() {
    const { data, error } = await supabase
      .from('deal_conversations')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setConversations(data)
    }
  }

  async function loadAiLogs() {
    const { data, error } = await supabase
      .from('ai_outreach_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAiLogs(data)
    }
  }

  async function loadBuyerMatches() {
    const { data, error } = await supabase
      .from('buyer_matches')
      .select('*')
      .order('id', { ascending: false })
      .limit(20)

    if (!error && data) {
      setBuyerMatches(data)
    }
  }

  const filteredDeals = inventory
    .filter((item) => item.status !== 'closed')
    .filter((item) =>
      String(item.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === 'Highest Price') {
        return Number(b.price || 0) - Number(a.price || 0)
      }

      if (sortOption === 'Lowest Price') {
        return Number(a.price || 0) - Number(b.price || 0)
      }

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      )
    })

  const closeModal = () => {
    setSelectedDeal(null)
  }

  const generateOutreachMessage = () => {
    if (!selectedDeal) return

    const options = [
      `Hi,

I came across your listing for "${selectedDeal.title}" and I think we may be able to help you sell it faster.

DealHaus connects sellers with qualified local buyers and only earns a commission after a successful sale.

There is no upfront cost to you. If you're open to it, we can start promoting your item to buyers who may already be interested.

Would you like us to help bring buyers to your listing?

— DealHaus AI`,

      `Hi there,

I saw your "${selectedDeal.title}" listing and wanted to reach out.

We help local sellers find serious buyers faster by promoting quality items through our buyer network.

You do not pay anything upfront. DealHaus only takes a commission if we help complete the sale.

Would you be open to letting us bring interested buyers your way?

— DealHaus AI`,

      `Hello,

Your "${selectedDeal.title}" listing looks like a good fit for our buyer network.

DealHaus helps sellers move items by finding interested buyers, coordinating interest, and helping create a smoother sale process.

There is no upfront fee. We only earn a commission after a successful deal.

Would you like us to help you find a buyer?

— DealHaus AI`,
    ]

    const currentIndex = options.indexOf(outreachMessage)
    const nextIndex =
      currentIndex === -1 || currentIndex === options.length - 1
        ? 0
        : currentIndex + 1

    setOutreachMessage(options[nextIndex])
  }

  useEffect(() => {
    const handleOpenAiOutreach = () => {
      generateOutreachMessage()
      setShowAiOutreach(true)
    }

    window.addEventListener('open-ai-outreach', handleOpenAiOutreach)

    return () => {
      window.removeEventListener('open-ai-outreach', handleOpenAiOutreach)
    }
  }, [selectedDeal, outreachMessage])

  const generateBuyerMatches = async () => {
    if (!inventory || inventory.length === 0) {
      alert('No active deals available for buyer matching')
      return
    }

    const activeDeals = inventory
      .filter((deal) => deal.status === 'active')
      .slice(0, 5)

    if (activeDeals.length === 0) {
      alert('No active inventory found for buyer matching')
      return
    }

    const newMatches = activeDeals.map((deal, index) => ({
      inventory_id: deal.id,
      inventory_title: deal.title,
      buyer_name: `Qualified Buyer ${index + 1}`,
      buyer_email: `buyer${index + 1}@dealhaus.local`,
      buyer_interest_score: Math.min(95, 82 + index * 3),
      outreach_status: 'buyer_contacted',
    }))

    const { data, error } = await supabase
      .from('buyer_matches')
      .insert(newMatches)
      .select()

    if (error) {
      alert(error.message)
      return
    }

    if (data) {
      setBuyerMatches((prev) => [...data, ...prev])

      for (const match of data) {
        const listingPrice =
          inventory.find((deal) => deal.id === match.inventory_id)?.price || 0

        const { data: existingBuyerTask } = await supabase
          .from('buyer_outreach_tasks')
          .select('id')
          .eq('inventory_item_id', match.inventory_id)
          .limit(1)
          .single()

        if (!existingBuyerTask) {
          await supabase.from('buyer_outreach_tasks').insert({
            inventory_item_id: match.inventory_id,
            item_title: match.inventory_title,
            listing_price: listingPrice,
            buyer_name: match.buyer_name,
            buyer_platform: 'Facebook Marketplace',
            outreach_message: `Hi ${match.buyer_name}, DealHaus found a listing you may be interested in: ${match.inventory_title}. Would you like details?`,
            outreach_status: 'buyer_contacted',
          })
        }

        const { data: existingNegotiation } = await supabase
          .from('negotiation_tasks')
          .select('id')
          .eq('inventory_item_id', match.inventory_id)
          .limit(1)
          .single()

        if (!existingNegotiation) {
          await supabase.from('negotiation_tasks').insert({
            inventory_item_id: match.inventory_id,
            item_title: match.inventory_title,
            buyer_name: match.buyer_name,
            listing_price: listingPrice,
            current_offer: listingPrice,
            negotiation_status: 'pending',
          })
        }

        const { data: existingPublishTask } = await supabase
          .from('marketplace_publish_tasks')
          .select('id')
          .eq('inventory_item_id', match.inventory_id)
          .limit(1)
          .single()

        if (!existingPublishTask) {
          await supabase.from('marketplace_publish_tasks').insert({
            inventory_item_id: match.inventory_id,
            item_title: match.inventory_title,
            listing_price: listingPrice,
            publish_status: 'ready_to_publish',
          })
        }
      }
    }

    alert('Buyer matches, outreach tasks, negotiations, and publish tasks generated')
  }

  async function contactBuyer(match: any) {
    const { error } = await supabase
      .from('buyer_matches')
      .update({
        outreach_status: 'contacted',
      })
      .eq('id', match.id)

    if (error) {
      alert(error.message)
      return
    }

    setBuyerMatches((prev) =>
      prev.map((item) =>
        item.id === match.id ? { ...item, outreach_status: 'contacted' } : item
      )
    )

    const { data: existingBuyerTask } = await supabase
      .from('buyer_outreach_tasks')
      .select('id')
      .eq('inventory_item_id', match.inventory_id)
      .limit(1)
      .single()

    if (!existingBuyerTask) {
      await supabase.from('buyer_outreach_tasks').insert({
        inventory_item_id: match.inventory_id,
        item_title: match.inventory_title,
        listing_price:
          inventory.find((deal) => deal.id === match.inventory_id)?.price || 0,
        buyer_name: match.buyer_name,
        buyer_platform: 'Facebook Marketplace',
        outreach_message: `Hi ${match.buyer_name}, DealHaus found a listing you may be interested in: ${match.inventory_title}. Would you like details?`,
        outreach_status: 'buyer_contacted',
      })
    }

    if (existingBuyerTask) {
      await supabase.from('exception_tasks').insert({
        exception_type: 'duplicate_buyer_outreach_attempt',
        related_table: 'buyer_outreach_tasks',
        related_record_id: existingBuyerTask.id,
        item_title: match.inventory_title,
        exception_status: 'open',
        notes: `Duplicate buyer outreach blocked for ${match.buyer_name} on ${match.inventory_title}.`,
      })
    }

    const { error: conversationError } = await supabase
      .from('buyer_conversations')
      .insert({
        inventory_id: match.inventory_id,
        inventory_title: match.inventory_title,
        buyer_name: match.buyer_name,
        buyer_email: match.buyer_email,
        last_message: `Hi ${match.buyer_name}, DealHaus found a listing you may be interested in: ${match.inventory_title}. Would you like details?`,
        conversation_stage: 'buyer_contacted',
        unread_count: 1,
      })

    if (conversationError) {
      alert(conversationError.message)
      return
    }

    await supabase
      .from('inventory')
      .update({
        deal_stage: 'contacted',
      })
      .eq('id', match.inventory_id)

    alert(`Buyer outreach sent and conversation created for ${match.buyer_name}`)
  }

  return (
    <div className="space-y-8">
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={closeModal}
          onContactSeller={() => setShowContactPanel(true)}
          onCloseDeal={async () => {
            if (!selectedDeal) return

            const { error } = await supabase
              .from('inventory')
              .update({
                status: 'closed',
                deal_stage: 'closed',
                final_sale_price: selectedDeal.price,
                commission_collected: true,
                closed_at: new Date().toISOString(),
              })
              .eq('id', selectedDeal.id)

            if (error) {
              alert(error.message)
              return
            }

            alert(`${selectedDeal.title} marked as closed`)
            closeModal()
            loadInventory()
          }}
        />
      )}

      {showContactPanel && (
        <ContactPanel
          selectedDeal={selectedDeal}
          contactName={contactName}
          setContactName={setContactName}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          contactMessage={contactMessage}
          setContactMessage={setContactMessage}
          onClose={() => setShowContactPanel(false)}
          onSend={async () => {
            const { data, error } = await supabase
              .from('deal_conversations')
              .insert({
                deal_title: selectedDeal?.title,
                buyer_name: contactName,
                buyer_email: contactEmail,
                message: contactMessage,
                unread_count: 1,
              })
              .select()
              .single()

            if (error) {
              alert(error.message)
              return
            }

            if (data) {
              setConversations((prev) => [data, ...prev])
            }

            alert('Message saved to conversations')

            setContactName('')
            setContactEmail('')
            setContactMessage('')
            setShowContactPanel(false)
          }}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Active Deals
          </h1>

          <p className="text-zinc-400 mt-3 text-lg">
            Inventory operations, buyer pipeline, and marketplace execution.
          </p>

          <p className="text-green-400 mt-2 font-semibold">
            Loaded inventory items: {inventory.length}
          </p>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500 px-5 py-3 rounded-2xl">
          <p className="text-cyan-400 font-semibold">
            Marketplace Sync Active
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveBuyerTab('matches')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeBuyerTab === 'matches'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          Buyer Matches
        </button>

        <button
          onClick={() => setActiveBuyerTab('outreach')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeBuyerTab === 'outreach'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          Buyer Outreach
        </button>

        <button
          onClick={() => setActiveBuyerTab('negotiation')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeBuyerTab === 'negotiation'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          Negotiation
        </button>

        <button
          onClick={() => setActiveBuyerTab('publish')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeBuyerTab === 'publish'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          Marketplace Publish
        </button>
      </div>

      {activeBuyerTab === 'matches' && (
        <div className="space-y-8">
          <BuyerMatchAgent
            matches={buyerMatches}
            onGenerateBuyerMatches={generateBuyerMatches}
            onContactBuyer={contactBuyer}
          />

          <AiPriorityQueue
            deals={inventory}
            onSelectDeal={(deal) => {
              setSelectedDeal(deal)
            }}
          />
        </div>
      )}

      {activeBuyerTab === 'outreach' && (
        <div className="space-y-8">
          <BuyerOutreachTaskQueue />

          <RecentConversations
            conversations={conversations}
            onSelectConversation={async (conversation) => {
              const { data: updatedConversation, error: updateError } =
                await supabase
                  .from('deal_conversations')
                  .update({ unread_count: 0 })
                  .eq('id', conversation.id)
                  .select()
                  .single()

              if (updateError) {
                alert(updateError.message)
                return
              }

              setSelectedConversation(updatedConversation)

              setConversations((prev) =>
                prev.map((item) =>
                  Number(item.id) === Number(conversation.id)
                    ? updatedConversation
                    : item
                )
              )

              const { data, error } = await supabase
                .from('deal_messages')
                .select('*')
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: true })

              if (!error && data) {
                setConversationMessages(data)
              }
            }}
          />

          {selectedConversation && (
            <ConversationThread
              conversation={selectedConversation}
              messages={conversationMessages}
              replyMessage={replyMessage}
              setReplyMessage={setReplyMessage}
              onSendReply={async () => {
                if (!replyMessage.trim()) return

                const { data, error } = await supabase
                  .from('deal_messages')
                  .insert({
                    conversation_id: selectedConversation.id,
                    sender: 'DealHaus',
                    message: replyMessage,
                  })
                  .select()
                  .single()

                if (!error && data) {
                  setConversationMessages((prev) => [...prev, data])
                  setReplyMessage('')
                }
              }}
              onClose={() => {
                setSelectedConversation(null)
                setConversationMessages([])
                setReplyMessage('')
              }}
            />
          )}
        </div>
      )}

      {activeBuyerTab === 'negotiation' && (
        <div className="space-y-8">
          <NegotiationQueue />
        </div>
      )}

      {activeBuyerTab === 'publish' && (
        <div className="space-y-8">
          <MarketplacePublishQueue />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-zinc-500 mb-3">
            Active Listings
          </p>

          <h3 className="text-4xl font-bold text-cyan-400">
            {filteredDeals.length}
          </h3>
        </div>

        <div className="metric-card">
          <p className="text-zinc-500 mb-3">
            Buyer Matches
          </p>

          <h3 className="text-4xl font-bold text-green-400">
            {buyerMatches.length}
          </h3>
        </div>

        <div className="metric-card">
          <p className="text-zinc-500 mb-3">
            Conversations
          </p>

          <h3 className="text-4xl font-bold text-orange-400">
            {conversations.length}
          </h3>
        </div>

        <div className="metric-card">
          <p className="text-zinc-500 mb-3">
            AI Activity Logs
          </p>

          <h3 className="text-4xl font-bold text-purple-400">
            {aiLogs.length}
          </h3>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-semibold">
              Active Marketplace Inventory
            </h3>

            <p className="text-zinc-400 mt-2">
              AI-ranked inventory across all synced marketplaces.
            </p>
          </div>

          <DealFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortOption={sortOption}
            setSortOption={setSortOption}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {filteredDeals.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No deals found.
            </div>
          ) : (
            filteredDeals.slice(0, 12).map((item) => (
              <DealCard
                key={item.id}
                item={item}
                onClick={() => {
                  setSelectedDeal(item)
                }}
              />
            ))
          )}
        </div>
      </div>

      <AiActivityLog logs={aiLogs} />

      {showAiOutreach && (
        <AiOutreachPanel
          deal={selectedDeal}
          outreachMessage={outreachMessage}
          setOutreachMessage={setOutreachMessage}
          onGenerate={generateOutreachMessage}
          onSend={async () => {
            if (!selectedDeal || !outreachMessage.trim()) return

            const { data, error } = await supabase
              .from('ai_outreach_logs')
              .insert({
                deal_id: selectedDeal.id,
                deal_title: selectedDeal.title,
                outreach_message: outreachMessage,
                status: 'sent',
              })
              .select()
              .single()

            if (error) {
              alert(error.message)
              return
            }

            if (data) {
              setAiLogs((prev) => [data, ...prev])
            }

            alert('Seller outreach saved to AI activity log')
            setShowAiOutreach(false)
          }}
          onClose={() => setShowAiOutreach(false)}
        />
      )}
    </div>
  )
}