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
  marketplace_source: string | null;
  marketplace_listing_url: string | null;
  seller_profile_url: string | null;
  lead_priority: string | null;
  lead_status: string | null;
  approval_status: string | null;
  agreement_accepted: boolean | null;
  commission_rate: number | null;
  approval_notes: string | null;
  acquisition_message: string | null;
  acquisition_reason: string | null;
  photo_urls: string[] | null;
  outreach_notes: string | null;
  ai_score: number | null;
};

export default function AIAcquisitionAgent({
  onLeadSent,
}: {
  onLeadSent?: () => void;
}) {
  const [leads, setLeads] = useState<SellerLead[]>([]);

  const [manualLead, setManualLead] = useState({
    marketplace_source: 'Facebook Marketplace',
    marketplace_listing_url: '',
    seller_profile_url: '',
    lead_priority: 'medium',
    seller_name: '',
    seller_email: '',
    seller_phone: '',
    seller_city: '',
    seller_state: '',
    item_title: '',
    item_description: '',
    asking_price: '',
    estimated_resale_price: '',
    commission_rate: '15',
  });

  async function loadLeads() {
    const { data, error } = await supabase
      .from('seller_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      alert(error.message);
      return;
    }

    setLeads(data || []);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  async function createMarketplaceLead() {
    if (!manualLead.item_title || !manualLead.asking_price) {
      alert('Please enter at least item title and asking price.');
      return;
    }

    const askingPrice = Number(manualLead.asking_price || 0);
    const resalePrice = Number(
      manualLead.estimated_resale_price || askingPrice * 1.5
    );
    const commissionRate = Number(manualLead.commission_rate || 15);
    const commission = Math.round(resalePrice * (commissionRate / 100));

    const acquisitionMessage = `Hi ${
      manualLead.seller_name || 'there'
    }, I help sellers get more exposure for marketplace listings without the hassle of managing buyer inquiries. Your ${
      manualLead.item_title
    } looks like a strong fit for our buyer network. We can professionally relist it, handle buyer interest, and only take a commission if it sells.`;

    const { error } = await supabase.from('seller_leads').insert({
      seller_name: manualLead.seller_name || 'Marketplace Seller',
      seller_email: manualLead.seller_email || 'seller@example.com',
      seller_phone: manualLead.seller_phone || '',
      seller_city: manualLead.seller_city || '',
      seller_state: manualLead.seller_state || '',
      item_title: manualLead.item_title,
      item_description: manualLead.item_description || '',
      asking_price: askingPrice,
      estimated_resale_price: resalePrice,
      estimated_commission: commission,
      lead_source: 'Marketplace Lead',
      marketplace_source: manualLead.marketplace_source,
      marketplace_listing_url: manualLead.marketplace_listing_url,
      seller_profile_url: manualLead.seller_profile_url,
      lead_priority: manualLead.lead_priority,
      lead_status: 'new',
      approval_status: 'not_approved',
      agreement_accepted: false,
      commission_rate: commissionRate,
      approval_notes: '',
      acquisition_message: acquisitionMessage,
      outreach_notes: '',
      ai_score:
        manualLead.lead_priority === 'high'
          ? 92
          : manualLead.lead_priority === 'medium'
          ? 85
          : 72,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setManualLead({
      marketplace_source: 'Facebook Marketplace',
      marketplace_listing_url: '',
      seller_profile_url: '',
      lead_priority: 'medium',
      seller_name: '',
      seller_email: '',
      seller_phone: '',
      seller_city: '',
      seller_state: '',
      item_title: '',
      item_description: '',
      asking_price: '',
      estimated_resale_price: '',
      commission_rate: '15',
    });

    await loadLeads();
  }

  async function updateLeadStatus(id: string, status: string) {
    const { error } = await supabase
      .from('seller_leads')
      .update({ lead_status: status })
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadLeads();
  }

  async function approveSellerAgreement(lead: SellerLead) {
  const { data, error } = await supabase
    .from('seller_leads')
    .update({
      status: 'seller_approved',
      lead_status: 'approved',
      approval_status: 'approved',
      agreement_accepted: true,
      commission_rate: Number(lead.commission_rate || 10),
    })
    .eq('id', lead.id)
    .select();

  if (error) {
    alert('Approval error: ' + error.message);
    return;
  }

  alert('Seller approved. Rows updated: ' + (data?.length || 0));

  await loadLeads();
}

 async function sendToRelistQueue(lead: SellerLead) {
  if (lead.approval_status !== 'approved' || !lead.agreement_accepted) {
    alert('Seller must be approved and agreement accepted first.');
    return;
  }

  const { data: existingPrepTask, error: checkError } = await supabase
    .from('listing_prep_tasks')
    .select('id')
    .eq('seller_lead_id', lead.id)
    .limit(1);

  if (checkError) {
    alert('Prep check error: ' + checkError.message);
    return;
  }

  if (!existingPrepTask || existingPrepTask.length === 0) {
    const { error: prepError } = await supabase
      .from('listing_prep_tasks')
      .insert({
        seller_lead_id: lead.id,
        item_title: lead.item_title,
        seller_name: lead.seller_name,
        seller_city: lead.seller_city,
        seller_state: lead.seller_state,
        asking_price: Number(lead.asking_price || 0),
        prep_status: 'ready_for_relist',
      });

    if (prepError) {
      alert('Listing prep error: ' + prepError.message);
      return;
    }
  }

  const { error: updateError } = await supabase
    .from('seller_leads')
    .update({
      status: 'sent_to_relist_queue',
      lead_status: 'sent_to_relist_queue',
    })
    .eq('id', lead.id);

  if (updateError) {
    alert('Lead update error: ' + updateError.message);
    return;
  }

  await loadLeads();

  if (onLeadSent) {
    onLeadSent();
  }

  alert('Seller lead sent to AI Relist Queue.');
}

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">AI Acquisition Agent</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Source real marketplace leads, contact sellers, track approval, confirm
          commission agreement, and send approved items to the AI Relist Queue.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-zinc-800 bg-black p-4">
        <h3 className="font-bold text-white mb-3">Add Marketplace Lead</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={manualLead.marketplace_source}
            onChange={(e) =>
              setManualLead({
                ...manualLead,
                marketplace_source: e.target.value,
              })
            }
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          >
            <option>Facebook Marketplace</option>
            <option>OfferUp</option>
            <option>Craigslist</option>
            <option>Estate Sale</option>
            <option>Referral</option>
            <option>Manual Entry</option>
          </select>

          <select
            value={manualLead.lead_priority}
            onChange={(e) =>
              setManualLead({ ...manualLead, lead_priority: e.target.value })
            }
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          >
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <input
            value={manualLead.seller_name}
            onChange={(e) =>
              setManualLead({ ...manualLead, seller_name: e.target.value })
            }
            placeholder="Seller name"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.seller_email}
            onChange={(e) =>
              setManualLead({ ...manualLead, seller_email: e.target.value })
            }
            placeholder="Seller email"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.seller_phone}
            onChange={(e) =>
              setManualLead({ ...manualLead, seller_phone: e.target.value })
            }
            placeholder="Seller phone"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.item_title}
            onChange={(e) =>
              setManualLead({ ...manualLead, item_title: e.target.value })
            }
            placeholder="Item title"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.asking_price}
            onChange={(e) =>
              setManualLead({ ...manualLead, asking_price: e.target.value })
            }
            placeholder="Seller asking price"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.estimated_resale_price}
            onChange={(e) =>
              setManualLead({
                ...manualLead,
                estimated_resale_price: e.target.value,
              })
            }
            placeholder="Estimated relist price"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <div>
  <p className="mb-1 text-xs font-bold text-zinc-500">
    Commission Rate %
  </p>

  <input
    value={manualLead.commission_rate}
    onChange={(e) =>
      setManualLead({ ...manualLead, commission_rate: e.target.value })
    }
    className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
  />
