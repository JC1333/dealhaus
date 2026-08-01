import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import {
  fetchFacebookListingWithApify,
  getFacebookListingCondition,
  getFacebookListingPrice,
} from "@/lib/facebook-marketplace-import";

export const runtime = "nodejs";

type ImportRequest = {
  listingUrl?: string;
};

type ExtractedListing = {
  title: string;
  description: string;
  price: number | null;
  location: string;
  imageUrls: string[];
  category: string;
  condition: string;
};

type MarketplacePlatform =
  | "Facebook Marketplace"
  | "OfferUp"
  | "Craigslist";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function detectPlatform(url: URL): MarketplacePlatform | null {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname === "fb.com" ||
    hostname.endsWith(".fb.com")
  ) {
    return "Facebook Marketplace";
  }

  if (
    hostname === "offerup.com" ||
    hostname.endsWith(".offerup.com")
  ) {
    return "OfferUp";
  }

  if (
    hostname === "craigslist.org" ||
    hostname.endsWith(".craigslist.org")
  ) {
    return "Craigslist";
  }

  return null;
}

function isUnsafeHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  );
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .trim();
}

function getMetaContent(html: string, names: string[]) {
  for (const name of names) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapedName}["'][^>]*>`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);

      if (match?.[1]) {
        return decodeHtml(match[1]);
      }
    }
  }

  return "";
}

function getTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match?.[1]
    ? decodeHtml(match[1].replace(/\s+/g, " "))
    : "";
}

function stripHtml(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).slice(0, 12000);
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/[^0-9.]/g, "");
  const numberValue = Number(cleaned);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : null;
}

function collectJsonLd(html: string) {
  const results: unknown[] = [];
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    try {
      results.push(JSON.parse(match[1].trim()));
    } catch {
      // Ignore malformed third-party JSON-LD.
    }
  }

  return results;
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const graph = record["@graph"];

  if (Array.isArray(graph)) {
    return [record, ...graph.flatMap(flattenJsonLd)];
  }

  return [record];
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getImageUrls(value: unknown) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [item];

        if (
          item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).url === "string"
        ) {
          return [
            String((item as Record<string, unknown>).url),
          ];
        }

        return [];
      })
      .filter(Boolean);
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).url === "string"
  ) {
    return [String((value as Record<string, unknown>).url)];
  }

  return [];
}

