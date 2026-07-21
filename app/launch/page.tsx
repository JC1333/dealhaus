"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HeroSection from "../components/public/HeroSection";
import { useRouter } from "next/navigation";

type Listing = {
  id: string | number;
  title: string | null;
  price: number | null;
  image: string | null;
  seller_city: string | null;
  seller_state: string | null;
};

export default function LaunchPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [facebookUrl, setFacebookUrl] = useState("");
  const router = useRouter();
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const [importedPhotoUrls, setImportedPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [sellerForm, setSellerForm] = useState({
  title: "",
  price: "",
  description: "",
  category: "",
  condition: "",
  location: "",
  sellerCity: "",
  sellerState: "",
  sellerZip: "",
  sellerName: "",
  sellerEmail: "",
  sellerPhone: "",
  preferredContact: "text",
});
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
   const { data } = await supabase
  .from("inventory")
  .select("id,title,price,image,seller_city,seller_state,status")
  .eq("status", "active")
  .order("id", { ascending: false })
  .limit(5);

    setListings(data || []);
  }

  async function importListing() {
  if (!facebookUrl.trim()) {
    alert("Paste a Facebook Marketplace, OfferUp, or Craigslist URL.");
    return;
  }

  try {
    setImportLoading(true);

    const response = await fetch("/api/import-deals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listingUrl: facebookUrl.trim(),
      }),
    });

    const result = await response.json();

    console.log(result);

    if (!response.ok) {
      alert(result.error || "Import failed.");
      return;
    }

    setImportPreview(result);

    const detectedPhotoUrls = Array.isArray(
      result.listing?.imageUrls
    )
      ? result.listing.imageUrls.filter(
          (url: unknown): url is string =>
            typeof url === "string" &&
            /^https?:\/\//i.test(url)
        )
      : [];

    setImportedPhotoUrls(detectedPhotoUrls);
    setNewPhotos([]);

    const detectedLocation =
      typeof result.listing?.location === "string"
        ? result.listing.location.trim()
        : "";

    const locationParts = detectedLocation
      .split(",")
      .map((part: string) => part.trim())
      .filter(Boolean);

    setSellerForm({
      title: result.listing?.title || "",
      price:
        result.listing?.price !== null &&
        result.listing?.price !== undefined
          ? String(result.listing.price)
          : "",
      description: result.listing?.description || "",
      category: result.listing?.category || "",
      condition: result.listing?.condition || "",
      location: detectedLocation,
      sellerCity: locationParts[0] || "",
      sellerState: locationParts[1] || "",
      sellerZip: "",
      sellerName: "",
      sellerEmail: "",
      sellerPhone: "",
      preferredContact: "text",
    });
  } catch (error) {
    console.error(error);
    alert("Unable to contact the DealHaus importer.");
  } finally {
    setImportLoading(false);
  }
}
async function uploadSelectedPhotos() {
  const uploadedPhotoUrls: string[] = [];

  for (const photo of newPhotos) {
    const safeName = photo.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const fileName = `seller-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("seller-photos")
      .upload(fileName, photo);

    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from("seller-photos")
      .getPublicUrl(fileName);

    if (data.publicUrl) {
      uploadedPhotoUrls.push(data.publicUrl);
    }
  }

  return uploadedPhotoUrls;
}

async function confirmImportedListing() {
  try {
    setConfirmLoading(true);
    setConfirmSuccess(null);

    const uploadedPhotoUrls = await uploadSelectedPhotos();
    const photoUrls = Array.from(
      new Set([...importedPhotoUrls, ...uploadedPhotoUrls])
    );

    const response = await fetch("/api/confirm-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        importId: importPreview?.importId,
        title: sellerForm.title,
        price: sellerForm.price,
        description: sellerForm.description,
        category: sellerForm.category,
        condition: sellerForm.condition,
        location: sellerForm.location,
        sellerCity: sellerForm.sellerCity,
        sellerState: sellerForm.sellerState,
        sellerZip: sellerForm.sellerZip,
        sellerName: sellerForm.sellerName,
        sellerEmail: sellerForm.sellerEmail,
        sellerPhone: sellerForm.sellerPhone,
        preferredContact: sellerForm.preferredContact,
        photoUrls,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "The listing could not be submitted.");
      return;
    }

    router.push("/submission-success");
  } catch (error) {
    console.error(error);
    alert("Unable to submit the imported listing.");
  } finally {
    setConfirmLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="text-4xl md:text-5xl font-black tracking-tight">
  DealHaus <span className="text-cyan-400">AI</span>
</div>

          <nav className="hidden md:flex items-center gap-10 text-lg font-semibold text-zinc-300">
      <a href="/marketplace" className="hover:text-white">
  Browse
</a>

<a href="/submit" className="hover:text-white">
  Sell
</a>

<a href="#how" className="hover:text-white">
  How It Works
</a>

<a href="#about" className="hover:text-white">
  About
</a>

<a href="#contact" className="hover:text-white">
  Contact
</a>
          </nav>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
       <HeroSection
  facebookUrl={facebookUrl}
  setFacebookUrl={setFacebookUrl}
  onImportListing={importListing}
/>
{importLoading && (
  <section className="rounded-3xl border border-cyan-900 bg-cyan-950/20 p-7">
    <p className="font-bold text-cyan-400">Importing listing...</p>
    <p className="mt-2 text-sm text-zinc-400">
      DealHaus is reviewing the marketplace page and preparing your preview.
    </p>
  </section>
)}

{importPreview && !importLoading && (
  <section className="rounded-3xl border border-green-800 bg-green-950/20 p-7">
    <p className="text-sm font-bold uppercase text-green-400">
      Imported Listing Preview
    </p>

    <h2 className="mt-2 text-3xl font-black">
      {importPreview.import?.listing_title ||
        importPreview.import?.title ||
        "Imported Marketplace Listing"}
    </h2>
    {!sellerForm.title && !sellerForm.price && (
  <div className="mt-5 rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5">
    <p className="font-black text-yellow-300">
      This marketplace did not share the listing details
    </p>

    <p className="mt-2 text-sm leading-6 text-yellow-100/80">
      Facebook and OfferUp sometimes block automatic listing extraction.
      Please enter the item title, price, description, and photos below so
      DealHaus can review your item.
    </p>
  </div>
)}

    <div className="mt-6">
  <div className="rounded-2xl border border-zinc-800 bg-black p-5">
    <p className="text-xs font-bold uppercase text-zinc-500">
      Platform
    </p>
    <p className="mt-2 font-bold capitalize">
      {importPreview.platform || "Marketplace"}
    </p>
  </div>
</div>

    {(importPreview.import?.listing_description ||
      importPreview.import?.description) && (
      <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-5">
        <p className="text-xs font-bold uppercase text-zinc-500">
          Description
        </p>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
          {importPreview.import?.listing_description ||
            importPreview.import?.description}
        </p>
      </div>
    )}

  <div className="mt-8 space-y-6">


  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    <div>
      <label className="mb-2 block text-sm font-bold">
        Listing Title
      </label>

      <input
        value={sellerForm.title}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            title: e.target.value,
          })
        }
        placeholder="Example: 6 Piece Outdoor Patio Set"
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-bold">
        Price
      </label>

      <input
        type="number"
        value={sellerForm.price}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            price: e.target.value,
          })
        }
        placeholder="Example: 450"
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />
    </div>

  </div>

  <div>

    <label className="mb-2 block text-sm font-bold">
      Description
    </label>

    <textarea
      rows={6}
      value={sellerForm.description}
      onChange={(e) =>
        setSellerForm({
          ...sellerForm,
          description: e.target.value,
        })
      }
      placeholder="Describe the condition, dimensions, age, included items, and any important details."
      className="w-full rounded-xl border border-zinc-700 bg-black p-3"
    />

  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    <div>

      <label className="mb-2 block text-sm font-bold">
        Category
      </label>

      <input
        value={sellerForm.category}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            category: e.target.value,
          })
        }
        placeholder="Example: Furniture, Electronics, Appliances"
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />

    </div>

    <div>

      <label className="mb-2 block text-sm font-bold">
        Condition
      </label>

      <input
        value={sellerForm.condition}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            condition: e.target.value,
          })
        }
        placeholder="Example: New, Like New, Good, Fair"
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />
      </div>
    </div>
<div>
  <label className="mb-2 block text-sm font-bold">
    Detected Location
  </label>

  <input
    value={sellerForm.location}
    onChange={(e) =>
      setSellerForm({
        ...sellerForm,
        location: e.target.value,
      })
    }
    placeholder="Automatically detected marketplace location"
    className="w-full rounded-xl border border-zinc-700 bg-black p-3"
  />
</div>

<div className="grid grid-cols-1 gap-5 md:grid-cols-3">
  <div>
    <label className="mb-2 block text-sm font-bold">
      City
    </label>

    <input
      value={sellerForm.sellerCity}
      onChange={(e) =>
        setSellerForm({
          ...sellerForm,
          sellerCity: e.target.value,
        })
      }
      placeholder="Las Vegas"
      className="w-full rounded-xl border border-zinc-700 bg-black p-3"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm font-bold">
      State
    </label>

    <input
      value={sellerForm.sellerState}
      onChange={(e) =>
        setSellerForm({
          ...sellerForm,
          sellerState: e.target.value,
        })
      }
      placeholder="NV"
      className="w-full rounded-xl border border-zinc-700 bg-black p-3"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm font-bold">
      ZIP Code
    </label>

    <input
      value={sellerForm.sellerZip}
      onChange={(e) =>
        setSellerForm({
          ...sellerForm,
          sellerZip: e.target.value,
        })
      }
      placeholder="89101"
      className="w-full rounded-xl border border-zinc-700 bg-black p-3"
    />
  </div>
</div>
  <div className="rounded-2xl border border-zinc-800 bg-black p-5">
    <p className="font-bold">Listing Photos</p>
    <p className="mt-2 text-sm text-zinc-400">
      Photos imported automatically will be kept. You can also add your own photos before submitting.
    </p>

    {importedPhotoUrls.length > 0 && (
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {importedPhotoUrls.map((url) => (
          <img
            key={url}
            src={url}
            alt="Imported marketplace listing"
            className="h-28 w-full rounded-xl object-cover"
          />
        ))}
      </div>
    )}

    <div className="mt-5">
      <label className="mb-2 block text-sm font-bold">
        Add Photos
      </label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setNewPhotos(Array.from(e.target.files || []))}
        className="block w-full text-sm text-zinc-300"
      />
      {newPhotos.length > 0 && (
        <p className="mt-2 text-sm text-green-400">
          {newPhotos.length} photo{newPhotos.length === 1 ? "" : "s"} selected.
        </p>
      )}
    </div>
  </div>

  <hr className="border-zinc-700" />

  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    <div>

      <label className="mb-2 block text-sm font-bold">
        Your Name
      </label>

      <input
        value={sellerForm.sellerName}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            sellerName: e.target.value,
          })
        }
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />

    </div>

    <div>

      <label className="mb-2 block text-sm font-bold">
        Email
      </label>

      <input
        type="email"
        value={sellerForm.sellerEmail}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            sellerEmail: e.target.value,
          })
        }
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />

    </div>

  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    <div>

      <label className="mb-2 block text-sm font-bold">
        Phone
      </label>

      <input
        value={sellerForm.sellerPhone}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            sellerPhone: e.target.value,
          })
        }
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      />

    </div>

    <div>

      <label className="mb-2 block text-sm font-bold">
        Preferred Contact
      </label>

      <select
        value={sellerForm.preferredContact}
        onChange={(e) =>
          setSellerForm({
            ...sellerForm,
            preferredContact: e.target.value,
          })
        }
        className="w-full rounded-xl border border-zinc-700 bg-black p-3"
      >
        <option value="text">Text</option>
        <option value="call">Call</option>
        <option value="email">Email</option>
      </select>

    </div>

  </div>
{confirmSuccess && (
  <div className="rounded-2xl border border-green-700 bg-green-950/40 p-5">
    <p className="font-black text-green-400">Submission complete</p>
    <p className="mt-2 text-sm text-zinc-300">{confirmSuccess}</p>
  </div>
)}
  <div className="flex flex-wrap gap-3 pt-4">

    <button
  type="button"
  onClick={confirmImportedListing}
  disabled={confirmLoading || Boolean(confirmSuccess)}
  className="rounded-xl bg-green-600 px-6 py-4 font-black text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
>
  {confirmLoading
    ? "Submitting..."
    : confirmSuccess
      ? "Submitted"
      : "Confirm and Continue"}
</button>

    <button
      type="button"
      onClick={() => {
        setImportPreview(null);
        setImportedPhotoUrls([]);
        setNewPhotos([]);
      }}
      className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white"
    >
      Cancel
    </button>

  </div>

</div>
  </section>
)}
      <section
  id="sellers"
  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7"
>
  <p className="text-cyan-400 text-sm font-bold uppercase">
    Why Choose DealHaus
  </p>

  <h2 className="mt-2 text-3xl font-black">
    Built to help local sellers win.
  </h2>

  <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-5">
    <InfoCard
      eyebrow="AI Pricing"
      title="Smarter selling strategy"
      text="DealHaus reviews pricing, demand, resale potential, and buyer interest before helping move your item forward."
    />

    <InfoCard
      eyebrow="Buyer Support"
      title="Less ghosting. More serious interest."
      text="We help organize buyer outreach, conversations, negotiations, and next steps so sellers are not handling everything alone."
    />

    <InfoCard
      eyebrow="Success Based"
      title="No upfront listing fee"
      text="DealHaus earns only when a deal successfully closes, keeping the service aligned with the seller."
    />
  </div>
</section>

        <section id="how" className="space-y-6">
          <h2 className="text-center text-3xl font-black">How DealHaus Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            <StepCard number="1" title="Submit Item" text="Tell us about your item or paste your listing link." />
            <StepCard number="2" title="We Review" text="DealHaus reviews demand, condition, and pricing." />
            <StepCard number="3" title="We Market It" text="We help position and promote your item." />
            <StepCard number="4" title="We Manage Buyers" text="We help organize inquiries and serious interest." />
            <StepCard number="5" title="You Close Deal" text="You approve the deal. We earn only when it sells." />
          </div>
        </section>

        <section className="rounded-3xl border border-green-900 bg-green-950/20 p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-3xl font-black">Ready to sell or ask about a deal?</h2>
            <p className="mt-2 text-zinc-400">
              Start by submitting your item or browsing available marketplace deals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <a
              href="/marketplace"
              className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white"
            >
              Browse Deals
            </a>
          </div>
        </section>
<section
  id="about"
  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7"
>
  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
    <div>
      <p className="text-cyan-400 text-sm font-bold uppercase">
        Why Sellers Choose DealHaus
      </p>

      <h2 className="mt-2 text-3xl font-black">
        Marketplace selling, made easier.
      </h2>
    </div>

    <p className="max-w-2xl text-zinc-400">
      DealHaus helps sellers save time, improve presentation, organize buyer
      interest, and move listings forward with a success-based approach.
    </p>
  </div>

  <div className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      ["No Upfront Listing Fee", "Submit your item for review without paying before it sells."],
      ["AI-Assisted Pricing", "We help evaluate pricing, demand, and resale opportunity."],
      ["Marketplace Reach", "DealHaus can help support Facebook Marketplace, OfferUp, Craigslist, and more."],
      ["Buyer Interest Organized", "We help track serious interest and reduce unnecessary back-and-forth."],
      ["Built on Integrity", "Clear communication, honest expectations, and a service-first approach."],
      ["Success-Based Commission", "DealHaus earns only when a deal successfully closes."],
    ].map(([title, text]) => (
      <div
        key={title}
        className="rounded-2xl border border-zinc-800 bg-black p-5"
      >
        <p className="text-green-400 font-black">✓ {title}</p>
        <p className="mt-2 text-sm text-zinc-400">{text}</p>
      </div>
    ))}
  </div>
</section>

        <section id="deals">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-3xl font-black">Latest Active Listings</h2>
            <a
  href="/marketplace"
  className="text-cyan-400 text-sm font-bold hover:text-cyan-300"
>
  View all deals →
</a>

          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {listings.map((item) => (
              <a
  href={`/marketplace/${item.id}`}
                key={item.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-cyan-500"
              >
                <img
                  src={
                    item.image ||
                    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop"
                  }
                  alt={item.title || "DealHaus listing"}
                  className="h-36 w-full object-cover"
                />

                <div className="p-4">
                  <p className="text-green-400 font-black">
                    ${Number(item.price || 0).toLocaleString()}
                  </p>
                  <h3 className="mt-2 font-bold text-sm leading-snug">
                    {item.title || "DealHaus Listing"}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.seller_city || "Location pending"} {item.seller_state || ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
<section className="border-y border-zinc-800 py-6">
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-center">

    <div>
      <p className="text-xl font-black text-white">
        ⭐⭐⭐⭐⭐ 5.0 Rating
      </p>

      <p className="text-sm text-zinc-400 mt-1">
        200+ verified marketplace reviews
      </p>

      <p className="text-sm text-zinc-500 mt-3">
        📍 Las Vegas, Nevada
      </p>

      <p className="text-sm text-zinc-500">
        🏆 Established 2026
      </p>
    </div>

    <div>
      <p className="font-bold text-cyan-400">
        DealHaus AI Marketplace Brokerage
      </p>

      <p className="text-sm text-zinc-400 mt-2">
        AI-powered pricing, buyer matching, negotiations, and marketplace management.
      </p>
    </div>

    <div className="flex flex-col gap-3 lg:items-end">

      <a
        href="/faq"
        className="font-bold text-cyan-400 hover:text-cyan-300"
      >
        Frequently Asked Questions →
      </a>

      <a
  href="https://mail.google.com/mail/u/0/?view=cm&fs=1&to=hello@dealhaus.us"
  target="_blank"
  rel="noopener noreferrer"
  className="hover:text-cyan-300 transition-colors"
>
  hello@dealhaus.us
</a>

    </div>

  </div>
</section>

        <section id="contact" 
        className="grid grid-cols-1 md:grid-cols-4 gap-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <TrustItem 
          title="Trusted Local Business" 
          text="Built by an experienced local seller serving the community." 
          />
          <TrustItem 
          title="Secure & Private" text="Your information is handled carefully and shared only as needed." 
          />
          <TrustItem 
          title="Only Pay on Success" text="No upfront listing fee. We earn when your item sells." 
          />
          <TrustItem 
          title="Real People, Real Help" text="DealHaus helps coordinate the process with you." 
          />

        </section>
        <footer className="mt-12 border-t border-zinc-800 pt-10 pb-8">

  <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

    <div>
      <h2 className="text-3xl font-black">
        DealHaus <span className="text-cyan-400">AI</span>
      </h2>

      <p className="mt-4 text-zinc-400 text-sm">
        AI-powered marketplace brokerage helping local buyers and sellers
        connect faster.
      </p>

      <p className="mt-5 text-xs text-zinc-500">
       Helping You Sell Smarter.
    <br />
 Built on Integrity. Guided by Faith.
      </p>
    </div>

   <div>
  <h3 className="font-bold mb-3">
    Marketplace
  </h3>

 <ul className="space-y-2 text-sm text-zinc-400">
  <li><a href="/marketplace" className="hover:text-cyan-400">Browse Listings</a></li>
  <li><a href="/submit" className="hover:text-cyan-400">Sell an Item</a></li>
  <li><a href="/faq" className="hover:text-cyan-400">Buyer Guide</a></li>
  <li><a href="/faq" className="hover:text-cyan-400">Seller Guide</a></li>
</ul>
</div>

    <div>
      <h3 className="font-bold mb-3">
        Company
      </h3>

      <ul className="space-y-2 text-sm text-zinc-400">
  <li><a href="/launch#about" className="hover:text-cyan-400">About DealHaus</a></li>
  <li><a href="/faq" className="hover:text-cyan-400">Help Center</a></li>
  <li><a href="/contact" className="hover:text-cyan-400">Contact</a></li>
  <li><a href="/privacy" className="hover:text-cyan-400">Privacy Policy</a></li>
  <li><a href="/terms" className="hover:text-cyan-400">Terms of Service</a></li>
</ul>
    </div>

    <div>
      <h3 className="font-bold mb-3">
        Trust
      </h3>

      <ul className="space-y-2 text-sm text-zinc-400">
        <li>⭐⭐⭐⭐⭐ 5.0 Rating</li>
        <li>200+ Marketplace Reviews</li>
        <li>Las Vegas, Nevada</li>
        <li>Established 2026</li>
      </ul>
    </div>

  </div>

  <div className="mt-10 border-t border-zinc-800 pt-6 flex flex-col md:flex-row justify-between gap-4 text-xs text-zinc-500">

    <p>
      © 2026 DealHaus AI. All rights reserved.
    </p>

    <div className="text-right">
  <p>AI Marketplace Brokerage • Las Vegas, Nevada</p>

  <div className="mt-1 flex flex-wrap justify-end items-center gap-2 text-cyan-400">

    <a
      href="mailto:hello@dealhaus.us"
      className="hover:text-cyan-300 transition-colors"
    >
      hello@dealhaus.us
    </a>

    <span className="text-zinc-500">•</span>

    <a
      href="tel:+17026081303"
      className="hover:text-cyan-300 transition-colors"
    >
      (702) 608-1303
    </a>

  </div>
</div>

  </div>

</footer>
      </div>
    </main>
  );
}

function InfoCard({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-cyan-400 text-sm font-bold">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-black">{title}</h3>
      <p className="mt-3 text-zinc-400">{text}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="h-9 w-9 rounded-full bg-cyan-400 text-black flex items-center justify-center font-black">
        {number}
      </div>
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function TrustItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  );
}