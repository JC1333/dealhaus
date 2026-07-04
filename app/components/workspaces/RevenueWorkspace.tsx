'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RevenueQueue from './RevenueQueue'
import ExceptionQueue from './ExceptionQueue'

export default function RevenueWorkspace() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    setLoading(true)

    const { data, error } = await supabase
      .from('brokerage_transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Brokerage transactions load error:', error.message)
      setTransactions([])
      setLoading(false)
      return
    }

    setTransactions(data || [])
    setLoading(false)
  }

  async function updateTransaction(id: string, updates: Record<string, any>, errorLabel: string) {
    const { error } = await supabase
      .from('brokerage_transactions')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error(`${errorLabel}:`, error.message)
      return
    }

    await loadTransactions()
  }

  const openTransactions = transactions.filter(
    (item) => item.transaction_status !== 'closed'
  )

  const paidTransactions = transactions.filter(
    (item) => item.payment_status === 'paid'
  )

  const unpaidTransactions = transactions.filter(
    (item) => item.payment_status !== 'paid'
  )

  const commissionCollected = paidTransactions.reduce(
    (acc, item) => acc + Number(item.commission_amount || 0),
    0
  )

  const outstandingCommission = unpaidTransactions.reduce(
    (acc, item) => acc + Number(item.commission_amount || 0),
    0
  )

  const pipelineValue = transactions.reduce(
    (acc, item) => acc + Number(item.sale_price || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="card-standard">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Brokerage Center
            </h2>

            <p className="text-zinc-400 mt-2">
              Track DealHaus brokerage transactions, commission status, seller payouts, and closing progress.
            </p>
          </div>

          <button
            onClick={loadTransactions}
            className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl text-green-400 font-semibold"
          >
            {loading ? 'Refreshing...' : 'Refresh Brokerage'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Commission Collected"
            value={`$${commissionCollected.toLocaleString()}`}
            color="text-green-400"
          />

          <StatCard
            label="Outstanding Commission"
            value={`$${outstandingCommission.toLocaleString()}`}
            color="text-yellow-400"
          />

          <StatCard
            label="Open Brokerage Deals"
            value={openTransactions.length}
            color="text-cyan-400"
          />

          <StatCard
            label="Brokerage Pipeline Value"
            value={`$${pipelineValue.toLocaleString()}`}
            color="text-purple-400"
          />
        </div>
      </div>

      <div className="card-standard">
        <h3 className="text-2xl font-bold mb-6">
          Active Brokerage Transactions
        </h3>

        {transactions.length === 0 ? (
          <p className="text-zinc-400">
            No brokerage transactions yet.
          </p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-black border border-zinc-800 rounded-2xl p-5"
              >
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                  <div>
                    <p className="text-cyan-400 text-sm font-bold uppercase">
                      {transaction.transaction_status || 'open'} brokerage transaction
                    </p>

                    <h4 className="text-xl font-bold text-white mt-1">
                      {transaction.item_title || 'Untitled Deal'}
                    </h4>

                    <p className="text-zinc-400 mt-2">
                      Seller: {transaction.seller_name || 'Unknown Seller'}
                    </p>

                    <p className="text-zinc-500 text-sm mt-1">
                      Buyer: {transaction.buyer_name || 'Buyer pending'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
                    <MiniStat
                      label="Sale Price"
                      value={`$${Number(transaction.sale_price || 0).toLocaleString()}`}
                    />

                    <MiniStat
                      label="Commission"
                      value={`$${Number(transaction.commission_amount || 0).toLocaleString()}`}
                    />

                    <MiniStat
                      label="Payment"
                      value={transaction.payment_status || 'unpaid'}
                    />

                    <MiniStat
                      label="Invoice"
                      value={transaction.invoice_status || 'not_sent'}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <ActionCard
                    label="Meetup"
                    value={transaction.meetup_status || 'pending'}
                  >
                    {transaction.meetup_status !== 'completed' && (
                      <button
                        onClick={() =>
                          updateTransaction(
                            transaction.id,
                            {
                              meetup_status: 'completed',
                              completed_at: new Date().toISOString(),
                            },
                            'Meetup update error'
                          )
                        }
                        className="w-full rounded-lg bg-purple-500 px-3 py-2 text-sm font-bold text-white hover:bg-purple-400"
                      >
                        Mark Meetup Complete
                      </button>
                    )}
                  </ActionCard>

                  <ActionCard
                    label="Buyer Confirmed"
                    value={transaction.buyer_confirmed ? 'yes' : 'no'}
                  >
                    {!transaction.buyer_confirmed && (
                      <button
                        onClick={() =>
                          updateTransaction(
                            transaction.id,
                            { buyer_confirmed: true },
                            'Buyer confirm error'
                          )
                        }
                        className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-bold text-black hover:bg-cyan-400"
                      >
                        Mark Buyer Confirmed
                      </button>
                    )}
                  </ActionCard>

                  <ActionCard
                    label="Seller Confirmed"
                    value={transaction.seller_confirmed ? 'yes' : 'no'}
                  >
                    {!transaction.seller_confirmed && (
                      <button
                        onClick={() =>
                          updateTransaction(
                            transaction.id,
                            { seller_confirmed: true },
                            'Seller confirm error'
                          )
                        }
                        className="w-full rounded-lg bg-green-500 px-3 py-2 text-sm font-bold text-black hover:bg-green-400"
                      >
                        Mark Seller Confirmed
                      </button>
                    )}
                  </ActionCard>

                  <ActionCard
                    label="Payment"
                    value={transaction.payment_status || 'unpaid'}
                  >
                    {transaction.payment_status !== 'paid' && (
                      <button
                        onClick={() =>
                          updateTransaction(
                            transaction.id,
                            {
                              payment_status: 'paid',
                              payment_method: 'manual',
                              invoice_status: 'paid',
                            },
                            'Payment update error'
                          )
                        }
                        className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-400"
                      >
                        Mark Commission Paid
                      </button>
                    )}
                  </ActionCard>

                  <div className="col-span-1 md:col-span-4 mt-4">
                    {transaction.transaction_status !== 'closed' && (
                      <button
                        onClick={() =>
                          updateTransaction(
                            transaction.id,
                            {
                              transaction_status: 'closed',
                              completed_at: new Date().toISOString(),
                            },
                            'Close transaction error'
                          )
                        }
                        className="w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500"
                      >
                        Close Brokerage Transaction
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RevenueQueue />

      <ExceptionQueue />
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-black border border-zinc-800 rounded-2xl p-5">
      <p className="text-zinc-500 mb-2">{label}</p>
      <h3 className={`text-4xl font-bold ${color}`}>
        {value}
      </h3>
    </div>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-white mt-1">{value}</p>
    </div>
  )
}

function ActionCard({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-3">
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-sm font-bold text-cyan-400 mt-1">{value}</p>
      </div>

      {children}
    </div>
  )
}