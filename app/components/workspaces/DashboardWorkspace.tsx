'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GoLiveChecklist from './GoLiveChecklist'
import AcquisitionRunPanel from "../AcquisitionRunPanel";
import SellerLeadQueue from "../SellerLeadQueue";
import OutreachReadyQueue from "../OutreachReadyQueue";
import ContactedSellerQueue from "../ContactedSellerQueue";
import SellerResponseQueue from "../SellerResponseQueue";
import SellerApprovedQueue from "../SellerApprovedQueue";
import OutreachTaskQueue from "../OutreachTaskQueue";
import ListingPrepQueue from "../ListingPrepQueue";

type DashboardWorkspaceProps = {
  sellerLeadCount: number
  queueCount: number
  activeDealCount: number
  conversationCount: number
  closedDealCount: number
  projectedCommission: number
  activeDealValue: number
  closedCommission: number
  totalPipelineCommission: number
}

export default function DashboardWorkspace({
  sellerLeadCount,
  queueCount,
  activeDealCount,
  conversationCount,
  closedDealCount,
  projectedCommission,
  activeDealValue,
  closedCommission,
  totalPipelineCommission,
}: DashboardWorkspaceProps) {
    const liveRevenue = 79410
const activeNegotiations = 39
const aiClosers = 10
const buyerDemand = 96
const dashboardStats = [
  {
  label: 'Total Pipeline Commission',
  value: `$${Math.round(totalPipelineCommission).toLocaleString()}`,
},
  {
  label: 'Projected Commission',
  value: `$${Math.round(projectedCommission).toLocaleString()}`,
},
{
  label: 'Active Deal Value',
  value: `$${Math.round(activeDealValue).toLocaleString()}`,
},
{
  label: 'Closed Commission',
  value: `$${Math.round(closedCommission).toLocaleString()}`,
},
  {
    label: 'Seller Leads',
    value: sellerLeadCount,
  },
  {
    label: 'AI Relist Queue',
    value: queueCount,
  },
  {
    label: 'Active Deals',
    value: activeDealCount,
  },
  {
    label: 'Buyer Conversations',
    value: conversationCount,
  },
  {
    label: 'Closed Deals',
    value: closedDealCount,
  },
]

  const [inventory, setInventory] = useState<any[]>([])
  const [phaseOneCounts, setPhaseOneCounts] = useState({
  newLeads: 0,
  approvedForOutreach: 0,
  contacted: 0,
  sellerResponded: 0,
  sellerApproved: 0,
})

async function loadPhaseOneCounts() {
  const { data, error } = await supabase
    .from("seller_leads")
    .select("status, outreach_status")

  if (error) {
    console.error("Phase 1 counts error:", error)
    return
  }

  setPhaseOneCounts({
    newLeads: data?.filter((lead) => lead.status === "new").length || 0,
    approvedForOutreach:
      data?.filter((lead) => lead.status === "approved_for_outreach").length || 0,
    contacted:
      data?.filter((lead) => lead.outreach_status === "contacted").length || 0,
    sellerResponded:
      data?.filter((lead) => lead.outreach_status === "seller_responded").length || 0,
    sellerApproved:
      data?.filter((lead) => lead.status === "seller_approved").length || 0,
  })
}

  useEffect(() => {
  loadInventory()
  loadPhaseOneCounts()

  const channel = supabase
    .channel('inventory-dashboard-updates')
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

    const phaseOneTimer = setInterval(() => {
    loadPhaseOneCounts()
  }, 5000)

  return () => {
    clearInterval(phaseOneTimer)
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

  const totalProfit = inventory.reduce(
    (acc, item) => acc + Number(item.price || 0),
    0
  )

  const avgAIScore =
    inventory.length > 0
      ? Math.floor(
          inventory.reduce(
            (acc, item) => acc + Number(item.ai_score || 0),
            0
          ) / inventory.length
        )
      : 0
      const acquisitionLeads = [
  {
    seller: 'Estate Liquidation Seller',
    value: '$18,400 Potential',
    score: 96,
    status: 'High Priority',
  },
  {
    seller: 'Luxury Furniture Distributor',
    value: '$42,000 Potential',
    score: 93,
    status: 'AI Outreach Ready',
  },
  {
    seller: 'Jewelry Inventory Holder',
    value: '$27,800 Potential',
    score: 95,
    status: 'Negotiation Opportunity',
  },
]

 const scannerDeals = [
  {
    title: 'Luxury Watch Collection',
    marketplace: 'Facebook Marketplace',
    aiScore: 97,
    spread: '$4,800',
    status: 'Institutional Buyer Demand',
  },
  {
    title: 'Designer Furniture Portfolio',
    marketplace: 'OfferUp',
    aiScore: 94,
    spread: '$3,200',
    status: 'High Conversion Velocity',
  },
  {
    title: 'Rare Sneaker Inventory',
    marketplace: 'Craigslist',
    aiScore: 96,
    spread: '$6,100',
    status: 'Premium Arbitrage Detected',
  },
  {
    title: 'Luxury Jewelry Bundle',
    marketplace: 'Facebook Marketplace',
    aiScore: 91,
    spread: '$2,700',
    status: 'Urgent Seller Liquidation',
  },
]

 return (
  <div className="space-y-6">
<div className="rounded-2xl border border-cyan-900 bg-zinc-950 p-6">
  <h2 className="text-2xl font-bold mb-4">Phase 1 Pipeline Summary</h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-zinc-400">New Leads</p>
      <p className="text-2xl font-bold">{phaseOneCounts.newLeads}</p>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-zinc-400">Approved for Outreach</p>
      <p className="text-2xl font-bold">{phaseOneCounts.approvedForOutreach}</p>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-zinc-400">Contacted</p>
      <p className="text-2xl font-bold">{phaseOneCounts.contacted}</p>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-zinc-400">Seller Responded</p>
      <p className="text-2xl font-bold">{phaseOneCounts.sellerResponded}</p>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-zinc-400">Seller Approved</p>
      <p className="text-2xl font-bold">{phaseOneCounts.sellerApproved}</p>
    </div>
  </div>
</div>

    <AcquisitionRunPanel />

    <OutreachTaskQueue />

    <OutreachReadyQueue />

    <ContactedSellerQueue />

    <SellerResponseQueue />

    <SellerApprovedQueue />

    <ListingPrepQueue />

    <SellerLeadQueue />

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Operations Dashboard
          </h1>

          <p className="text-zinc-400 mt-3 text-base sm:text-lg">
            Autonomous brokerage command center
          </p>

        </div>

        <div className="bg-green-500/10 border border-green-500 px-5 py-3 rounded-2xl">

          <p className="text-green-400 font-semibold">
            AI Systems Online
          </p>

        </div>

      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
  {dashboardStats.map((stat) => (
    <div
      key={stat.label}
      className="rounded-2xl border border-zinc-800 bg-black p-5"
    >
      <p className="text-xs text-zinc-500">{stat.label}</p>
      <p className="mt-2 text-3xl font-bold text-white">
  {stat.value}
</p>
    </div>
  ))}
</div>

<GoLiveChecklist
  sellerLeadCount={sellerLeadCount}
  queueCount={queueCount}
  activeDealCount={activeDealCount}
  conversationCount={conversationCount}
  closedDealCount={closedDealCount}
/>
<div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

  <div className="bg-black border border-zinc-800 rounded-2xl p-4">

    <p className="text-zinc-500 text-sm mb-2">
      Marketplace Scanner
    </p>

    <p className="text-green-400 font-semibold">
      Active
    </p>

  </div>

  <div className="bg-black border border-zinc-800 rounded-2xl p-4">

    <p className="text-zinc-500 text-sm mb-2">
      AI Negotiation Engine
    </p>

    <p className="text-cyan-400 font-semibold">
      Running
    </p>

  </div>

  <div className="bg-black border border-zinc-800 rounded-2xl p-4">

    <p className="text-zinc-500 text-sm mb-2">
      Buyer CRM Automation
    </p>

    <p className="text-purple-400 font-semibold">
      Online
    </p>

  </div>

  <div className="bg-black border border-zinc-800 rounded-2xl p-4">

    <p className="text-zinc-500 text-sm mb-2">
      Autonomous Closers
    </p>

    <p className="text-orange-400 font-semibold">
      Monitoring
    </p>

  </div>

</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metric-card">

          <p className="text-zinc-500 mb-3">
            Daily Profit
          </p>

          <h3 className="text-4xl font-bold text-green-400">
            ${totalProfit.toLocaleString()}
          </h3>

        </div>

        <div className="metric-card">

          <p className="text-zinc-500 mb-3">
            AI Close Rate
          </p>

          <h3 className="text-4xl font-bold text-cyan-400">
            87%
          </h3>

        </div>

        <div className="metric-card">

          <p className="text-zinc-500 mb-3">
            Active Negotiations
          </p>

          <h3 className="text-4xl font-bold text-purple-400">
            {inventory.length}
          </h3>

        </div>

        <div className="metric-card">
          <p className="text-zinc-500 mb-3">
            Buyer Demand Index
          </p>

          <h3 className="text-4xl font-bold text-orange-400">
            {avgAIScore}
          </h3>

        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h3 className="text-2xl font-semibold">
                Top AI Opportunities
              </h3>

              <p className="text-zinc-400 mt-2">
                Highest-ranked brokerage opportunities
              </p>

            </div>

            <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl text-green-400 text-sm font-semibold">
              AI Ranked
            </div>

          </div>

          <div className="space-y-4">

            {scannerDeals.map((deal, index) => (

              <div
                key={index}
                className="bg-black border border-zinc-800 rounded-2xl p-5"
              >

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                  <div>

                    <h4 className="text-lg font-semibold">
                      {deal.title}
                    </h4>

                    <p className="text-zinc-400 text-sm mt-1">
                      {deal.marketplace}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-green-400 font-bold text-2xl">
                      {deal.aiScore}
                    </p>

                    <p className="text-zinc-500 text-xs">
                      AI Score
                    </p>

                  </div>

                </div>

                <div className="flex items-center justify-between mt-5">

                  <p className="text-zinc-400 text-sm">
                    {deal.status}
                  </p>

                  <p className="text-cyan-400 font-semibold">
                    Spread {deal.spread}
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">

  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">

    <p className="text-zinc-500 mb-2">
      Revenue Velocity
    </p>

    <h3 className="text-2xl font-bold text-green-400">
      ${liveRevenue.toLocaleString()}
    </h3>

  </div>

  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">

    <p className="text-zinc-500 mb-2">
      Active Negotiations
    </p>

    <h3 className="text-2xl font-bold text-cyan-400">
      {activeNegotiations}
    </h3>

  </div>

  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">

    <p className="text-zinc-500 mb-2">
      Autonomous AI Closers
    </p>

    <h3 className="text-2xl font-bold text-purple-400">
      {aiClosers}
    </h3>

  </div>

  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">

    <p className="text-zinc-500 mb-2">
      Buyer Demand Index
    </p>

    <h3 className="text-2xl font-bold text-orange-400">
      {buyerDemand}%
    </h3>

  </div>

</div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <h3 className="text-2xl font-semibold mb-6">
              AI Intelligence
            </h3>

            <div className="space-y-4">

              <div className="bg-black border border-zinc-800 rounded-2xl p-4">

                <p className="text-zinc-500 text-sm mb-2">
                  Buyer Demand Velocity
                </p>

                <h4 className="text-3xl font-bold text-cyan-400">
                  +42%
                </h4>

              </div>

              <div className="bg-black border border-zinc-800 rounded-2xl p-4">

                <p className="text-zinc-500 text-sm mb-2">
                  Negotiation Success
                </p>

                <h4 className="text-3xl font-bold text-purple-400">
                  91%
                </h4>

              </div>

              <div className="bg-black border border-zinc-800 rounded-2xl p-4">

                <p className="text-zinc-500 text-sm mb-2">
                  AI Lead Conversion
                </p>

                <h4 className="text-3xl font-bold text-orange-400">
                  78%
                </h4>

              </div>

            </div>

          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <h3 className="text-2xl font-semibold mb-6">
              Executive Command Center
            </h3>

            <div className="space-y-4">

              <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">

                <div>

                  <p className="text-zinc-500 text-sm mb-1">
                    AI Agents Running
                  </p>

                  <h4 className="text-2xl font-bold">
                    12
                  </h4>

                </div>

                <div className="h-3 w-3 bg-green-400 rounded-full" />

              </div>

              <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">

                <div>

                  <p className="text-zinc-500 text-sm mb-1">
                    Marketplace Sync
                  </p>

                  <h4 className="text-2xl font-bold">
                    Active
                  </h4>

                </div>

                <div className="h-3 w-3 bg-cyan-400 rounded-full" />

              </div>

              <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">

                <div>

                  <p className="text-zinc-500 text-sm mb-1">
                    Buyer Match Engine
                  </p>

                  <h4 className="text-2xl font-bold">
                    Optimized
                  </h4>

                </div>

                <div className="h-3 w-3 bg-purple-400 rounded-full" />

              </div>

            </div>

          </div>

        </div>

      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

        <div className="flex items-center justify-between mb-6">

            <h3 className="text-2xl font-semibold">
              AI Deal Scanner
            </h3>

            <p className="text-zinc-400 mt-2">
              Live marketplace arbitrage intelligence
            </p>

          </div>

          <div className="bg-red-500/10 border border-red-500 px-4 py-2 rounded-2xl text-red-400 text-sm font-semibold">
            Live Scanning
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {scannerDeals.map((deal, index) => (

            <div
              key={index}
              className="bg-black border border-zinc-800 rounded-2xl p-5"
            >

              <div className="flex items-center justify-between mb-4">

                <h4 className="font-semibold text-lg">
                  {deal.title}
                </h4>

                <p className="text-green-400 font-bold">
                  {deal.aiScore}
                </p>

              </div>

              <p className="text-zinc-400 text-sm mb-4">
                {deal.marketplace}
              </p>

              <div className="flex items-center justify-between">

                <p className="text-cyan-400 font-semibold">
                  {deal.spread}
                </p>

                <p className="text-zinc-500 text-sm">
                  {deal.status}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

  )
}