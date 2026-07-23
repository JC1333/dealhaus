import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type BraveResult = {
  title: string;
  url: string;
  description: string;
};

type ScoredLead = {
  marketplace_listing_url: string;
  item_title: string;
  item_description: string;
  seller_city: string;
  seller_state: string;
  marketplace_source: "OfferUp";
  asking_price: number | null;
  estimated_resale_price: number | null;
  estimated_profit: number | null;
  acquisition_score: number;
  acquisition_reason: string;
  lead_priority: "low" | "medium" | "high";
};

function isIndividualOfferUpListing(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return (
      hostname === "offerup.com" &&
      /^\/item\/detail\/[a-z0-9-]+\/?$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function looksCommercial(result: BraveResult) {
  const text = `${result.title} ${result.description}`.toLowerCase();

  const commercialTerms = [
    "financing available",
    "easy financing",
    "furniture outlet",
    "warehouse",
    "same day delivery",
    "delivery service",
    "store",
    "showroom",
    "dealer",
  ];

  return commercialTerms.some((term) => text.includes(term));
}

function extractPrice(text: string): number | null {
  const match = text.match(
    /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/
  );

  if (!match?.[1]) {
    return null;
  }

  const value = Number(match[1].replace(/,/g, ""));

  return Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export async function POST(req: Request) {
  try {
    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!braveApiKey) {
      return NextResponse.json(
        { error: "BRAVE_SEARCH_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const city = String(body.city || "Las Vegas").trim();
    const state = String(body.state || "NV").trim();
    const radius = Number(body.radius || 25);
    const runType = String(body.runType || "daily");
    const category = String(body.category || "furniture").trim();

    /*
     * Brave has proven capable of returning real OfferUp
     * /item/detail/... URLs.
     *
     * Craigslist and generic marketplace/category URLs are
     * deliberately excluded until item-level discovery is proven.
     */
    const searchQueries = [
      `site:offerup.com ${category} ${city} ${state}`,
      `site:offerup.com used ${category} ${city} ${state}`,
      `site:offerup.com ${category} for sale ${city} ${state}`,
      `site:offerup.com owner ${category} ${city} ${state}`,
    ];

    const discoveredResults: BraveResult[] = [];

    for (const query of searchQueries) {
      const searchUrl = new URL(
        "https://api.search.brave.com/res/v1/web/search"
      );

      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("count", "20");
      searchUrl.searchParams.set("country", "US");

      const response = await fetch(searchUrl.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveApiKey,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.error(
          "Brave search failed:",
          response.status,
          await response.text()
        );

        continue;
      }

      const payload = await response.json();

      const results = Array.isArray(payload?.web?.results)
        ? payload.web.results
        : [];

      for (const result of results) {
        const title =
          typeof result?.title === "string"
            ? result.title.trim()
            : "";

        const url =
          typeof result?.url === "string"
            ? result.url.trim()
            : "";

        const description =
          typeof result?.description === "string"
            ? result.description.trim()
            : "";

        if (!title || !url) {
          continue;
        }

        discoveredResults.push({
          title,
          url,
          description,
        });
      }
    }

    /*
     * HARD VALIDATION.
     *
     * AI never gets category pages, profiles, Craigslist search
     * pages or generic web pages. Only genuine OfferUp item URLs
     * reach the scoring stage.
     */
    const individualResults = Array.from(
      new Map(
        discoveredResults
          .filter((result) =>
            isIndividualOfferUpListing(result.url)
          )
          .filter((result) => !looksCommercial(result))
          .map((result) => [result.url, result])
      ).values()
    ).slice(0, 30);

    const { data: runData, error: runError } =
      await supabase
        .from("acquisition_runs")
        .insert({
          search_city: city,
          search_radius: radius,
          acquisition_run_type: runType,
          leads_generated: 0,
          status: "completed",
        })
        .select()
        .single();

    if (runError) {
      console.error("Run insert error:", runError);
    }

    if (individualResults.length === 0) {
      return NextResponse.json({
        success: true,
        run: runData,
        searched_results: discoveredResults.length,
        individual_results: 0,
        leads: [],
        message:
          "Search completed, but no verified individual OfferUp listings were found.",
      });
    }

    const resultText = individualResults
      .map(
        (result, index) => `
RESULT ${index + 1}
Title: ${result.title}
URL: ${result.url}
Description: ${result.description}
Observed price: ${
          extractPrice(`${result.title} ${result.description}`) ?? "unknown"
        }
`
      )
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `
You are the DealHaus Seller Acquisition Agent.

You are evaluating REAL individual OfferUp listing search results.

STRICT RULES:
- Never invent a listing.
- Never invent a URL.
- Never invent a seller name, phone number, email address or profile.
- marketplace_listing_url must exactly match one supplied URL.
- Only evaluate the supplied listings.
- Reject stores, dealers, warehouses, financing advertisements and delivery-service advertisements.
- Prefer apparent private-party used-item listings.
- Do not claim a price is known unless it appears in the supplied title or description.
- asking_price must be null when the actual price is unavailable.
- estimated_resale_price may be estimated only when there is enough item information to make a reasonable estimate.
- estimated_profit must be null if asking_price or estimated_resale_price is null.
- acquisition_score must be 1 through 100.
- acquisition_reason must explain why the REAL supplied listing may be a DealHaus opportunity.
- Return no more than 8 results.
- Return ONLY a valid JSON array.
          `.trim(),
        },
        {
          role: "user",
          content: `
DealHaus target market:

City: ${city}
State: ${state}
Radius: ${radius} miles
Category: ${category}

VERIFIED INDIVIDUAL OFFERUP RESULTS:

${resultText}

Return this structure:

[
  {
    "marketplace_listing_url": "exact supplied URL",
    "item_title": "title based only on supplied result",
    "item_description": "description based only on supplied result",
    "seller_city": "${city}",
    "seller_state": "${state}",
    "marketplace_source": "OfferUp",
    "asking_price": null,
    "estimated_resale_price": null,
    "estimated_profit": null,
    "acquisition_score": 0,
    "acquisition_reason": "",
    "lead_priority": "low"
  }
]
          `.trim(),
        },
      ],
    });

    const rawText =
      completion.choices[0]?.message?.content || "[]";

    const cleanedText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let scoredLeads: ScoredLead[] = [];

    try {
      const parsed = JSON.parse(cleanedText);

      scoredLeads = Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return NextResponse.json(
        {
          error:
            "AI scoring returned invalid JSON. No seller leads were created.",
        },
        { status: 500 }
      );
    }

    const verifiedResults = new Map(
      individualResults.map((result) => [
        result.url,
        result,
      ])
    );

    /*
     * SECOND HARD VALIDATION.
     *
     * Even if AI returns something unexpected, DealHaus only
     * accepts URLs already verified before the AI call.
     */
    const validLeads = scoredLeads
      .filter((lead) => {
        if (
          !lead.marketplace_listing_url ||
          !verifiedResults.has(
            lead.marketplace_listing_url
          )
        ) {
          return false;
        }

        return isIndividualOfferUpListing(
          lead.marketplace_listing_url
        );
      })
      .slice(0, 8);

    if (validLeads.length === 0) {
      return NextResponse.json({
        success: true,
        run: runData,
        searched_results: discoveredResults.length,
        individual_results: individualResults.length,
        qualified_results: 0,
        leads: [],
        message:
          "Verified OfferUp listings were discovered, but none qualified for DealHaus.",
      });
    }

    const urls = validLeads.map(
      (lead) => lead.marketplace_listing_url
    );

    const { data: existingRows, error: existingError } =
      await supabase
        .from("seller_leads")
        .select("marketplace_listing_url")
        .in("marketplace_listing_url", urls);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    const existingUrls = new Set(
      (existingRows || [])
        .map((row) => row.marketplace_listing_url)
        .filter(Boolean)
    );

    const newLeads = validLeads.filter(
      (lead) =>
        !existingUrls.has(
          lead.marketplace_listing_url
        )
    );

    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        run: runData,
        searched_results: discoveredResults.length,
        individual_results: individualResults.length,
        qualified_results: validLeads.length,
        inserted_leads: 0,
        leads: [],
        message:
          "Real OfferUp discovery completed. All qualified listings were already in DealHaus.",
      });
    }

    const rows = newLeads.map((lead) => {
      const sourceResult = verifiedResults.get(
        lead.marketplace_listing_url
      )!;

      /*
       * Prefer mechanically extracted Brave price over an AI value.
       * This prevents the model from manufacturing an asking price.
       */
      const observedPrice = extractPrice(
        `${sourceResult.title} ${sourceResult.description}`
      );

      const estimatedResale =
        lead.estimated_resale_price === null ||
        !Number.isFinite(
          Number(lead.estimated_resale_price)
        )
          ? null
          : Number(lead.estimated_resale_price);

      const estimatedProfit =
        observedPrice !== null &&
        estimatedResale !== null
          ? Number(
              (
                estimatedResale - observedPrice
              ).toFixed(2)
            )
          : null;

      return {
        seller_name: null,
        seller_email: null,
        seller_phone: null,

        seller_city: city,
        seller_state: state,

        item_title:
          sourceResult.title ||
          lead.item_title,

        item_description:
          sourceResult.description ||
          lead.item_description ||
          null,

        asking_price: observedPrice,
        estimated_resale_price: estimatedResale,
        estimated_profit: estimatedProfit,

        estimated_commission:
          estimatedResale !== null
            ? Number(
                (estimatedResale * 0.1).toFixed(2)
              )
            : null,

        lead_source:
          "Brave OfferUp Acquisition Agent",

        lead_status: "new",

        ai_score: Math.max(
          1,
          Math.min(
            100,
            Number(lead.acquisition_score || 1)
          )
        ),

        acquisition_score: Math.max(
          1,
          Math.min(
            100,
            Number(lead.acquisition_score || 1)
          )
        ),

        acquisition_reason:
          lead.acquisition_reason || null,

        marketplace_source: "OfferUp",
        marketplace_listing_url:
          lead.marketplace_listing_url,

        lead_priority:
          lead.lead_priority || "medium",

        approval_status: "not_approved",
        agreement_accepted: false,
        commission_rate: 10,

        search_city: city,
        search_radius: String(radius),
        acquisition_run_type: runType,

        platform: "OfferUp",
        status: "new",
        outreach_status: "not_started",
      };
    });

    const { data, error } = await supabase
      .from("seller_leads")
      .insert(rows)
      .select();

    if (error) {
      console.error("Lead insert error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /*
     * Update run count to what was ACTUALLY inserted.
     */
    if (runData?.id) {
      const { error: updateRunError } =
        await supabase
          .from("acquisition_runs")
          .update({
            leads_generated: data?.length || 0,
          })
          .eq("id", runData.id);

      if (updateRunError) {
        console.error(
          "Acquisition run count update error:",
          updateRunError
        );
      }
    }

    return NextResponse.json({
      success: true,
      run: runData,
      searched_results: discoveredResults.length,
      individual_results: individualResults.length,
      qualified_results: validLeads.length,
      inserted_leads: data?.length || 0,
      leads: data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Acquisition run failed.";

    console.error(
      "Acquisition run failed:",
      error
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}