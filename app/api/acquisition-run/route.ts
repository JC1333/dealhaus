import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const APIFY_ACTOR_ID =
  "calm_builder~facebook-marketplace-scraper";

const MIN_ACQUISITION_SCORE = 65;
const MAX_LISTING_AGE_DAYS = 7;
const MAX_AI_CANDIDATES = 60;
const AI_BATCH_SIZE = 15;

/*
 * Initial DealHaus acquisition searches.
 *
 * These are deliberately broader than furniture only.
 * We can expand this list after the first production validation.
 */
const DEALHAUS_SEARCHES: Record<string, string[]> = {
  furniture: [
    "furniture",
    "sectional couch",
    "dining set",
  ],
  electronics: [
    "electronics",
    "tv",
    "gaming console",
  ],
  "home goods": [
    "home goods",
    "mirror",
    "home decor",
  ],
  appliances: [
    "appliances",
    "refrigerator",
    "washer dryer",
  ],
  outdoor: [
    "patio furniture",
    "grill",
    "outdoor equipment",
  ],
  tools: [
    "power tools",
    "tool set",
    "generator",
  ],
};

type FacebookListing = {
  id?: string;
  url?: string;
  title?: string;
  price?: {
    amount?: string | number;
    currency?: string;
    formatted?: string;
  } | null;
  location?: {
    full?: string;
    city?: string;
    state?: string;
    country?: string | null;
    latitude?: number;
    longitude?: number;
  } | null;
  images?: string[];
  creation_time?: {
    timestamp?: number;
    formatted?: string;
    iso?: string;
  } | null;
  is_sold?: boolean;
  is_pending?: boolean;
  is_live?: boolean;
  is_hidden?: boolean;
  description?: string | null;
  seller?: {
    name?: string;
    id?: string;
    url?: string;
  } | null;
  condition?: string | null;
  attribute_data?: Array<{
    attribute_name?: string;
    value?: string;
    label?: string;
  }>;
  renderable_listing_status?: string;
  listing_is_rejected?: boolean;
  is_on_marketplace?: boolean;
  messaging_enabled?: boolean;
  messagingEnabled?: boolean;
  should_show_business_seller_label?: boolean;
  is_seller_business_onboarded?: boolean;
  sourceUrl?: string;
};

type QualifiedLead = {
  marketplace_listing_url: string;
  estimated_resale_price: number | null;
  acquisition_score: number;
  acquisition_reason: string;
  lead_priority: "low" | "medium" | "high";
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function numberOrNull(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/[$,\s]/g, "")
    );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function getListingPrice(listing: FacebookListing) {
  return numberOrNull(listing.price?.amount);
}

function getCondition(listing: FacebookListing) {
  const direct = normalizeText(listing.condition);

  if (direct) {
    return direct;
  }

  const conditionAttribute =
    listing.attribute_data?.find(
      (attribute) =>
        attribute.attribute_name
          ?.toLowerCase()
          .trim() === "condition"
    );

  return (
    normalizeText(conditionAttribute?.label) ||
    normalizeText(conditionAttribute?.value)
  );
}

function isRealFacebookItemUrl(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return (
      hostname === "facebook.com" &&
      /^\/marketplace\/item\/\d+\/?$/i.test(
        parsed.pathname
      )
    );
  } catch {
    return false;
  }
}

