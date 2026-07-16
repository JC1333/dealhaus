"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SubmitPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferredContact: "",
    title: "",
    category: "",
    condition: "",
    askingPrice: "",
    city: "",
    state: "",
    zip: "",
    marketplaceUrl: "",
    description: "",
    agree: false,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitItem() {
    if (
      !form.name ||
      !form.email ||
      !form.title ||
      !form.askingPrice ||
      !form.city
    ) {
      alert(
        "Please complete your name, email, item title, asking price, and city."
      );
      return;
    }

    if (!form.preferredContact) {
      alert("Please select your preferred contact method.");
      return;
    }

    if (
      (form.preferredContact === "text" ||
        form.preferredContact === "call") &&
      !form.phone
    ) {
      alert(
        "Please enter your phone number when selecting text message or phone call."
      );
      return;
    }

    if (!form.agree) {
      alert(
        "Please agree to the DealHaus fee structure and contact authorization."
      );
      return;
    }

    setLoading(true);

    const uploadedPhotoUrls: string[] = [];

    if (photos.length > 0) {
      for (const photo of photos) {
        const safeName = photo.name.replace(/[^a-zA-Z0-9.-]/g, "-");
        const fileName = `seller-${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("seller-photos")
          .upload(fileName, photo);

        if (uploadError) {
          setLoading(false);
          alert("Photo upload failed: " + uploadError.message);
          return;
        }

        const { data } = supabase.storage
          .from("seller-photos")
          .getPublicUrl(fileName);

        uploadedPhotoUrls.push(data.publicUrl);
      }
    }

    const { error } = await supabase.from("seller_leads").insert({
      seller_name: form.name,
      seller_email: form.email,
      seller_phone: form.phone || null,
      preferred_contact_method: form.preferredContact,
      item_title: form.title,
      item_description: form.description,
      asking_price: Number(form.askingPrice || 0),
      commission_rate: 10,
      seller_city: form.city,
      seller_state: form.state,
      photo_urls: uploadedPhotoUrls,
      platform: form.marketplaceUrl
        ? "Existing Marketplace Listing"
        : "DealHaus Public Website",
      status: "new",
      lead_status: "new",
      lead_source: "Public Seller Submission",
      outreach_status: "new",
      acquisition_score: 85,
      acquisition_reason: `Public seller submission. Preferred contact method: ${
        form.preferredContact
      }. Category: ${form.category || "N/A"}. Condition: ${
        form.condition || "N/A"
      }. Marketplace URL: ${form.marketplaceUrl || "N/A"}. ZIP: ${
        form.zip || "N/A"
      }. Description: ${
        form.description || "N/A"
      }. Photos: ${
        uploadedPhotoUrls.join(", ") || "No photos uploaded"
      }. DealHaus fee disclosed: 10% success-based commission after sale.`,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <a href="/launch" className="font-bold text-cyan-400">
            ← Back to DealHaus
          </a>

          <section className="mt-10 rounded-3xl border border-green-900 bg-green-950/20 p-10 text-center">
            <p className="text-sm font-bold uppercase text-green-400">
              Submission Received
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Your item review has started.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-zinc-300">
              DealHaus received your item details. Once details and photos are
              confirmed, we can help prepare the listing, organize buyer
              interest, and move the sale forward.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 text-left md:grid-cols-4">
              {[
                ["1", "Review", "We review your item details."],
                ["2", "Market Check", "We evaluate demand and pricing."],
                ["3", "Strategy", "We prepare next selling steps."],
                ["4", "Follow Up", "DealHaus contacts you shortly."],
              ].map(([num, title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-zinc-800 bg-black p-5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-400 font-black text-black">
                    {num}
                  </div>

                  <h3 className="mt-4 font-black">{title}</h3>

                  <p className="mt-2 text-sm text-zinc-400">
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="/launch"
              className="mt-8 inline-block rounded-xl bg-green-400 px-6 py-4 font-bold text-black"
            >
              Back to DealHaus
            </a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 bg-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/launch" className="text-3xl font-black md:text-4xl">
            DealHaus <span className="text-cyan-400">AI</span>
          </a>

          <div className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="/faq" className="hover:text-cyan-400">
              FAQ
            </a>

            <a
              href="mailto:hello@dealhaus.ai"
              className="hover:text-cyan-400"
            >
              hello@dealhaus.ai
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <div className="pt-4">
            <p className="text-sm font-bold uppercase text-cyan-400">
              DealHaus Seller Review
            </p>

            <h1 className="mt-4 text-5xl font-black leading-none md:text-7xl">
              Let’s Help You{" "}
              <span className="text-cyan-400">
                Sell Your Item
              </span>
            </h1>

            <p className="mt-6 text-xl text-zinc-300">
              Every item has value. We help local sellers get smarter pricing,
              better exposure, and real buyer interest.
            </p>

            <div className="mt-9 space-y-6">
              {[
                [
                  "✓",
                  "No Upfront Fees",
                  "DealHaus charges a 10% success-based commission only after your item sells.",
                ],
                [
                  "✦",
                  "Market Review & Pricing",
                  "We look at demand, item details, and resale potential to help position your listing.",
                ],
                [
                  "◎",
                  "Local Marketplace Reach",
                  "Serving Las Vegas, Henderson, North Las Vegas, Boulder City, Pahrump, Mesquite, Laughlin, Primm, and surrounding Nevada areas.",
                ],
                [
                  "♡",
                  "People First",
                  "You are never just a number. We communicate clearly and help move the process forward.",
                ],
              ].map(([icon, title, text]) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500 font-black text-cyan-400">
                    {icon}
                  </div>

                  <div>
                    <h3 className="text-xl font-black">
                      {title}
                    </h3>

                    <p className="mt-1 max-w-xl text-zinc-400">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="font-black text-cyan-400">
                Our Promise
              </p>

              <p className="mt-3 text-zinc-300">
                Honest service. Clear communication. Faith-driven values.
                Helping You Sell Smarter. Built on Integrity. Guided by Faith.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl md:p-8">
            <h2 className="text-center text-3xl font-black">
              Submit Your Item
            </h2>

            <p className="mt-2 text-center text-zinc-400">
              Tell us about your item and we’ll take it from here.
            </p>

            <div className="mt-6 space-y-4">
              <FormSection number="1" title="Seller Information">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Full Name *"
                    value={form.name}
                    onChange={(value) => updateField("name", value)}
                  />

                  <Input
                    placeholder="Email Address *"
                    value={form.email}
                    onChange={(value) => updateField("email", value)}
                  />

                  <Input
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={(value) => updateField("phone", value)}
                  />

                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                    <p className="font-bold text-white">
                      Preferred Contact Method *
                    </p>

                    <div className="mt-3 space-y-3">
                      <ContactOption
                        label="Email"
                        value="email"
                        checked={form.preferredContact === "email"}
                        onChange={(value) =>
                          updateField("preferredContact", value)
                        }
                      />

                      <ContactOption
                        label="Text Message"
                        value="text"
                        checked={form.preferredContact === "text"}
                        onChange={(value) =>
                          updateField("preferredContact", value)
                        }
                      />

                      <ContactOption
                        label="Phone Call"
                        value="call"
                        checked={form.preferredContact === "call"}
                        onChange={(value) =>
                          updateField("preferredContact", value)
                        }
                      />
                    </div>
                  </div>
                </div>

                {(form.preferredContact === "text" ||
                  form.preferredContact === "call") &&
                  !form.phone && (
                    <p className="mt-3 text-sm font-bold text-yellow-400">
                      A phone number is required for text messages or phone
                      calls.
                    </p>
                  )}
              </FormSection>

              <FormSection number="2" title="Item Information">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Item Title *"
                    value={form.title}
                    onChange={(value) => updateField("title", value)}
                  />

                  <Input
                    placeholder="Category"
                    value={form.category}
                    onChange={(value) => updateField("category", value)}
                  />

                  <Input
                    placeholder="Condition"
                    value={form.condition}
                    onChange={(value) => updateField("condition", value)}
                  />

                  <Input
                    placeholder="Asking Price *"
                    value={form.askingPrice}
                    onChange={(value) =>
                      updateField("askingPrice", value)
                    }
                  />
                </div>
              </FormSection>

              <FormSection number="3" title="Location">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    placeholder="City *"
                    value={form.city}
                    onChange={(value) => updateField("city", value)}
                  />

                  <Input
                    placeholder="State"
                    value={form.state}
                    onChange={(value) => updateField("state", value)}
                  />

                  <Input
                    placeholder="ZIP Code"
                    value={form.zip}
                    onChange={(value) => updateField("zip", value)}
                  />
                </div>
              </FormSection>

              <FormSection number="4" title="Additional Details">
                <textarea
                  className="min-h-32 w-full rounded-xl border border-zinc-700 bg-black p-4 text-white"
                  placeholder="Describe your item, condition, size, brand, pickup details, and anything buyers should know..."
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />

                <p className="mb-2 mt-5 text-lg font-bold text-white">
                  Photos
                </p>

                <p className="mb-3 text-sm text-zinc-400">
                  Upload up to 10 clear photos of your item. Good photos help
                  attract more buyers.
                </p>

                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-cyan-500 bg-zinc-900 p-6 text-center hover:border-cyan-400">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const selectedFiles = Array.from(
                        event.target.files || []
                      );

                      setPhotos((prev) =>
                        [...prev, ...selectedFiles].slice(0, 10)
                      );

                      event.target.value = "";
                    }}
                  />

                  <p className="font-black text-white">
                    Upload Photos
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Click here to add photos. You can add more than one time.
                  </p>
                </label>

                {photos.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-3 rounded-xl border border-green-800 bg-green-950/30 p-3 text-sm font-bold text-green-400">
                      {photos.length} photo
                      {photos.length === 1 ? "" : "s"} selected
                    </p>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photos.map((photo, index) => (
                        <div
                          key={`${photo.name}-${index}`}
                          className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                        >
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Uploaded photo ${index + 1}`}
                            className="h-28 w-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setPhotos((prev) =>
                                prev.filter(
                                  (_, photoIndex) =>
                                    photoIndex !== index
                                )
                              );
                            }}
                            className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-1 text-xs font-bold text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  className="mt-4 w-full rounded-xl border border-zinc-700 bg-black p-4 text-white"
                  placeholder="Marketplace URL optional"
                  value={form.marketplaceUrl}
                  onChange={(event) =>
                    updateField("marketplaceUrl", event.target.value)
                  }
                />
              </FormSection>

              <FormSection number="5" title="Agreement">
                <label className="flex gap-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.agree}
                    onChange={(event) =>
                      updateField("agree", event.target.checked)
                    }
                    className="mt-1"
                  />

                  <span>
                    I agree to DealHaus’ fee structure and authorize DealHaus
                    to contact me regarding my submission using my selected
                    preferred contact method. DealHaus charges a 10%
                    success-based commission on the final sale price. No
                    upfront fees.
                  </span>
                </label>
              </FormSection>

              <button
                type="button"
                onClick={submitItem}
                disabled={loading}
                className="w-full rounded-xl bg-cyan-400 px-6 py-4 font-black text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Submitting..."
                  : "Submit for Review →"}
              </button>

              <p className="text-center text-xs text-zinc-500">
                Your information is secure and will never be shared
                unnecessarily.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14 border-t border-zinc-800 pt-10">
          <h2 className="text-center text-3xl font-black">
            How DealHaus Works
          </h2>

          <p className="mt-2 text-center text-zinc-400">
            Simple steps from submission to sale.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-6">
            {[
              ["1", "Submit", "You send details."],
              ["2", "Review", "We review demand."],
              ["3", "Market", "We prepare strategy."],
              ["4", "Exposure", "We help promote."],
              ["5", "Buyer Interest", "We organize buyers."],
              ["6", "Sold", "10% success fee."],
            ].map(([num, title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 font-black text-black">
                  {num}
                </div>

                <h3 className="mt-4 font-black">
                  {title}
                </h3>

                <p className="mt-2 text-sm text-zinc-400">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            [
              "Areas We Serve",
              "Las Vegas, Henderson, North Las Vegas, Boulder City, Pahrump, Mesquite, Laughlin, Primm, and surrounding Nevada areas.",
            ],
            [
              "5.0 Star Service",
              "Backed by 200+ marketplace reviews and local selling experience.",
            ],
            [
              "10% Success Fee",
              "No upfront commission. Only charged after your item sells.",
            ],
            [
              "Real Support",
              "Clear, responsive communication from real people.",
            ],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <h3 className="font-black text-cyan-400">
                {title}
              </h3>

              <p className="mt-2 text-sm text-zinc-400">
                {text}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center">
          <h2 className="text-2xl font-black">
            Every seller. Every item. Always welcome.
          </h2>

          <p className="mt-2 text-zinc-400">
            From small household items to larger marketplace listings,
            DealHaus helps sellers move forward with confidence.
          </p>
        </section>
      </div>
    </main>
  );
}

function ContactOption({
  label,
  value,
  checked,
  onChange,
}: {
  label: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
      <input
        type="radio"
        name="preferredContact"
        value={value}
        checked={checked}
        onChange={(event) => onChange(event.target.value)}
        className="h-4 w-4 accent-cyan-400"
      />

      <span>{label}</span>
    </label>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-black p-4">
      <h3 className="mb-3 font-black text-white">
        <span className="text-cyan-400">
          {number}
        </span>{" "}
        {title}
      </h3>

      {children}
    </section>
  );
}

function Input({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white placeholder:text-zinc-500"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}