'use client'

import { useEffect, useState } from 'react'
import AiRelistQueue from '../seller/AiRelistQueue'
import AIAcquisitionAgent from './AIAcquisitionAgent'
import MarketplaceImportEngine from './MarketplaceImportEngine'
import AcquisitionRunPanel from '../AcquisitionRunPanel'
import SellerLeadQueue from '../SellerLeadQueue'
import OutreachReadyQueue from '../OutreachReadyQueue'
import OutreachTaskQueue from '../OutreachTaskQueue'
import ContactedSellerQueue from '../ContactedSellerQueue'
import SellerResponseQueue from '../SellerResponseQueue'
import SellerApprovedQueue from '../SellerApprovedQueue'
import ListingPrepQueue from '../ListingPrepQueue'

type IngestionWorkspaceProps = {
  sellerSubmissions: any[]
  onGenerateListing: (submission: any) => void
  onRefreshSubmissions: () => void
}

export default function IngestionWorkspace({
  sellerSubmissions,
  onGenerateListing,
  onRefreshSubmissions,
}: IngestionWorkspaceProps) {
  const [importedDeals, setImportedDeals] = useState<any[]>([])
  const [activeIngestionTab, setActiveIngestionTab] = useState('imports')
  const [activeSellerTab, setActiveSellerTab] = useState('acquisition')

  useEffect(() => {
    const loadDeals = async () => {
      const response = await fetch('/api/import-deals')
      const data = await response.json()
      setImportedDeals(data)
    }

    loadDeals()
  }, [])

  const sources = [
    {
      name: 'Facebook Marketplace',
      status: 'Connected',
      deals: 182,
      color: 'text-cyan-400',
    },
    {
      name: 'Craigslist',
      status: 'Monitoring',
      deals: 94,
      color: 'text-green-400',
    },
    {
      name: 'OfferUp',
      status: 'Scanning',
      deals: 67,
      color: 'text-purple-400',
    },
    {
      name: 'Estate Auctions',
      status: 'AI Tracking',
      deals: 41,
      color: 'text-orange-400',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Marketplace Ingestion
          </h1>

          <p className="text-zinc-400 mt-3 text-lg">
            Autonomous acquisition source monitoring
          </p>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500 px-5 py-3 rounded-2xl">
          <p className="text-cyan-400 font-semibold">
            AI Scanner Online
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveIngestionTab('imports')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeIngestionTab === 'imports'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          Marketplace Imports
        </button>

        <button
          onClick={() => setActiveIngestionTab('pipeline')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeIngestionTab === 'pipeline'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          Seller Pipeline
        </button>

        <button
          onClick={() => setActiveIngestionTab('relist')}
          className={`px-5 py-2 rounded-xl font-semibold ${
            activeIngestionTab === 'relist'
              ? 'bg-white text-black'
              : 'bg-zinc-900 border border-zinc-700 text-white'
          }`}
        >
          AI Relist Queue
        </button>
      </div>

      {activeIngestionTab === 'imports' && (
        <div className="space-y-8">
          <MarketplaceImportEngine />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {sources.map((source, index) => (
              <div key={index} className="metric-card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">
                    {source.name}
                  </h3>

                  <div
                    className={`h-3 w-3 rounded-full bg-current ${source.color}`}
                  />
                </div>

                <p className={`text-lg font-semibold ${source.color}`}>
                  {source.status}
                </p>

                <p className="text-zinc-500 mt-4">
                  {source.deals} active opportunities
                </p>
              </div>
            ))}
          </div>

          <div className="card-standard">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">
                  Imported Opportunities
                </h3>

                <p className="text-zinc-400 mt-2">
                  Live acquisition pipeline feed
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl">
                <p className="text-green-400 font-semibold">
                  AI Import Active
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {importedDeals.slice(0, 5).map((deal, index) => (
                <div
                  key={index}
                  className="bg-black border border-zinc-800 rounded-2xl p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-semibold">
                        {deal.title}
                      </h4>

                      <p className="text-zinc-400 mt-1">
                        {deal.source}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-cyan-400 text-2xl font-bold">
                        {deal.aiScore}
                      </p>

                      <p className="text-zinc-500 text-xs">
                        AI Score
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5">
                    <div>
                      <p className="text-green-400 font-bold text-lg">
                        {deal.spread}
                      </p>

                      <p className="text-zinc-500 text-sm">
                        Arbitrage Spread
                      </p>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500 px-4 py-2 rounded-xl">
                      <p className="text-purple-400 text-sm">
                        {deal.demand}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 bg-cyan-500/10 border border-cyan-500 px-4 py-3 rounded-xl">
                    <p className="text-cyan-400 text-sm font-semibold">
                      AI Qualification
                    </p>

                    <p className="text-white font-semibold mt-1">
                      {deal.qualification}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeIngestionTab === 'pipeline' && (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-3">
  <button
    onClick={() => setActiveSellerTab('acquisition')}
    className={`px-5 py-2 rounded-xl font-semibold ${
      activeSellerTab === 'acquisition'
        ? 'bg-white text-black'
        : 'bg-zinc-900 border border-zinc-700 text-white'
    }`}
  >
    Acquisition
  </button>

  <button
    onClick={() => setActiveSellerTab('outreach')}
    className={`px-5 py-2 rounded-xl font-semibold ${
      activeSellerTab === 'outreach'
        ? 'bg-white text-black'
        : 'bg-zinc-900 border border-zinc-700 text-white'
    }`}
  >
    Outreach
  </button>

  <button
    onClick={() => setActiveSellerTab('approval')}
    className={`px-5 py-2 rounded-xl font-semibold ${
      activeSellerTab === 'approval'
        ? 'bg-white text-black'
        : 'bg-zinc-900 border border-zinc-700 text-white'
    }`}
  >
    Approval
  </button>
</div>
          {activeSellerTab === "acquisition" && (
  <>
    <AIAcquisitionAgent onLeadSent={onRefreshSubmissions} />

    <AcquisitionRunPanel />

    <SellerLeadQueue />
  </>
)}

          {activeSellerTab === "outreach" && (
  <>
    <OutreachReadyQueue />

    <OutreachTaskQueue />

    <ContactedSellerQueue />
  </>
)}

         {activeSellerTab === "approval" && (
  <>
    <SellerResponseQueue />

    <SellerApprovedQueue />
  </>
)}
        </div>
      )}

      {activeIngestionTab === 'relist' && (
        <div className="space-y-8">
          <ListingPrepQueue />

          <AiRelistQueue />
        </div>
      )}
    </div>
  )
}