</div>

          <input
            value={manualLead.seller_city}
            onChange={(e) =>
              setManualLead({ ...manualLead, seller_city: e.target.value })
            }
            placeholder="City"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.seller_state}
            onChange={(e) =>
              setManualLead({ ...manualLead, seller_state: e.target.value })
            }
            placeholder="State"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={manualLead.marketplace_listing_url}
            onChange={(e) =>
              setManualLead({
                ...manualLead,
                marketplace_listing_url: e.target.value,
              })
            }
            placeholder="Marketplace listing URL"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white sm:col-span-2"
          />

          <input
            value={manualLead.seller_profile_url}
            onChange={(e) =>
              setManualLead({
                ...manualLead,
                seller_profile_url: e.target.value,
              })
            }
            placeholder="Seller profile URL"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white sm:col-span-2"
          />
        </div>

        <textarea
          value={manualLead.item_description}
          onChange={(e) =>
            setManualLead({ ...manualLead, item_description: e.target.value })
          }
          placeholder="Item description"
          className="mt-3 min-h-24 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
        />

        <button
          onClick={createMarketplaceLead}
          className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-black hover:bg-cyan-300"
        >
          Create Marketplace Lead
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-black border border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Visible Leads</p>
          <p className="text-2xl font-bold text-white">{leads.length}</p>
        </div>

        <div className="rounded-xl bg-black border border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Working Leads</p>
          <p className="text-2xl font-bold text-cyan-400">
            {
              leads.filter(
                (lead) => lead.lead_status !== 'sent_to_relist_queue'
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl bg-black border border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Sent to Queue</p>
          <p className="text-2xl font-bold text-green-400">
            {
              leads.filter(
                (lead) => lead.lead_status === 'sent_to_relist_queue'
              ).length
            }
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-400">
          No seller leads yet. Add a marketplace lead to start outreach.
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
                  <h3 className="font-bold text-white">{lead.item_title}</h3>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                      {lead.marketplace_source || lead.lead_source || 'Unknown Source'}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        lead.lead_status === 'new'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : lead.lead_status === 'contacted'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : lead.lead_status === 'responded'
                          ? 'bg-purple-500/20 text-purple-400'
                          : lead.lead_status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700/20 text-zinc-300'
                      }`}
                    >
                      {(lead.lead_status || 'new').toUpperCase()}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        lead.agreement_accepted
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {lead.agreement_accepted
                        ? 'AGREEMENT ACCEPTED'
                        : 'NO AGREEMENT YET'}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mt-3">
                    Seller: {lead.seller_name || 'Unknown'} ·{' '}
                    {lead.seller_city || 'Unknown City'}
                    {lead.seller_state ? `, ${lead.seller_state}` : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-zinc-500">AI Score</p>
                  <p className="text-xl font-bold text-white">
                    {lead.ai_score || 0}
                  </p>
                </div>
              </div>

              <p className="text-sm text-zinc-300 mt-3">
                {lead.item_description}
              </p>
              {lead.photo_urls && lead.photo_urls.length > 0 && (
  <div className="mt-4">
    <p className="mb-2 text-sm font-bold text-cyan-400">
      Seller Photos
    </p>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {lead.photo_urls.map((url, index) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
        >
          <img
            src={url}
            alt={`Seller uploaded photo ${index + 1}`}
            className="h-40 w-full object-cover"
          />
        </a>
      ))}
    </div>
  </div>
)}
       
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Seller Ask</p>
                  <p className="font-bold text-white">
                    ${lead.asking_price || 0}
                  </p>
                </div>

                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Relist Price</p>
                  <p className="font-bold text-white">
                    ${lead.estimated_resale_price || 0}
                  </p>
                </div>

                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Commission</p>
                  <p className="font-bold text-white">
                    ${lead.estimated_commission || 0}
                  </p>
                </div>

                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Commission Rate</p>
                  <p className="font-bold text-white">
                    {lead.commission_rate || 15}%
                  </p>
                </div>
              </div>

              {(lead.marketplace_listing_url || lead.seller_profile_url) && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lead.marketplace_listing_url && (
                    <a
                      href={lead.marketplace_listing_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-bold text-cyan-400 hover:bg-zinc-800"
                    >
                      Open Marketplace Listing
                    </a>
                  )}

                  {lead.seller_profile_url && (
                    <a
                      href={lead.seller_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-bold text-cyan-400 hover:bg-zinc-800"
                    >
                      Open Seller Profile
                    </a>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-lg bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500 mb-1">
                  AI Outreach Message
                </p>
                <p className="text-sm text-zinc-300">
                  {lead.acquisition_message}
                </p>
              </div>

              <textarea
                defaultValue={lead.outreach_notes || ''}
                placeholder="Seller outreach notes..."
                className="mt-3 min-h-20 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                onBlur={async (e) => {
                  await supabase
                    .from('seller_leads')
                    .update({ outreach_notes: e.target.value })
                    .eq('id', lead.id);
                }}
              />

              <textarea
                defaultValue={lead.approval_notes || ''}
                placeholder="Approval / commission agreement notes..."
                className="mt-3 min-h-20 w-full rounded-lg border border-green-700/50 bg-zinc-900 px-3 py-2 text-sm text-white"
                onBlur={async (e) => {
                  await supabase
                    .from('seller_leads')
                    .update({ approval_notes: e.target.value })
                    .eq('id', lead.id);
                }}
              />

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    lead.acquisition_message || ''
                  );
                  alert('Outreach message copied.');
                }}
                className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-black hover:bg-cyan-300"
              >
                Copy Outreach Message
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <button
                  onClick={() => updateLeadStatus(lead.id, 'contacted')}
                  className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black hover:bg-yellow-300"
                >
                  Mark Contacted
                </button>

                <button
                  onClick={() => updateLeadStatus(lead.id, 'responded')}
                  className="rounded-xl bg-purple-400 px-4 py-3 text-sm font-bold text-black hover:bg-purple-300"
                >
                  Mark Responded
                </button>

                <button
                  onClick={() => approveSellerAgreement(lead)}
                  className="rounded-xl bg-green-400 px-4 py-3 text-sm font-bold text-black hover:bg-green-300"
                >
                  Approve Seller + Agreement
                </button>
              </div>

              <div className="mt-4">
                {lead.approval_status === 'approved' &&
                lead.agreement_accepted ? (
                  <button
                    onClick={() => sendToRelistQueue(lead)}
                    disabled={lead.lead_status === 'sent_to_relist_queue'}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-black ${
                      lead.lead_status === 'sent_to_relist_queue'
                        ? 'bg-zinc-600 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-400'
                    }`}
                  >
                    {lead.lead_status === 'sent_to_relist_queue'
                      ? 'Already Sent to AI Relist Queue'
                      : 'Send to AI Relist Queue'}
                  </button>
                ) : (
                  <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-xs text-zinc-400">
                    Seller approval + commission agreement required before sending
                    to AI Relist Queue.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}