function listingCreatedAt(
  listing: FacebookListing
): Date | null {
  const iso = normalizeText(
    listing.creation_time?.iso
  );

  if (iso) {
    const date = new Date(iso);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const timestamp = Number(
    listing.creation_time?.timestamp || 0
  );

  if (timestamp > 0) {
    /*
     * Apify/Facebook timestamps are seconds.
     */
    const date = new Date(timestamp * 1000);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function isFreshListing(
  listing: FacebookListing
) {
  const createdAt = listingCreatedAt(listing);

  if (!createdAt) {
    return false;
  }

  const now = Date.now();
  const created = createdAt.getTime();

  /*
   * Permit a small clock/indexing difference,
   * but reject obviously future-dated records.
   */
  if (created > now + 12 * 60 * 60 * 1000) {
    return false;
  }

  const maxAge =
    MAX_LISTING_AGE_DAYS *
    24 *
    60 *
    60 *
    1000;

  return now - created <= maxAge;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMiles(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadiusMiles = 3958.8;

  const latDiff = degreesToRadians(
    latitude2 - latitude1
  );

  const lonDiff = degreesToRadians(
    longitude2 - longitude1
  );

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(degreesToRadians(latitude1)) *
      Math.cos(
        degreesToRadians(latitude2)
      ) *
      Math.sin(lonDiff / 2) ** 2;

  return (
    2 *
    earthRadiusMiles *
    Math.asin(Math.sqrt(a))
  );
}

function isInRequestedMarket(args: {
  listing: FacebookListing;
  city: string;
  state: string;
  radius: number;
}) {
  const listingCity = normalizeText(
    args.listing.location?.city
  ).toLowerCase();

  const listingState = normalizeText(
    args.listing.location?.state
  ).toLowerCase();

  const requestedCity =
    args.city.toLowerCase();

  const requestedState =
    args.state.toLowerCase();

  /*
   * Current launch market:
   * Las Vegas metro.
   *
   * Because Apify provides coordinates, use
   * actual mileage whenever possible.
   */
  if (
    requestedCity === "las vegas" &&
    ["nv", "nevada"].includes(
      requestedState
    )
  ) {
    const lat =
      args.listing.location?.latitude;

    const lon =
      args.listing.location?.longitude;

    if (
      typeof lat === "number" &&
      typeof lon === "number"
    ) {
      const miles = distanceMiles(
        36.1699,
        -115.1398,
        lat,
        lon
      );

      return miles <= args.radius;
    }
  }

  /*
   * Fallback if exact coordinates are unavailable.
   */
  const stateMatches =
    !requestedState ||
    listingState === requestedState ||
    (requestedState === "nv" &&
      listingState === "nevada") ||
    (requestedState === "nevada" &&
      listingState === "nv");

  if (!stateMatches) {
    return false;
  }

  if (!requestedCity) {
    return true;
  }

  return (
    listingCity === requestedCity ||
    !listingCity
  );
}

function looksCommercialOrBad(
  listing: FacebookListing
) {
  if (
    listing.should_show_business_seller_label ||
    listing.is_seller_business_onboarded
  ) {
    return true;
  }

  const text = `
    ${listing.title || ""}
    ${listing.description || ""}
  `.toLowerCase();

  const rejectionTerms = [
    "financing available",
    "easy financing",
    "financing approved",
    "furniture outlet",
    "warehouse sale",
    "showroom",
    "delivery service",
    "same day delivery service",
    "we finance",
    "apply for financing",
    "monthly payments",
    "dealer",
  ];

  return rejectionTerms.some((term) =>
    text.includes(term)
  );
}

function passesMechanicalFilters(args: {
  listing: FacebookListing;
  city: string;
  state: string;
  radius: number;
}) {
  const listing = args.listing;

  if (
    !listing.url ||
    !isRealFacebookItemUrl(listing.url)
  ) {
    return false;
  }

  if (
    !listing.id ||
    !normalizeText(listing.title)
  ) {
    return false;
  }

  if (
    listing.is_sold === true ||
    listing.is_pending === true ||
    listing.is_live === false ||
    listing.is_hidden === true ||
    listing.listing_is_rejected === true ||
    listing.is_on_marketplace === false
  ) {
    return false;
  }

  if (
    listing.renderable_listing_status &&
    listing.renderable_listing_status !==
      "AVAILABLE"
  ) {
    return false;
  }

  const askingPrice =
    getListingPrice(listing);

  if (
    askingPrice === null ||
    askingPrice < 5
  ) {
    return false;
  }

  if (!isFreshListing(listing)) {
    return false;
  }

  if (
    !isInRequestedMarket({
      listing,
      city: args.city,
      state: args.state,
      radius: args.radius,
    })
  ) {
    return false;
  }

  if (looksCommercialOrBad(listing)) {
    return false;
  }

  return true;
}

function facebookSearchUrl(
  marketSlug: string,
  query: string
) {
  return (
    `https://www.facebook.com/marketplace/` +
    `${marketSlug}/search/?query=` +
    encodeURIComponent(query)
  );
}

function resolveSearchTerms(
  requestedCategory: string
) {
  const normalized =
    requestedCategory
      .trim()
      .toLowerCase();

  if (
    normalized === "all" ||
    normalized === "all categories" ||
    normalized === "dealhaus"
  ) {
    return Object.values(
      DEALHAUS_SEARCHES
    ).flat();
  }

  const exact =
    DEALHAUS_SEARCHES[normalized];

  if (exact) {
    return exact;
  }

  /*
   * Support existing admin category values
   * without breaking the current interface.
   */
  return [requestedCategory];
}

async function startApifyRun(args: {
  token: string;
  searchUrls: string[];
  maxListingsPerSearch: number;
}) {
  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${args.token}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        startUrls:
          args.searchUrls.map((url) => ({
            url,
          })),
        maxListings:
          args.maxListingsPerSearch,
        fetchDetails: true,
        getNewItems: true,
        availability: "available",
        sortBy: "best_match",
        deduplicateListings: true,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Apify run failed to start: ${response.status} ${text}`
    );
  }

  const payload = await response.json();

  return payload.data as ApifyRun;
}

async function waitForApifyRun(args: {
  token: string;
  runId: string;
}) {
  const startedAt = Date.now();
  const timeoutMs = 180000;

  while (
    Date.now() - startedAt < timeoutMs
  ) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${args.runId}`,
      {
        headers: {
          Authorization:
            `Bearer ${args.token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to read Apify run status: ${response.status}`
      );
    }

    const payload = await response.json();
    const run = payload.data as ApifyRun;

    if (run.status === "SUCCEEDED") {
      return run;
    }

    if (
      [
        "FAILED",
        "ABORTED",
        "TIMED-OUT",
      ].includes(run.status)
    ) {
      throw new Error(
        `Apify run ended with status ${run.status}.`
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 3000)
    );
  }

  throw new Error(
    "Apify run did not finish within 3 minutes."
  );
}

async function getApifyDataset(args: {
  token: string;
  datasetId: string;
}) {
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${args.datasetId}/items?clean=true`,
    {
      headers: {
        Authorization:
          `Bearer ${args.token}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to retrieve Apify dataset: ${response.status}`
    );
  }

  const payload = await response.json();

  return Array.isArray(payload)
    ? (payload as FacebookListing[])
    : [];
}

function buildAiCandidate(
  listing: FacebookListing
) {
  return {
    marketplace_listing_url:
      listing.url,
    facebook_item_id:
      listing.id,
    title:
      normalizeText(listing.title),
    description:
      normalizeText(
        listing.description
      ).slice(0, 1800),
    asking_price:
      getListingPrice(listing),
    location:
      listing.location?.full || "",
    city:
      listing.location?.city || "",
    state:
      listing.location?.state || "",
    condition:
      getCondition(listing),
    created_at:
      listing.creation_time?.iso || "",
    photo_count:
      Array.isArray(listing.images)
        ? listing.images.length
        : 0,
  };
}

async function scoreListingsWithAi(
  listings: FacebookListing[]
) {
  const results: QualifiedLead[] = [];

  for (
    let offset = 0;
    offset < listings.length;
    offset += AI_BATCH_SIZE
  ) {
    const batch = listings.slice(
      offset,
      offset + AI_BATCH_SIZE
    );

    const candidates =
      batch.map(buildAiCandidate);

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `
You are the DealHaus Seller Acquisition Agent.

You evaluate REAL Facebook Marketplace listings supplied by DealHaus.

DealHaus helps private sellers sell items and earns a 10% commission when the item sells.

STRICT RULES:
- Never invent a listing or URL.
- Never invent seller identity or contact information.
- Only evaluate the listings supplied.
- Treat asking_price as factual and immutable.
- Reject obvious businesses, dealers, warehouses, delivery services, financing advertisements, scams, junk, misleading listings, or listings with too little information to evaluate.
- Favor private-party listings with strong resale demand and enough room between asking price and realistic market value.
- estimated_resale_price must be a reasonable local-market estimate, not an exaggerated best-case price.
- acquisition_score must be 1-100.
- Scores 80+ should represent unusually strong DealHaus opportunities.
- Scores below 65 are not good enough to enter the acquisition queue.
- acquisition_reason must explain the opportunity and key risk.
- Return only URLs that were supplied.
- Return a maximum of 8 qualified listings from this batch.

Return JSON exactly in this structure:
{
  "leads": [
    {
      "marketplace_listing_url": "exact supplied Facebook URL",
      "estimated_resale_price": 0,
      "acquisition_score": 0,
      "acquisition_reason": "",
      "lead_priority": "low"
    }
  ]
}
            `.trim(),
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                listings: candidates,
              },
              null,
              2
            ),
          },
        ],
      });

    const text =
      completion.choices[0]
        ?.message?.content || "{}";

    try {
      const parsed =
        JSON.parse(text) as {
          leads?: QualifiedLead[];
        };

      if (
        Array.isArray(parsed.leads)
      ) {
        results.push(
          ...parsed.leads
        );
      }
    } catch (error) {
      console.error(
        "AI acquisition scoring JSON error:",
        error
      );
    }
  }

  return results;
}

export async function POST(
  req: Request
) {
  let acquisitionRunId:
    | string
    | null = null;

  try {
    const apifyToken =
      process.env.APIFY_API_TOKEN;

    if (!apifyToken) {
      return NextResponse.json(
        {
          error:
            "APIFY_API_TOKEN is missing.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const city =
      String(
        body.city || "Las Vegas"
      ).trim();

    const state =
      String(
        body.state || "NV"
      ).trim();

    const radius = Math.max(
      5,
      Math.min(
        100,
        Number(body.radius || 25)
      )
    );

    const runType =
      String(
        body.runType || "daily"
      ).trim();

    const requestedCategory =
      String(
        body.category || "all"
      ).trim();

    /*
     * Facebook market slug for current
     * Las Vegas launch market.
     */
    const marketSlug =
      city
        .toLowerCase()
        .replace(/\s+/g, "") ===
      "lasvegas"
        ? "vegas"
        : city
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            );

    const searchTerms =
      resolveSearchTerms(
        requestedCategory
      );

    const searchUrls =
      Array.from(
        new Set(
          searchTerms.map((term) =>
            facebookSearchUrl(
              marketSlug,
              term
            )
          )
        )
      );

    /*
     * 10 per targeted search.
     *
     * All 18 default searches can yield
     * up to ~180 raw records per run.
     */
    const maxListingsPerSearch = 10;

    const {
      data: acquisitionRun,
      error: runInsertError,
    } = await supabase
      .from("acquisition_runs")
      .insert({
        search_city: city,
        search_radius: radius,
        leads_generated: 0,
        status: "running",
      })
      .select()
      .single();

    if (runInsertError) {
      throw new Error(
        runInsertError.message
      );
    }

    acquisitionRunId =
      acquisitionRun.id;

    const startedRun =
      await startApifyRun({
        token: apifyToken,
        searchUrls,
        maxListingsPerSearch,
      });

    const completedRun =
      await waitForApifyRun({
        token: apifyToken,
        runId: startedRun.id,
      });

    const rawListings =
      await getApifyDataset({
        token: apifyToken,
        datasetId:
          completedRun.defaultDatasetId,
      });

    /*
     * First hard filter:
     * real, current, available,
     * priced, local private-party listings.
     */
    const mechanicallyQualified =
      Array.from(
        new Map(
          rawListings
            .filter((listing) =>
              passesMechanicalFilters({
                listing,
                city,
                state,
                radius,
              })
            )
            .map((listing) => [
              listing.url!,
              listing,
            ])
        ).values()
      );

    if (
      mechanicallyQualified.length ===
      0
    ) {
      await supabase
        .from("acquisition_runs")
        .update({
          leads_generated: 0,
          status: "completed",
        })
        .eq(
          "id",
          acquisitionRunId
        );

      return NextResponse.json({
        success: true,
        run: acquisitionRun,
        source: "Apify Facebook Marketplace",
        raw_listings:
          rawListings.length,
        mechanically_qualified: 0,
        qualified_results: 0,
        inserted_leads: 0,
        leads: [],
        message:
          "Facebook Marketplace scan completed, but no listings passed the DealHaus mechanical filters.",
      });
    }

    /*
     * Don't pay OpenAI to score URLs
     * DealHaus already has.
     */
    const candidateUrls =
      mechanicallyQualified.map(
        (listing) => listing.url!
      );

    const {
      data: existingRows,
      error: existingError,
    } = await supabase
      .from("seller_leads")
      .select(
        "marketplace_listing_url"
      )
      .in(
        "marketplace_listing_url",
        candidateUrls
      );

    if (existingError) {
      throw new Error(
        existingError.message
      );
    }

    const existingUrls =
      new Set(
        (existingRows || [])
          .map(
            (row) =>
              row.marketplace_listing_url
          )
          .filter(Boolean)
      );

    const unseenListings =
      mechanicallyQualified
        .filter(
          (listing) =>
            !existingUrls.has(
              listing.url
            )
        )
        .slice(
          0,
          MAX_AI_CANDIDATES
        );

    if (unseenListings.length === 0) {
      await supabase
        .from("acquisition_runs")
        .update({
          leads_generated: 0,
          status: "completed",
        })
        .eq(
          "id",
          acquisitionRunId
        );

      return NextResponse.json({
        success: true,
        run: acquisitionRun,
        source:
          "Apify Facebook Marketplace",
        raw_listings:
          rawListings.length,
        mechanically_qualified:
          mechanicallyQualified.length,
        unseen_listings: 0,
        inserted_leads: 0,
        leads: [],
        message:
          "Facebook Marketplace scan completed. All qualifying listings were already known to DealHaus.",
      });
    }

    const aiScored =
      await scoreListingsWithAi(
        unseenListings
      );

    const listingByUrl =
      new Map(
        unseenListings.map(
          (listing) => [
            listing.url!,
            listing,
          ]
        )
      );

    /*
     * Second hard gate:
     * AI cannot invent URLs and
     * weak scores cannot enter seller_leads.
     */
    const qualified =
      aiScored.filter(
        (lead) => {
          if (
            !lead
              .marketplace_listing_url
          ) {
            return false;
          }

          if (
            !listingByUrl.has(
              lead
                .marketplace_listing_url
            )
          ) {
            return false;
          }

          const score = Number(
            lead.acquisition_score ||
              0
          );

          return (
            Number.isFinite(score) &&
            score >=
              MIN_ACQUISITION_SCORE
          );
        }
      );

    const rows =
      qualified.map((lead) => {
        const listing =
          listingByUrl.get(
            lead
              .marketplace_listing_url
          )!;

        const askingPrice =
          getListingPrice(
            listing
          )!;

        const estimatedResale =
          numberOrNull(
            lead
              .estimated_resale_price
          );

        const estimatedProfit =
          estimatedResale !== null
            ? Number(
                (
                  estimatedResale -
                  askingPrice
                ).toFixed(2)
              )
            : null;

        const acquisitionScore =
          Math.max(
            1,
            Math.min(
              100,
              Number(
                lead
                  .acquisition_score
              )
            )
          );

        const photos =
          Array.isArray(
            listing.images
          )
            ? listing.images
                .filter(
                  (url): url is string =>
                    typeof url ===
                      "string" &&
                    /^https?:\/\//i.test(
                      url
                    )
                )
                .slice(0, 12)
            : [];

        return {
          seller_name:
            normalizeText(
              listing.seller?.name
            ) || null,

          seller_email: null,
          seller_phone: null,

          seller_city:
            normalizeText(
              listing.location?.city
            ) || city,

          seller_state:
            normalizeText(
              listing.location?.state
            ) || state,

          item_title:
            normalizeText(
              listing.title
            ),

          item_description:
            normalizeText(
              listing.description
            ) || null,

          asking_price:
            askingPrice,

          estimated_resale_price:
            estimatedResale,

          estimated_profit:
            estimatedProfit,

          estimated_commission:
            estimatedResale !== null
              ? Number(
                  (
                    estimatedResale *
                    0.1
                  ).toFixed(2)
                )
              : null,

          lead_source:
            "Apify Facebook Acquisition Agent",

          lead_status: "new",

          acquisition_message:
            null,

          ai_score:
            acquisitionScore,

          acquisition_score:
            acquisitionScore,

          acquisition_reason:
            normalizeText(
              lead
                .acquisition_reason
            ) || null,

          marketplace_source:
            "Facebook Marketplace",

          marketplace_listing_url:
            listing.url,

          seller_profile_url:
            normalizeText(
              listing.seller?.url
            ) || null,

          lead_priority:
            ["low", "medium", "high"].includes(
              lead.lead_priority
            )
              ? lead.lead_priority
              : acquisitionScore >= 80
                ? "high"
                : "medium",

          approval_status:
            "not_approved",

          agreement_accepted:
            false,

          commission_rate: 10,

          search_city: city,
          search_radius:
            String(radius),

          acquisition_run_type:
            runType,

          platform:
            "Facebook Marketplace",

          status: "new",

          outreach_status:
            "not_started",

          photo_urls: photos,

          preferred_contact_method:
            null,
        };
      });

    if (rows.length === 0) {
      await supabase
        .from("acquisition_runs")
        .update({
          leads_generated: 0,
          status: "completed",
        })
        .eq(
          "id",
          acquisitionRunId
        );

      return NextResponse.json({
        success: true,
        run: acquisitionRun,
        source:
          "Apify Facebook Marketplace",
        raw_listings:
          rawListings.length,
        mechanically_qualified:
          mechanicallyQualified.length,
        unseen_listings:
          unseenListings.length,
        qualified_results: 0,
        inserted_leads: 0,
        leads: [],
        message:
          "Real Facebook listings were found, but none met the DealHaus acquisition score threshold.",
      });
    }

    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from("seller_leads")
      .insert(rows)
      .select();

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }

    await supabase
      .from("acquisition_runs")
      .update({
        leads_generated:
          inserted?.length || 0,
        status: "completed",
      })
      .eq(
        "id",
        acquisitionRunId
      );

    return NextResponse.json({
      success: true,
      run: acquisitionRun,
      source:
        "Apify Facebook Marketplace",
      searches_run:
        searchUrls.length,
      raw_listings:
        rawListings.length,
      mechanically_qualified:
        mechanicallyQualified.length,
      unseen_listings:
        unseenListings.length,
      qualified_results:
        qualified.length,
      inserted_leads:
        inserted?.length || 0,
      leads: inserted || [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Acquisition run failed.";

    console.error(
      "Apify acquisition run failed:",
      error
    );

    if (acquisitionRunId) {
      await supabase
        .from("acquisition_runs")
        .update({
          status: "failed",
        })
        .eq(
          "id",
          acquisitionRunId
        );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}