'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

import DealModal from '../deals/DealModal'
import ContactPanel from '../deals/ContactPanel'
import RecentConversations from '../deals/RecentConversations'
import DealCard from '../deals/DealCard'
import DealFilters from '../deals/DealFilters'
import ConversationThread from '../deals/ConversationThread'
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

  const [buyerMatches, setBuyerMatches] = useState<any[]>([])
  const [activeBuyerTab, setActiveBuyerTab] = useState('matches')

  useEffect(() => {
    loadInventory()
    loadConversations()
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
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('id', { ascending: false })

  if (error) {
    alert('Inventory load error: ' + error.message)
    setInventory([])
    return
  }

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

  async function loadBuyerMatches() {

  const { data, error } = await supabase
    .from('buyer_matches')
    .select('*')
    .order('id', { ascending: false })
    .limit(20)

  if (error) {
    alert('Buyer matches load error: ' + error.message)
    setBuyerMatches([])
    return
  }

  setBuyerMatches(data || [])
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

  const generateBuyerMatches = async () => {
    const { data: freshInventory, error: freshInventoryError } = await supabase
  .from('inventory')
  .select('*')
  .eq('status', 'active')
  .order('id', { ascending: false })

if (freshInventoryError) {
  alert('Fresh inventory load error: ' + freshInventoryError.message)
  return
}

if (!freshInventory || freshInventory.length === 0) {
      alert('No active deals available for buyer matching')
      return
    }

    const activeDeals = freshInventory
      .filter((deal) => deal.status === 'active')
      .slice(0, 5)

    if (activeDeals.length === 0) {
      alert('No active inventory found for buyer matching')
      return
    }

    const newMatches = activeDeals.map((deal, index) => ({
      inventory_id: deal.id,
      inventory_title: deal.item_title || deal.title,
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
  alert('Buyer match insert error: ' + error.message)
  return
}

alert('Buyer matches inserted: ' + (data?.length || 0))

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
  const { error: buyerTaskError } = await supabase
    .from('buyer_outreach_tasks')
    .insert({
      inventory_item_id: match.inventory_id,
      item_title: match.inventory_title,
      listing_price:
        inventory.find((deal) => deal.id === match.inventory_id)?.price || 0,
      buyer_name: match.buyer_name,
      buyer_platform: 'Facebook Marketplace',
      outreach_message: `Hi ${match.buyer_name}, DealHaus found a listing you may be interested in: ${match.inventory_title}. Would you like details?`,
      outreach_status: 'buyer_contacted',
    })

  if (buyerTaskError) {
    alert('Buyer outreach task error: ' + buyerTaskError.message)
    return
  }
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
  const buyerMessage = `Hi ${match.buyer_name}, DealHaus found a listing you may be interested in: ${match.inventory_title}. Would you like details?`

  const { error: matchError } = await supabase
    .from('buyer_matches')
    .update({ outreach_status: 'contacted' })
    .eq('id', match.id)

  if (matchError) {
    alert('Buyer match update error: ' + matchError.message)
    return
  }

  const listingPrice =
    inventory.find((deal) => deal.id === match.inventory_id)?.price || 0

  const { error: taskError } = await supabase
    .from('buyer_outreach_tasks')
    .insert({
      inventory_item_id: match.inventory_id,
      item_title: match.inventory_title,
      listing_price: listingPrice,
      buyer_name: match.buyer_name,
      buyer_platform: 'Facebook Marketplace',
      outreach_message: buyerMessage,
      outreach_status: 'buyer_contacted',
    })

  if (taskError) {
    alert('Buyer outreach task error: ' + taskError.message)
    return
  }

  const { error: conversationError } = await supabase
    .from('buyer_conversations')
    .insert({
      inventory_id: match.inventory_id,
      inventory_title: match.inventory_title,
      buyer_name: match.buyer_name,
      buyer_email: match.buyer_email,
      last_message: buyerMessage,
      conversation_stage: 'buyer_contacted',
      unread_count: 1,
    })

  if (conversationError) {
    alert('Buyer conversation error: ' + conversationError.message)
    return
  }

  const { error: inventoryError } = await supabase
    .from('inventory')
    .update({ deal_stage: 'contacted' })
    .eq('id', match.inventory_id)

  if (inventoryError) {
    alert('Inventory update error: ' + inventoryError.message)
    return
  }

  setBuyerMatches((prev) =>
    prev.map((item) =>
      item.id === match.id ? { ...item, outreach_status: 'contacted' } : item
    )
  )

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

            const salePrice = Number(
              selectedDeal.final_sale_price || selectedDeal.price || 0
            )
            const commissionRate = Number(
              selectedDeal.commission_rate || 10
            )
            const commissionAmount = Number(
              ((salePrice * commissionRate) / 100).toFixed(2)
            )
            const sellerPayout = Number(
              (salePrice - commissionAmount).toFixed(2)
            )

            const { data: existingPublishTasks, error: publishLookupError } =
              await supabase
                .from('marketplace_publish_tasks')
                .select('id')
                .eq('inventory_item_id', selectedDeal.id)
                .order('id', { ascending: false })
                .limit(1)

            if (publishLookupError) {
              alert('Marketplace task lookup failed: ' + publishLookupError.message)
              return
            }

            let publishTaskId = existingPublishTasks?.[0]?.id || null

            if (publishTaskId) {
              const { error: publishUpdateError } = await supabase
                .from('marketplace_publish_tasks')
                .update({
                  publish_status: 'sold',
                  listing_price: salePrice,
                })
                .eq('id', publishTaskId)

              if (publishUpdateError) {
                alert('Marketplace task update failed: ' + publishUpdateError.message)
                return
              }
            } else {
              const { data: newPublishTask, error: publishInsertError } =
                await supabase
                  .from('marketplace_publish_tasks')
                  .insert({
                    inventory_item_id: selectedDeal.id,
                    item_title: selectedDeal.title,
                    listing_price: salePrice,
                    publish_status: 'sold',
                  })
                  .select('id')
                  .single()

              if (publishInsertError) {
                alert('Marketplace task creation failed: ' + publishInsertError.message)
                return
              }

              publishTaskId = newPublishTask?.id || null
            }

            const { data: existingRevenueRecords, error: revenueLookupError } =
              await supabase
                .from('revenue_records')
                .select('id')
                .eq('inventory_item_id', selectedDeal.id)
                .order('id', { ascending: false })
                .limit(1)

            if (revenueLookupError) {
              alert('Revenue lookup failed: ' + revenueLookupError.message)
              return
            }

            let revenueRecordId = existingRevenueRecords?.[0]?.id || null

            const revenuePayload = {
              inventory_item_id: selectedDeal.id,
              item_title: selectedDeal.title,
              sale_price: salePrice,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              seller_payout: sellerPayout,
              revenue_status: 'earned',
            }

            if (revenueRecordId) {
              const { error: revenueUpdateError } = await supabase
                .from('revenue_records')
                .update(revenuePayload)
                .eq('id', revenueRecordId)

              if (revenueUpdateError) {
                alert('Revenue update failed: ' + revenueUpdateError.message)
                return
              }
            } else {
              const { data: newRevenueRecord, error: revenueInsertError } =
                await supabase
                  .from('revenue_records')
                  .insert(revenuePayload)
                  .select('id')
                  .single()

              if (revenueInsertError) {
                alert('Revenue creation failed: ' + revenueInsertError.message)
                return
              }

              revenueRecordId = newRevenueRecord?.id || null
            }

            const { data: existingTransactions, error: transactionLookupError } =
              await supabase
                .from('brokerage_transactions')
                .select('id')
                .eq('inventory_item_id', selectedDeal.id)
                .order('id', { ascending: false })
                .limit(1)

            if (transactionLookupError) {
              alert('Transaction lookup failed: ' + transactionLookupError.message)
              return
            }

            const transactionPayload = {
              inventory_item_id: selectedDeal.id,
              marketplace_publish_task_id: publishTaskId,
              revenue_record_id: revenueRecordId,
              item_title: selectedDeal.title,
              buyer_name: selectedDeal.buyer_name || 'Buyer',
              seller_name: selectedDeal.seller_name || 'Marketplace Seller',
              seller_email: selectedDeal.seller_email || '',
              sale_price: salePrice,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              seller_payout: sellerPayout,
              meetup_status: 'completed',
              buyer_confirmed: true,
              seller_confirmed: true,
              invoice_status: 'not_sent',
              payment_status: 'unpaid',
              transaction_status: 'pending',
            }

            const existingTransactionId = existingTransactions?.[0]?.id || null

            if (existingTransactionId) {
              const { error: transactionUpdateError } = await supabase
                .from('brokerage_transactions')
                .update(transactionPayload)
                .eq('id', existingTransactionId)

              if (transactionUpdateError) {
                alert('Transaction update failed: ' + transactionUpdateError.message)
                return
              }
            } else {
              const { error: transactionInsertError } = await supabase
                .from('brokerage_transactions')
                .insert(transactionPayload)

              if (transactionInsertError) {
                alert('Transaction creation failed: ' + transactionInsertError.message)
                return
              }
            }

            const { data: closedInventory, error: inventoryCloseError } =
              await supabase
                .from('inventory')
                .update({
                  status: 'closed',
                  deal_stage: 'sold',
                  final_sale_price: salePrice,
                  commission_collected: false,
                  closed_at: new Date().toISOString(),
                })
                .eq('id', selectedDeal.id)
                .select('id,status')
                .single()

            if (inventoryCloseError || closedInventory?.status !== 'closed') {
              alert(
                'Inventory close failed: ' +
                  (inventoryCloseError?.message || 'Deal did not move to closed status.')
              )
              return
            }

            closeModal()
            await loadInventory()

            alert(
              `${selectedDeal.title} sale completed. $${commissionAmount.toLocaleString()} commission moved to Revenue Analytics.`
            )
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

    </div>
  )
}