function extractListingFromHtml(html: string): ExtractedListing {
  const jsonLdRecords = collectJsonLd(html).flatMap(flattenJsonLd);

  const productRecord =
    jsonLdRecords.find((record) => {
      const type = record["@type"];

      return (
        type === "Product" ||
        type === "Offer" ||
        (Array.isArray(type) &&
          (type.includes("Product") || type.includes("Offer")))
      );
    }) || {};

  const offer =
    productRecord.offers &&
    typeof productRecord.offers === "object"
      ? (Array.isArray(productRecord.offers)
          ? productRecord.offers[0]
          : productRecord.offers) as Record<string, unknown>
      : {};

  const title =
    getString(productRecord.name) ||
    getMetaContent(html, [
      "og:title",
      "twitter:title",
    ]) ||
    getTitleTag(html);

  const description =
    getString(productRecord.description) ||
    getMetaContent(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);

  const metaPrice = getMetaContent(html, [
    "product:price:amount",
    "og:price:amount",
  ]);

  const price =
    parsePrice(offer.price) ||
    parsePrice(productRecord.price) ||
    parsePrice(metaPrice) ||
    parsePrice(
      html.match(
        /(?:\$|USD\s*)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i
      )?.[1]
    );

  const jsonLdImages = getImageUrls(productRecord.image);
  const metaImage = getMetaContent(html, [
    "og:image",
    "twitter:image",
  ]);

  const imageUrls = Array.from(
    new Set(
      [...jsonLdImages, metaImage]
        .map((image) => image.trim())
        .filter((image) => /^https?:\/\//i.test(image))
    )
  ).slice(0, 12);

  const location =
    getMetaContent(html, [
      "place:location:locality",
      "geo.placename",
    ]) || "";

  const category = getString(productRecord.category);
  const condition =
    getString(productRecord.itemCondition)
      .split("/")
      .pop() || "";

  return {
    title,
    description,
    price,
    location,
    imageUrls,
    category,
    condition,
  };
}

async function normalizeWithAi(args: {
  platform: MarketplacePlatform;
  listingUrl: string;
  extracted: ExtractedListing;
  pageText: string;
}): Promise<ExtractedListing> {
  if (!openai) {
    return args.extracted;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.1,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You extract marketplace listing details. Return valid JSON only. Never invent missing facts. Use null or an empty string when unknown.",
      },
      {
        role: "user",
        content: `
Extract and normalize this marketplace listing.

Platform: ${args.platform}
URL: ${args.listingUrl}

Already extracted:
${JSON.stringify(args.extracted, null, 2)}

Visible page text:
${args.pageText.slice(0, 8000)}

Return exactly this JSON structure:
{
  "title": "string",
  "description": "string",
  "price": number or null,
  "location": "string",
  "imageUrls": ["https://..."],
  "category": "string",
  "condition": "string"
}

Rules:
- Do not invent facts.
- Preserve the seller's actual item details.
- Remove website navigation, login prompts, ads, and unrelated text.
- Price must be numeric with no currency symbol.
- Include only real HTTP or HTTPS image URLs already present in the supplied data.
        `.trim(),
      },
    ],
  });

  const content =
    completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content) as Partial<ExtractedListing>;

    return {
      title: getString(parsed.title) || args.extracted.title,
      description:
        getString(parsed.description) ||
        args.extracted.description,
      price:
        parsePrice(parsed.price) ??
        args.extracted.price,
      location:
        getString(parsed.location) ||
        args.extracted.location,
      imageUrls: Array.from(
        new Set([
          ...(Array.isArray(parsed.imageUrls)
            ? parsed.imageUrls.filter(
                (item): item is string =>
                  typeof item === "string" &&
                  /^https?:\/\//i.test(item)
              )
            : []),
          ...args.extracted.imageUrls,
        ])
      ).slice(0, 12),
      category:
        getString(parsed.category) ||
        args.extracted.category,
      condition:
        getString(parsed.condition) ||
        args.extracted.condition,
    };
  } catch {
    return args.extracted;
  }
}

function calculateAiScore(listing: ExtractedListing) {
  let score = 45;

  if (listing.title) score += 15;
  if (listing.description.length >= 40) score += 10;
  if (listing.price && listing.price > 0) score += 10;
  if (listing.location) score += 5;
  if (listing.imageUrls.length > 0) score += 10;
  if (listing.category) score += 3;
  if (listing.condition) score += 2;

  return Math.min(score, 100);
}

async function saveImport(args: {
  platform: MarketplacePlatform;
  listingUrl: string;
  listing: ExtractedListing;
  status: string;
  extractionMethod: string;
  extractionError: string;
  rawPageText: string;
  existingImportId?: string | null;
}) {
  if (!supabase) {
    return {
      data: null,
      error: "Supabase environment variables are missing.",
    };
  }

  const aiScore = calculateAiScore(args.listing);

  const payload = {
    source_name: args.platform,
    detected_platform: args.platform,
    listing_url: args.listingUrl,
    listing_title: args.listing.title || null,
    listing_description: args.listing.description || null,
    listing_price: args.listing.price,
    listing_location: args.listing.location || null,
    image_urls: args.listing.imageUrls,
    category: args.listing.category || null,
    item_condition: args.listing.condition || null,
    import_status: args.status,
    ai_score: aiScore,
    extraction_method: args.extractionMethod,
    extraction_error: args.extractionError || null,
    raw_page_text: args.rawPageText.slice(0, 12000) || null,
    import_notes:
      args.status === "preview_ready"
        ? `Listing data extracted and scored ${aiScore}/100. Seller review is required before creating the seller lead.`
        : "The marketplace blocked or limited automatic extraction. Seller-assisted details are required.",
    seller_confirmed: false,
  };

  if (args.existingImportId) {
    const { data, error } = await supabase
      .from("marketplace_imports")
      .update(payload)
      .eq("id", args.existingImportId)
      .select()
      .single();

    return {
      data,
      error: error?.message || null,
    };
  }

  const { data, error } = await supabase
    .from("marketplace_imports")
    .insert(payload)
    .select()
    .single();

  return {
    data,
    error: error?.message || null,
  };
}

