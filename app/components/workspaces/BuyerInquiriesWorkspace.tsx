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
    const { data } = await supabase
      .from("buyer_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    setInquiries(data || []);
  }

  return (
    <div className="space-y-5">

      <div>
        <h2 className="text-3xl font-black text-white">
          Buyer Inquiries
        </h2>

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
              <h3 className="font-bold text-white">
                {item.buyer_name}
              </h3>

              <p className="text-sm text-zinc-400">
                {item.buyer_email}
              </p>

              <p className="text-sm text-zinc-500">
                {item.buyer_phone || "No phone provided"}
              </p>
            </div>

            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-400">
              {(item.status || "new").toUpperCase()}
            </span>

          </div>

          <div className="mt-5">

            <p className="text-sm text-zinc-400">
              Listing
            </p>

            <p className="font-bold text-white">
              {item.listing_id}
            </p>

            <p className="mt-4 text-sm text-zinc-400">
              Message
            </p>

            <p className="mt-1 text-white">
              {item.message}
            </p>

          </div>
        </div>
      ))}

    </div>
  );
}