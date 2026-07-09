"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Inquiry = {
  id: string;
  created_at: string;
  listing_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  message: string | null;
  status: string | null;
};

export default function BuyerInquiriesWorkspace() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  useEffect(() => {
    loadInquiries();
  }, []);

  async function loadInquiries() {
    const { data, error } = await supabase
      .from("buyer_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Buyer inquiries failed to load: " + error.message);
      return;
    }

    setInquiries(data || []);
  }

  async function convertToConversation(item: Inquiry) {

    if (!item.listing_id) {
      alert("Cannot convert: missing listing ID.");
      return;
    }

    const { error: conversationError } = await supabase
      .from("buyer_conversations")
      .insert({
        inventory_id: Number(item.listing_id),
        inventory_title: `Listing ${item.listing_id}`,
        buyer_name: item.buyer_name || "Buyer",
        buyer_email: item.buyer_email || "",
        last_message: item.message || "",
        conversation_stage: "buyer_inquiry",
        unread_count: 1,
      });
      
    if (conversationError) {
      alert("Conversation insert failed: " + conversationError.message);
      return;
    }

    const { error: inquiryError } = await supabase
      .from("buyer_inquiries")
      .update({ status: "converted_to_conversation" })
      .eq("id", item.id);

    if (inquiryError) {
      alert("Inquiry status update failed: " + inquiryError.message);
      return;
    }

    alert("Buyer inquiry converted to conversation.");
    await loadInquiries();
  }

  async function markContacted(item: Inquiry) {
    const { error } = await supabase
      .from("buyer_inquiries")
      .update({ status: "contacted" })
      .eq("id", item.id);

    if (error) {
      alert("Mark contacted failed: " + error.message);
      return;
    }

    alert("Inquiry marked contacted.");
    await loadInquiries();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-black text-white">Buyer Inquiries</h2>
        <p className="text-zinc-400 mt-2">
          New buyer requests submitted through the DealHaus marketplace.
        </p>
      </div>

      {inquiries.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">{item.buyer_name}</h3>
              <p className="text-sm text-zinc-400">{item.buyer_email}</p>
              <p className="text-sm text-zinc-500">
                {item.buyer_phone || "No phone provided"}
              </p>
            </div>

            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-400">
              {(item.status || "new").toUpperCase()}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-sm text-zinc-400">Listing</p>
            <p className="font-bold text-white">{item.listing_id}</p>

            <p className="mt-4 text-sm text-zinc-400">Message</p>
            <p className="mt-1 text-white">{item.message}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => convertToConversation(item)}
                className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300"
              >
                Convert to Conversation
              </button>

              <button
                type="button"
                onClick={() => markContacted(item)}
                className="rounded-xl border border-zinc-700 px-5 py-3 font-bold text-white hover:border-cyan-400"
              >
                Mark Contacted
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}