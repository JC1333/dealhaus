"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SubmitPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    alreadyListed: "",
    marketplaceUrl: "",
    name: "",
    email: "",
    phone: "",
    category: "",
    title: "",
    description: "",
    askingPrice: "",
    condition: "",
    city: "",
    state: "",
    zip: "",
    agree: false,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function nextStep() {
    setStep((prev) => Math.min(prev + 1, 5));
  }

  function backStep() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function submitItem() {
    if (!form.name || !form.email || !form.title || !form.askingPrice || !form.city) {
      alert("Please complete your name, email, item title, asking price, and city.");
      return;
    }

    if (!form.agree) {
      alert("Please authorize DealHaus to review and market your item.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("seller_leads").insert({
      seller_name: form.name,
      seller_email: form.email,
      item_title: form.title,
      asking_price: Number(form.askingPrice || 0),
      seller_city: form.city,
      seller_state: form.state,
      platform: form.alreadyListed === "yes" ? "Existing Marketplace Listing" : "DealHaus Public Website",
      status: "new",
      lead_status: "new",
      lead_source: "Public Seller Review Wizard",
      outreach_status: "new",
      acquisition_score: 80,
      acquisition_reason: `Public seller submission. Already listed: ${form.alreadyListed}. Marketplace URL: ${form.marketplaceUrl || "N/A"}. Category: ${form.category}. Condition: ${form.condition}. Description: ${form.description}. Phone: ${form.phone || "N/A"}.`,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setStep(5);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <a href="/launch" className="text-sm text-cyan-400 font-bold">
          ← Back to DealHaus
        </a>

        <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-10">
          <p className="text-cyan-400 font-bold uppercase text-sm">
            DealHaus Seller Review
          </p>

          <h1 className="mt-3 text-4xl md:text-5xl font-black">
            Get Your Item Professionally Reviewed
          </h1>

          <p className="mt-4 text-zinc-400">
            Our AI reviews every submission for pricing, demand, resale potential, and buyer interest before recommending the best selling strategy.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
  <div className="rounded-xl border border-zinc-800 bg-black p-4">
    <p className="text-green-400 font-bold">✓ No Upfront Fees</p>
    <p className="mt-2 text-sm text-zinc-400">
      You only pay if DealHaus helps complete a successful sale.
    </p>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-black p-4">
    <p className="text-cyan-400 font-bold">✓ AI Marketplace Review</p>
    <p className="mt-2 text-sm text-zinc-400">
      We analyze pricing, buyer demand, and listing quality before marketing your item.
    </p>
  </div>

  <div className="rounded-xl border border-zinc-800 bg-black p-4">
    <p className="text-yellow-400 font-bold">✓ Local Buyer Network</p>
    <p className="mt-2 text-sm text-zinc-400">
      DealHaus works to connect your item with qualified local buyers.
    </p>
  </div>
</div>

          <div className="mt-8 h-2 rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-cyan-400"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

         <div className="mt-5 flex items-center justify-between">
  <p className="text-sm font-semibold text-cyan-400">
    Step {step} of 5
  </p>

  <p className="text-sm text-zinc-500">
    DealHaus Seller Review
  </p>
</div>

          <div className="mt-8">
            {step === 1 && (
              <section className="space-y-5">
                <h2 className="text-2xl font-bold">Is your item already listed somewhere?</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => updateField("alreadyListed", "yes")}
                    className={`rounded-2xl border p-6 text-left ${
                      form.alreadyListed === "yes"
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-zinc-800 bg-black"
                    }`}
                  >
                    <p className="font-bold text-xl">Yes</p>
                    <p className="text-zinc-400 mt-2">
                      It is already on Facebook Marketplace, OfferUp, Craigslist, or another marketplace.
                    </p>
                  </button>

                  <button
                    onClick={() => updateField("alreadyListed", "no")}
                    className={`rounded-2xl border p-6 text-left ${
                      form.alreadyListed === "no"
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-zinc-800 bg-black"
                    }`}
                  >
                    <p className="font-bold text-xl">No</p>
                    <p className="text-zinc-400 mt-2">
                      I have not listed it yet. I want DealHaus to help from the beginning.
                    </p>
                  </button>
                </div>

                {form.alreadyListed === "yes" && (
                  <input
                    value={form.marketplaceUrl}
                    onChange={(e) => updateField("marketplaceUrl", e.target.value)}
                    placeholder="Paste your Facebook Marketplace, OfferUp, or Craigslist URL"
                    className="w-full rounded-xl border border-zinc-700 bg-black p-4"
                  />
                )}

                <button
                  onClick={nextStep}
                  disabled={!form.alreadyListed}
                  className="rounded-xl bg-green-400 px-6 py-4 font-bold text-black disabled:opacity-50"
                >
                  Continue
                </button>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-5">
                <h2 className="text-2xl font-bold">Tell us about the item.</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Category" value={form.category} onChange={(e) => updateField("category", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Item Title" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Asking Price" value={form.askingPrice} onChange={(e) => updateField("askingPrice", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Condition" value={form.condition} onChange={(e) => updateField("condition", e.target.value)} />
                </div>

                <textarea
                  className="w-full min-h-[130px] rounded-xl border border-zinc-700 bg-black p-4"
                  placeholder="Describe the item..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />

                <div className="flex gap-3">
                  <button onClick={backStep} className="rounded-xl border border-zinc-700 px-6 py-4 font-bold">
                    Back
                  </button>
                  <button onClick={nextStep} className="rounded-xl bg-green-400 px-6 py-4 font-bold text-black">
                    Continue
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-5">
                <h2 className="text-2xl font-bold">Where is the item located?</h2>

                <div className="grid md:grid-cols-3 gap-4">
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="City" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="ZIP Code" value={form.zip} onChange={(e) => updateField("zip", e.target.value)} />
                </div>

                <div className="flex gap-3">
                  <button onClick={backStep} className="rounded-xl border border-zinc-700 px-6 py-4 font-bold">
                    Back
                  </button>
                  <button onClick={nextStep} className="rounded-xl bg-green-400 px-6 py-4 font-bold text-black">
                    Continue
                  </button>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-5">
                <h2 className="text-2xl font-bold">How can we contact you?</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Full Name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Email Address" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  <input className="rounded-xl border border-zinc-700 bg-black p-4" placeholder="Phone Number" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </div>

                <label className="flex items-start gap-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.agree}
                    onChange={(e) => updateField("agree", e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I authorize DealHaus to review this item and contact me about possible marketing, buyer interest, and selling assistance.
                  </span>
                </label>

                <div className="flex gap-3">
                  <button onClick={backStep} className="rounded-xl border border-zinc-700 px-6 py-4 font-bold">
                    Back
                  </button>
                  <button
                    onClick={submitItem}
                    disabled={loading}
                    className="rounded-xl bg-green-400 px-6 py-4 font-bold text-black disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit for Review"}
                  </button>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="rounded-2xl border border-green-900 bg-green-950/20 p-8 text-center">
                <h2 className="text-3xl font-black">Your item was submitted.</h2>
                <p className="mt-4 text-zinc-300">
                  DealHaus will review your submission and follow up shortly.
                </p>
                <a href="/launch" className="inline-block mt-6 rounded-xl bg-green-400 px-6 py-4 font-bold text-black">
                  Back to DealHaus
                </a>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}