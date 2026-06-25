"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function InquiryPage() {
  const { id } = useParams();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitInquiry(e: React.FormEvent) {
  e.preventDefault();

  if (!form.name || !form.email || !form.message) {
    alert("Please enter your name, email, and message.");
    return;
  }

  const { error } = await supabase.from("buyer_inquiries").insert({
    listing_id: id,
    buyer_name: form.name,
    buyer_email: form.email,
    buyer_phone: form.phone,
    message: form.message,
    status: "new",
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Inquiry submitted. DealHaus will follow up shortly.");

  setForm({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
}

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-6 py-10">

        <a
          href={`/marketplace/${id}`}
          className="text-cyan-400 font-bold"
        >
          ← Back to Listing
        </a>

        <h1 className="mt-8 text-4xl font-black">
          Request Information
        </h1>

        <p className="mt-3 text-zinc-400">
          Send a message to the DealHaus team about this listing.
        </p>

        <form
          onSubmit={submitInquiry}
          className="mt-8 space-y-5"
        >

          <input
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
            placeholder="Your Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
          />

          <input
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
            placeholder="Email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />

          <input
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />

          <textarea
            rows={5}
            className="w-full rounded-xl border border-zinc-700 bg-black p-4"
            placeholder="Tell us what you'd like to know..."
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
          />

          <button
            className="rounded-xl bg-cyan-400 px-8 py-4 font-black text-black"
          >
            Send Inquiry
          </button>

        </form>

      </div>
    </main>
  );
}