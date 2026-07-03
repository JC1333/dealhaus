'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type AiRelistTask = {
  id: string
  listing_prep_task_id?: string
  seller_lead_id?: string
  item_title?: string
  seller_name?: string
  asking_price?: number
  estimated_profit?: number
  relist_status?: string
  ai_title?: string
  ai_description?: string
  ai_price_recommendation?: number 
  inventory_item_id?: string
  created_at?: string
}

export default function AiRelistQueue() {
  const [tasks, setTasks] = useState<AiRelistTask[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadTasks() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('ai_relist_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [])

  async function generateAiRelist(task: AiRelistTask) {
    setMessage('Generating AI relist...')

    const res = await fetch('/api/generate-ai-relist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    })

    const result = await res.json()

    if (!res.ok) {
      setMessage(result.error || 'AI relist generation failed.')
      return
    }

    setMessage('AI relist generated and inventory item created.')
    await loadTasks()
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">
            AI Relist Queue
          </h2>

          <p className="text-zinc-400 mt-2">
            Approved seller items waiting for AI-generated buyer-facing listings.
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="rounded-xl border border-zinc-700 px-4 py-3 font-bold text-white hover:border-cyan-400"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <p className="mb-5 rounded-xl border border-zinc-800 bg-black p-3 text-sm text-cyan-400">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading AI relist tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-zinc-400">
          No seller submissions ready for relisting yet.
        </p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-zinc-800 bg-black p-6"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-cyan-400 font-semibold">
                    AI Relist Task • {task.relist_status || 'pending'}
                  </p>

                  <h3 className="text-2xl font-bold text-white mt-1">
                    {task.item_title || 'Untitled Item'}
                  </h3>

                  <p className="text-zinc-500 text-sm mt-3">
                    Seller: {task.seller_name || 'Unknown'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-zinc-500 text-sm">Seller Ask</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${Number(task.asking_price || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {task.ai_title && (
                <div className="mt-6 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-5">
                  <p className="text-cyan-400 font-bold mb-2">
                    AI Buyer-Facing Listing
                  </p>

                  <h4 className="text-xl font-bold text-white">
                    {task.ai_title}
                  </h4>

                  <p className="text-zinc-300 mt-2">
                    {task.ai_description}
                  </p>

                  <p className="text-green-400 font-bold mt-3">
                    Relist Price: ${Number(task.ai_price_recommendation || 0).toLocaleString()}
                  </p>
                </div>
              )}

              <button
                onClick={() => generateAiRelist(task)}
                disabled={!!task.inventory_item_id}
                className={`mt-5 w-full rounded-xl px-4 py-3 font-semibold text-black transition ${
                  task.inventory_item_id
                    ? 'bg-zinc-600 cursor-not-allowed'
                    : 'bg-cyan-400 hover:bg-cyan-300'
                }`}
              >
                {task.inventory_item_id
                  ? 'Already Added to Inventory'
                  : 'Generate AI Relist Listing'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}