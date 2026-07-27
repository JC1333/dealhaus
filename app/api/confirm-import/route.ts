import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ConfirmImportRequest = {
  importId?: string;
  title?: string;
  price?: string | number;
  description?: string;
  category?: string;
  condition?: string;
  location?: string;
  sellerCity?: string;
  sellerState?: string;
  sellerZip?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  preferredContact?: string;
  photoUrls?: unknown;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanPhotoUrls(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" &&
          /^https?:\/\//i.test(item.trim())
      )
    )
  ).slice(0, 20);
}

export async function POST(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ConfirmImportRequest;

    const importId = cleanText(body.importId);
    const title = cleanText(body.title);
    const price = cleanPrice(body.price);
    const description = cleanText(body.description);
    const category = cleanText(body.category);
    const condition = cleanText(body.condition);
    const location = cleanText(body.location);
    const sellerCity = cleanText(body.sellerCity);
    const sellerState = cleanText(body.sellerState);
    const sellerZip = cleanText(body.sellerZip);
    const sellerName = cleanText(body.sellerName);
    const sellerEmail = cleanText(body.sellerEmail).toLowerCase();
    const sellerPhone = cleanText(body.sellerPhone);
    const preferredContact = cleanText(body.preferredContact).toLowerCase();
    const submittedPhotoUrls = cleanPhotoUrls(body.photoUrls);

    const missingFields: string[] = [];

    if (!importId) missingFields.push("import ID");
    if (!title) missingFields.push("listing title");
    if (!price) missingFields.push("price");
    if (!sellerCity) missingFields.push("city");
    if (!sellerState) missingFields.push("state");
    if (!sellerName) missingFields.push("seller name");
    if (!sellerEmail) missingFields.push("email");
    if (!sellerPhone) missingFields.push("phone");
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Please complete: ${missingFields.join(", ")}.` },
        { status: 400 }
      );
    }

    if (!validEmail(sellerEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!["text", "call", "email"].includes(preferredContact)) {
      return NextResponse.json(
        { error: "Select text, call, or email as the preferred contact method." },
        { status: 400 }
      );
    }

    const { data: existingImport, error: importLookupError } =
      await supabase
        .from("marketplace_imports")
        .select("id,listing_url,detected_platform,seller_confirmed,image_urls")
        .eq("id", importId)
        .single();

    if (importLookupError || !existingImport) {
      return NextResponse.json(
        {
          error:
            importLookupError?.message ||
            "The marketplace import could not be found.",
        },
        { status: 404 }
      );
    }

    if (existingImport.seller_confirmed) {
      return NextResponse.json(
        { error: "This marketplace import has already been confirmed." },
        { status: 409 }
      );
    }

    const existingPhotoUrls = cleanPhotoUrls(existingImport.image_urls);
    const finalPhotoUrls = Array.from(
      new Set([...existingPhotoUrls, ...submittedPhotoUrls])
    ).slice(0, 20);

    const { error: importUpdateError } = await supabase
      .from("marketplace_imports")
      .update({
        listing_title: title,
        listing_description: description || null,
        listing_price: price,
        listing_location: location || null,
        category: category || null,
        item_condition: condition || null,
        image_urls: finalPhotoUrls,
        seller_name: sellerName,
        seller_email: sellerEmail,
        seller_phone: sellerPhone,
        seller_city: sellerCity,
        seller_state: sellerState,
        seller_zip: sellerZip || null,
        preferred_contact_method: preferredContact,
        marketplace_listing_url: existingImport.listing_url || null,
        seller_confirmed: true,
        import_status: "confirmed",
        import_notes:
          "Seller reviewed and confirmed the imported marketplace listing.",
      })
      .eq("id", importId);

    if (importUpdateError) {
      return NextResponse.json(
        { error: importUpdateError.message },
        { status: 500 }
      );
    }

    const { data: sellerLead, error: sellerLeadError } = await supabase
      .from("seller_leads")
      .insert({
        item_title: title,
        item_description: description || null,
        asking_price: price,
        seller_name: sellerName,
seller_email: sellerEmail,
seller_phone: sellerPhone,
seller_city: sellerCity || null,
seller_state: sellerState || null,
seller_zip: sellerZip || null,
preferred_contact_method: preferredContact,
photo_urls: finalPhotoUrls,
        lead_source: existingImport.detected_platform
          ? `${existingImport.detected_platform} Import`
          : "Marketplace URL Import",
        lead_status: "new",
        approval_status: "not_approved",
        agreement_accepted: false,
        commission_rate: 10,
        ai_score: 80,
        acquisition_score: 80,
        lead_priority: "medium",
        outreach_status: "not_contacted",
        acquisition_reason: [
          "Marketplace import confirmed by seller.",
          category ? `Category: ${category}.` : "",
          condition ? `Condition: ${condition}.` : "",
          sellerCity || sellerState || sellerZip
  ? `Location: ${[
      sellerCity,
      sellerState,
      sellerZip,
    ]
      .filter(Boolean)
      .join(", ")}.`
  : location
    ? `Location: ${location}.`
    : "",
          existingImport.listing_url
            ? `Source listing: ${existingImport.listing_url}.`
            : "",
          finalPhotoUrls.length > 0
            ? `Photos: ${finalPhotoUrls.length} attached.`
            : "No photos were provided.",
        ]
          .filter(Boolean)
          .join(" "),
      })
      .select("id,item_title")
      .single();

    if (sellerLeadError) {
      await supabase
        .from("marketplace_imports")
        .update({
          seller_confirmed: false,
          import_status: "confirmation_failed",
          import_notes: `Seller lead creation failed: ${sellerLeadError.message}`,
        })
        .eq("id", importId);

      return NextResponse.json(
        { error: sellerLeadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "seller_lead_created",
      importId,
      sellerLeadId: sellerLead.id,
      itemTitle: sellerLead.item_title,
      photoCount: finalPhotoUrls.length,
      message:
        "Your listing was submitted successfully and is now ready for DealHaus review.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "The imported listing could not be confirmed.";

    console.error("Confirm marketplace import error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
