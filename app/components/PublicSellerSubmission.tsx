"use client";

import { useState } from "react";

export default function PublicSellerSubmission() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    title: "",
    description: "",
    askingPrice: "",
    condition: "",
    city: "",
    zip: "",
    facebookUrl: "",
    offerupUrl: "",
    craigslistUrl: "",
    agree: false,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    alert(
      "Seller submission received. Next step will connect this directly to the DealHaus AI pipeline."
    );
  }

  return (
    <section className="rounded-3xl border border-cyan-900 bg-zinc-950 p-8 space-y-8">
      <div>
        <p className="text-cyan-400 font-semibold">
          DealHaus Seller Submission
        </p>

        <h2 className="text-4xl font-black mt-2">
          Let's help you sell your item.
        </h2>

        <p className="text-zinc-400 mt-4 max-w-3xl">
          Complete the information below and DealHaus will review your item for
          marketplace demand, pricing opportunities, and buyer interest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="text-2xl font-bold mb-4">Contact Information</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">Item Information</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="Item Title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="Asking Price"
              value={form.askingPrice}
              onChange={(e) => updateField("askingPrice", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="Condition"
              value={form.condition}
              onChange={(e) => updateField("condition", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />

            <input
              placeholder="ZIP Code"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3"
            />
          </div>

          <textarea
            placeholder="Describe your item..."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="rounded-xl bg-black border border-zinc-700 p-3 mt-4 w-full min-h-[140px]"
          />
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">
            Existing Marketplace Listings (Optional)
          </h3>

          <div className="space-y-3">
            <input
              placeholder="Facebook Marketplace URL"
              value={form.facebookUrl}
              onChange={(e) => updateField("facebookUrl", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3 w-full"
            />

            <input
              placeholder="OfferUp URL"
              value={form.offerupUrl}
              onChange={(e) => updateField("offerupUrl", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3 w-full"
            />

            <input
              placeholder="Craigslist URL"
              value={form.craigslistUrl}
              onChange={(e) => updateField("craigslistUrl", e.target.value)}
              className="rounded-xl bg-black border border-zinc-700 p-3 w-full"
            />
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(e) => updateField("agree", e.target.checked)}
          />

          <span>
            I authorize DealHaus to review and market my item.
          </span>
        </label>

        <button
          type="submit"
          className="bg-green-400 text-black rounded-2xl px-8 py-4 font-bold"
        >
          Submit My Item
        </button>
      </form>
    </section>
  );
}