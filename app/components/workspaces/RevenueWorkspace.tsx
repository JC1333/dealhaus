'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RevenueWorkspace() {
  const [inventory, setInventory] = useState<any[]>([])

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('id', { ascending: false })

    setInventory(data || [])
  }

  const closedDeals = inventory.filter((item) => item.status === 'closed')

  const activeDeals = inventory.filter((item) => item.status !== 'closed')

  const commissionCollected = closedDeals.reduce(
    (acc, item) => acc + Number(item.projected_commission || 0),
    0
  )

  const projectedCommission = activeDeals.reduce(
    (acc, item) => acc + Number(item.projected_commission || 0),
    0
  )

  const totalPipelineValue = inventory.reduce(
    (acc, item) => acc + Number(item.price || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="card-standard">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Revenue Command Center
            </h2>

            <p className="text-zinc-400 mt-2">
              Tracks closed commissions and active deal revenue potential.
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl">
            <p className="text-green-400 font-semibold">
              Commission Tracking Active
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-black border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 mb-2">Commission Collected</p>
            <h3 className="text-4xl font-bold text-green-400">
              ${commissionCollected.toLocaleString()}
            </h3>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 mb-2">Projected Commission</p>
            <h3 className="text-4xl font-bold text-cyan-400">
              ${projectedCommission.toLocaleString()}
            </h3>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 mb-2">Closed Deals</p>
            <h3 className="text-4xl font-bold text-white">
              {closedDeals.length}
            </h3>
          </div>

          <div className="bg-black border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 mb-2">Pipeline Value</p>
            <h3 className="text-4xl font-bold text-purple-400">
              ${totalPipelineValue.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      <div className="card-standard">
        <h3 className="text-2xl font-bold mb-6">
          Closed Commission Deals
        </h3>

        {closedDeals.length === 0 ? (
          <p className="text-zinc-400">
            No closed commission deals yet.
          </p>
        ) : (
          <div className="space-y-4">
            {closedDeals.map((deal) => (
              <div
                key={deal.id}
                className="bg-black border border-zinc-800 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-bold text-white">
                      {deal.title}
                    </h4>

                    <p className="text-zinc-400 mt-1">
                      Closed: {deal.closed_at ? new Date(deal.closed_at).toLocaleString() : 'Recently'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-zinc-500 text-sm">Commission</p>
                    <p className="text-3xl font-bold text-green-400">
                      ${Number(deal.projected_commission || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}