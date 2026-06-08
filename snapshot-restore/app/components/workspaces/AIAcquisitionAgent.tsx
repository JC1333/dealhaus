'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type SellerLead = {
  id: string;
  created_at: string;
  seller_name: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  seller_city: string | null;
  seller_state: string | null;
  item_title: string;
  item_description: string | null;
  asking_price: number | null;
  estimated_resale_price: number | null;
  estimated_commission: number | null;
  lead_source: string | null;
  lead_status: string | null;
  acquisition_message: string | null;
  ai_score: number | null;
};

const sampleLeads = [
  {
    seller_name: 'Sarah Miller',
    seller_email: 'sarah.demo@example.com',
    seller_phone: '555-219-8841',
    seller_city: 'San Diego',
    seller_state: 'CA',
    item_title: 'Restoration Hardware Cloud Sofa',
    item_description:
      'High-demand RH Cloud style sofa. Strong resale potential for upscale buyers looking for luxury furniture.',
    asking_price: 1450,
    estimated_resale_price: 2400,
    estimated_commission: 240,
    ai_score: 94,
  },
  {
    seller_name: 'Michael Carter',
    seller_email: 'michael.demo@example.com',
    seller_phone: '555-612-4419',
    seller_city: 'Temecula',
    seller_state: 'CA',
    item_title: 'Outdoor Patio Sectional Set',
    item_description:
      'Clean patio sectional with cushions. Great seasonal resale item with strong buyer interest.',
    asking_price: 650,
    estimated_resale_price: 1150,
    estimated_commission: 115,
    ai_score: 88,
  },
  {
    seller_name: 'Ashley Johnson',
    seller_email: 'ashley.demo@example.com',
    seller_phone: '555-784-2031',
    seller_city: 'Murrieta',
    seller_state: 'CA',
    item_title: 'West Elm Dining Table',
    item_description:
      'Modern wood dining table. Popular style, good margin, easy to relist professionally.',
    asking_price: 475,
    estimated_resale_price: 950,
    estimated_commission: 95,
    ai_score: 82,
  },
];

export default function AIAcquisitionAgent() {
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadLeads() {
    const { data, error } = await supabase
      .from('seller_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Seller leads load error:', error);
      return;
    }

    setLeads(data || []);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  async function runAcquisitionAgent() {
    setLoading(true);

    const lead = sampleLeads[Math.floor(Math.random() * sampleLeads.length)];

    const acquisition_message = `Hi ${lead.seller_name}, I help sellers get more exposure for quality furniture without the hassle of managing buyers. Your ${lead.item_title} looks like a strong fit for our buyer network. We can professionally relist it, handle buyer interest, and only take a commission if it sells.`;

    const { error } = await supabase.from('seller_leads').insert({
      ...lead,
      acquisition_message,
      lead_status: 'new',
      lead_source: 'AI Acquisition Agent',
    });

    if (error) {
      console.error('Create seller lead error:', error);
      alert('Error creating seller lead. Check console.');
      setLoading(false);
      return;
    }

    await loadLeads();
    setLoading(false);
  }

  async function sendToRelistQueue(lead: SellerLead) {
    const { error: inventoryError } = await supabase.from('seller_onboarding').insert({
      title: lead.item_title,
      description: lead.item_description,
      price: lead.estimated_resale_price || lead.asking_price || 0,
      status: 'relist_queue',
      seller_name: lead.seller_name,
      seller_email: lead.seller_email,
      seller_city: lead.seller_city,
      seller_state: lead.seller_state,
      asking_price: lead.asking_price,
      ai_score: lead.ai_score,
      close_probability: lead.ai_score,
      demand_level:
        (lead.ai_score || 0) >= 90
          ? 'High'
          : (lead.ai_score || 0) >= 80
          ? 'Medium'
          : 'Low',
      category: 'Furniture',
    });

    if (inventoryError) {
      console.error('Send to relist queue error:', inventoryError);
      alert('Error sending lead to AI Relist Queue.');
      return;
    }

    await supabase
      .from('seller_leads')
      .update({ lead_status: 'sent_to_relist_queue' })
      .eq('id', lead.id);

    alert('Seller lead sent to AI Relist Queue.');
    await loadLeads();
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 mb-6">
      <div className="flex flex-col gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            AI Acquisition Agent
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Finds seller leads, creates outreach messages, and feeds qualified items into the AI Relist Queue.
          </p>
        </div>

        <button
          onClick={runAcquisitionAgent}
          disabled={loading}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? 'Finding Leads...' : 'Run Agent'}
        </button>
      </div>
{leads.length > 0 && (
  <button
    onClick={() => sendToRelistQueue(leads[0])}
    className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400 mb-4"
  >
    Send Latest Lead to AI Relist Queue
  </button>
)}
      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
          No seller leads yet. Click Run Agent to create the first acquisition lead.
        </div>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-zinc-800 bg-black p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">
                    {lead.item_title}
                  </h3>

                  <p className="text-sm text-zinc-400 mt-1">
                    Seller: {lead.seller_name || 'Unknown'} ·{' '}
                    {lead.seller_city || 'Unknown City'}
                    {lead.seller_state ? `, ${lead.seller_state}` : ''}
                  </p>

                  <p className="text-sm text-zinc-300 mt-3">
                    {lead.item_description}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-zinc-400">AI Score</div>
                  <div className="text-2xl font-bold text-white">
                    {lead.ai_score || 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="rounded-lg bg-zinc-900 p-3">
                  <div className="text-xs text-zinc-500">Seller Ask</div>
                  <div className="text-white font-semibold">
                    ${lead.asking_price || 0}
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-900 p-3">
                  <div className="text-xs text-zinc-500">Relist Price</div>
                  <div className="text-white font-semibold">
                    ${lead.estimated_resale_price || 0}
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-900 p-3">
                  <div className="text-xs text-zinc-500">Est. Commission</div>
                  <div className="text-white font-semibold">
                    ${lead.estimated_commission || 0}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-zinc-900 p-3">
                <div className="text-xs text-zinc-500 mb-1">
                  AI Outreach Message
                </div>
                <p className="text-sm text-zinc-300">
                  {lead.acquisition_message}
                </p>
              </div>
<div className="grid gap-3 mt-4">
  <span className="rounded-full bg-zinc-800 px-3 py-2 text-xs text-zinc-300 text-center">
    {lead.lead_status || 'new'}
  </span>

  <button
  onClick={() => sendToRelistQueue(lead)}
  style={{
    width: '100%',
    background: 'limegreen',
    color: 'black',
    padding: '16px',
    borderRadius: '12px',
    fontWeight: 'bold',
    marginTop: '12px',
    display: 'block',
  }}
>
  SEND TO AI RELIST QUEUE
</button>
</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}