async function findExistingImport(listingUrl: string) {
  if (!supabase) {
    return {
      data: null,
      reusableImportId: null,
      error: "Supabase environment variables are missing.",
    };
  }

  const { data: imports, error: importError } = await supabase
    .from("marketplace_imports")
    .select(
      "id, import_status, seller_confirmed, listing_title, seller_email"
    )
    .eq("listing_url", listingUrl)
    .order("created_at", { ascending: false })
    .limit(1);

  if (importError) {
    return {
      data: null,
      reusableImportId: null,
      error: importError.message,
    };
  }

  const latestImport = imports?.[0] || null;

  if (!latestImport) {
    return {
      data: null,
      reusableImportId: null,
      error: null,
    };
  }

  const retryableStatuses = [
    "preview_ready",
    "needs_seller_input",
    "confirmation_failed",
  ];

  if (
    !latestImport.seller_confirmed &&
    retryableStatuses.includes(latestImport.import_status || "")
  ) {
    return {
      data: null,
      reusableImportId: latestImport.id,
      error: null,
    };
  }

  if (!latestImport.seller_confirmed) {
    return {
      data: latestImport,
      reusableImportId: null,
      error: null,
    };
  }

  const { data: activeSellerLeads, error: sellerLeadError } =
    await supabase
      .from("seller_leads")
      .select("id")
      .eq("item_title", latestImport.listing_title || "")
      .neq("lead_status", "archived")
      .neq("status", "archived")
      .limit(1);

  if (sellerLeadError) {
    return {
      data: null,
      reusableImportId: null,
      error: sellerLeadError.message,
    };
  }

  if (activeSellerLeads && activeSellerLeads.length > 0) {
    return {
      data: latestImport,
      reusableImportId: null,
      error: null,
    };
  }

  return {
    data: null,
    reusableImportId: null,
    error: null,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImportRequest;
    const listingUrl = body.listingUrl?.trim();

    if (!listingUrl) {
      return NextResponse.json(
        {
          error: "A marketplace listing URL is required.",
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(listingUrl);
    } catch {
      return NextResponse.json(
        {
          error: "Enter a valid marketplace URL.",
        },
        { status: 400 }
      );
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      isUnsafeHostname(parsedUrl.hostname)
    ) {
      return NextResponse.json(
        {
          error: "This URL cannot be imported.",
        },
        { status: 400 }
      );
    }

    const platform = detectPlatform(parsedUrl);

    if (!platform) {
      return NextResponse.json(
        {
          error:
            "DealHaus currently supports Facebook Marketplace, OfferUp, and Craigslist URLs.",
        },
        { status: 400 }
      );
    }
    const existingImport = await findExistingImport(
      parsedUrl.toString()
    );

    if (existingImport.error) {
      return NextResponse.json(
        {
          error: existingImport.error,
        },
        { status: 500 }
      );
    }

    if (existingImport.data) {
      const duplicateMessage =
        "This marketplace listing has already been submitted to DealHaus.";

      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          importId: existingImport.data.id,
          status: existingImport.data.import_status,
          sellerConfirmed:
            existingImport.data.seller_confirmed,
          error: duplicateMessage,
          message: duplicateMessage,
        },
        { status: 409 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      12000
    );

    let html = "";
    let fetchError = "";
    let responseStatus = 0;

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      responseStatus = response.status;

      if (!response.ok) {
        fetchError = `Marketplace returned HTTP ${response.status}.`;
      } else {
        html = await response.text();
      }
    } catch (error: unknown) {
      fetchError =
        error instanceof Error
          ? error.message
          : "Marketplace page could not be retrieved.";
    } finally {
      clearTimeout(timeoutId);
    }

    if (!html) {
      if (platform === "Facebook Marketplace") {
        try {
          const facebookListing =
            await fetchFacebookListingWithApify(
              parsedUrl.toString()
            );

          const imageUrls =
            Array.isArray(facebookListing?.images)
              ? facebookListing.images.filter(
                  (url): url is string =>
                    typeof url === "string" &&
                    /^https?:\/\//i.test(url)
                )
              : [];

          if (
            facebookListing &&
            imageUrls.length > 0
          ) {
            const apifyListing: ExtractedListing = {
              title: String(
                facebookListing.title || ""
              ).trim(),
              description: String(
                facebookListing.description || ""
              ).trim(),
              price: getFacebookListingPrice(
                facebookListing
              ),
              location: String(
                facebookListing.location?.full || ""
              ).trim(),
              imageUrls,
              category: "",
              condition:
                getFacebookListingCondition(
                  facebookListing
                ),
            };

            const saved = await saveImport({
              platform,
              listingUrl: parsedUrl.toString(),
              listing: apifyListing,
              status: "preview_ready",
              extractionMethod:
                "apify_facebook_fallback",
              extractionError: "",
              rawPageText: "",
              existingImportId:
                existingImport.reusableImportId,
            });

            if (saved.error) {
              return NextResponse.json(
                { error: saved.error },
                { status: 500 }
              );
            }

            return NextResponse.json({
              success: true,
              importId: saved.data?.id,
              platform,
              status: "preview_ready",
              extractionMethod:
                "apify_facebook_fallback",
              message:
                "Facebook listing details and photos were imported.",
              listing: apifyListing,
            });
          }
        } catch (apifyError) {
          console.error(
            "Facebook Apify import fallback failed:",
            apifyError
          );
        }
      }

      const emptyListing: ExtractedListing = {
        title: "",
        description: "",
        price: null,
        location: "",
        imageUrls: [],
        category: "",
        condition: "",
      };

      const saved = await saveImport({
        platform,
        listingUrl: parsedUrl.toString(),
        listing: emptyListing,
        status: "needs_seller_input",
        extractionMethod: "seller_assisted_fallback",
        extractionError:
          fetchError ||
          `Marketplace returned HTTP ${responseStatus}.`,
        rawPageText: "",
        existingImportId: existingImport.reusableImportId,
      });

      if (saved.error) {
        return NextResponse.json(
          {
            error: saved.error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        importId: saved.data?.id,
        platform,
        status: "needs_seller_input",
        extractionMethod: "seller_assisted_fallback",
        message:
          "This marketplace limited automatic access. Add or confirm the listing details to continue.",
        listing: emptyListing,
      });
    }

    const pageText = stripHtml(html);
    const extracted = extractListingFromHtml(html);

    let normalized = extracted;

    try {
      normalized = await normalizeWithAi({
        platform,
        listingUrl: parsedUrl.toString(),
        extracted,
        pageText,
      });
    } catch (error: unknown) {
      console.error(
        "Marketplace import AI normalization error:",
        error
      );
    }

    const hasUsefulData =
      Boolean(normalized.title) ||
      Boolean(normalized.description) ||
      Boolean(normalized.price) ||
      normalized.imageUrls.length > 0;

    const status = hasUsefulData
      ? "preview_ready"
      : "needs_seller_input";

    const extractionMethod = hasUsefulData
      ? "metadata_and_ai"
      : "seller_assisted_fallback";

    const extractionError = hasUsefulData
      ? ""
      : "The page loaded, but usable listing metadata was not available.";

    const saved = await saveImport({
      platform,
      listingUrl: parsedUrl.toString(),
      listing: normalized,
      status,
      extractionMethod,
      extractionError,
      rawPageText: pageText,
      existingImportId: existingImport.reusableImportId,
    });

    if (saved.error) {
      return NextResponse.json(
        {
          error: saved.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      importId: saved.data?.id,
      platform,
      status,
      extractionMethod,
      message:
        status === "preview_ready"
          ? "Listing details were imported. Review and confirm them to continue."
          : "Automatic extraction was limited. Add or confirm the listing details to continue.",
      listing: normalized,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Marketplace import failed.";

    console.error("Marketplace import error:", error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "DealHaus Marketplace Import",
    supportedPlatforms: [
      "Facebook Marketplace",
      "OfferUp",
      "Craigslist",
    ],
    mode: "metadata-first with seller-assisted fallback",
  });
}
