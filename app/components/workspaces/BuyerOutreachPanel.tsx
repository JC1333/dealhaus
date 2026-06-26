'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type BuyerOutreachPanelProps = {
  deal: any;
  onUpdated?: () => void;
};

export default function BuyerOutreachPanel({
  deal,
  onUpdated,
}: BuyerOutreachPanelProps) {
  const [notes, setNotes] = useState(deal.buyer_followup_notes || '');
  const [scheduledTime, setScheduledTime] = useState(
    deal.buyer_scheduled_time || ''
  );

  const buyerMessage =
    deal.buyer_outreach_message ||
   `Hi, I saw you're interested in this item. We have ${
  deal.title || 'this item'
    } available now. It is listed at $${deal.price || 0}. Let me know if you would like more details or want to schedule a pickup.`;

  async function updateBuyerStatus(status: string) {
    const { error } = await supabase
      .from('inventory')
      .update({
        buyer_outreach_status: status,
      })
      .eq('id', deal.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (onUpdated) {
      onUpdated();
    }
  }

  async function saveBuyerNotes() {
    const { error } = await supabase
      .from('inventory')
      .update({
        buyer_followup_notes: notes,
        buyer_scheduled_time: scheduledTime,
      })
      .eq('id', deal.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (onUpdated) {
      onUpdated();
    }
  }

  async function markReadyToClose() {
    const { error } = await supabase
      .from('inventory')
      .update({
        ready_to_close: true,
        buyer_outreach_status: 'ready_to_close',
      })
      .eq('id', deal.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (onUpdated) {
      onUpdated();
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4">
        <h4 className="font-bold text-white">Buyer Outreach</h4>
        <p className="text-sm text-zinc-400">
          Copy buyer message, track follow-up, schedule pickup, and mark ready to close.
        </p>
      </div>

      <div className="rounded-xl bg-black border border-zinc-800 p-3">
        <p className="text-xs text-zinc-500 mb-1">Buyer Message</p>
        <p className="text-sm text-zinc-300">{buyerMessage}</p>
      </div>

      <button
        onClick={() => {
          navigator.clipboard.writeText(buyerMessage);
          alert('Buyer message copied.');
        }}
        className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-black hover:bg-cyan-300"
      >
        Copy Buyer Message
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <button
          onClick={() => updateBuyerStatus('buyer_contacted')}
          className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black hover:bg-yellow-300"
        >
          Mark Buyer Contacted
        </button>

        <button
          onClick={() => updateBuyerStatus('buyer_responded')}
          className="rounded-xl bg-purple-400 px-4 py-3 text-sm font-bold text-black hover:bg-purple-300"
        >
          Mark Buyer Responded
        </button>

        <button
          onClick={markReadyToClose}
          className="rounded-xl bg-green-400 px-4 py-3 text-sm font-bold text-black hover:bg-green-300"
        >
          Mark Ready To Close
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          placeholder="Scheduled pickup / meeting time"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <button
          onClick={saveBuyerNotes}
          className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-zinc-200"
        >
          Save Buyer Follow-Up
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Buyer follow-up notes..."
        className="mt-3 min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <div className="mt-3 rounded-xl border border-zinc-800 bg-black p-3">
        <p className="text-xs text-zinc-500">Buyer Status</p>
        <p className="font-bold text-white">
          {deal.buyer_outreach_status || 'not_contacted'}
        </p>
      </div>
    </div>
  );
}