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

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();

    if (submitting || submitted) {
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      alert("Please enter your name, email, and message.");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("buyer_inquiries")
        .insert({
          listing_id: id,
          buyer_name: form.name.trim(),
          buyer_email: form.email.trim().toLowerCase(),
          buyer_phone: form.phone.trim() || null,
          message: form.message.trim(),
          status: "new",
        });

      if (error) {
        alert(error.message);
        return;
      }

      setSubmittedName(form.name.trim());
      setSubmitted(true);

      setForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      console.error("Buyer inquiry submission failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Your inquiry could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <a
          href={`/marketplace/${id}`}
          className="font-bold text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Listing
        </a>

        {submitted ? (
          <section className="mt-10 rounded-3xl border border-green-800 bg-green-950/20 p-8">
            <p className="text-sm font-bold uppercase text-green-400">
              Inquiry Received
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Thanks, {submittedName}.
            </h1>

            <p className="mt-5 text-lg leading-8 text-zinc-300">
              Your message has been sent to DealHaus successfully.
            </p>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-6">
              <p className="text-sm font-bold uppercase text-cyan-400">
                DealHaus
              </p>

              <p className="mt-3 leading-7 text-zinc-300">
                Thanks for your interest in this listing. We received your
                inquiry and will review the item details and your message.
                The DealHaus team will follow up with you as soon as possible
                with availability and next steps.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`/marketplace/${id}`}
                className="rounded-xl bg-cyan-400 px-6 py-4 font-black text-black hover:bg-cyan-300"
              >
                Return to Listing
              </a>

              <a
                href="/marketplace"
                className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white hover:border-zinc-500"
              >
                Browse More Deals
              </a>
            </div>
          </section>
        ) : (
          <>
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
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
              />

              <input
                type="email"
                className="w-full rounded-xl border border-zinc-700 bg-black p-4"
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
              />

              <input
                className="w-full rounded-xl border border-zinc-700 bg-black p-4"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) =>
                  updateField("phone", e.target.value)
                }
              />

              <textarea
                rows={5}
                className="w-full rounded-xl border border-zinc-700 bg-black p-4"
                placeholder="Tell us what you'd like to know..."
                value={form.message}
                onChange={(e) =>
                  updateField("message", e.target.value)
                }
              />

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-cyan-400 px-8 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Sending..."
                  : "Send Inquiry"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}