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
  title?: string;
  url?: string;
  description?: string;
};

type ScoredLead = {
  marketplace_listing_url: string;
  item_title: string;
  item_description: string;
  seller_city: string;
  seller_state: string;
  marketplace_source: string;
  asking_price: number | null;
  estimated_resale_price: number | null;
  estimated_profit: number | null;
  acquisition_score: number;
  acquisition_reason: string;
  lead_priority: "low" | "medium" | "high";
};

function detectMarketplace(url: string) {
  const value = url.toLowerCase();

  if (value.includes("facebook.com")) {
    return "Facebook Marketplace";
  }

  if (value.includes("offerup.com")) {
    return "OfferUp";
  }

  if (value.includes("craigslist.org")) {
    return "Craigslist";
  }

  return "Web";
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

    const searchQueries = [
      `${category} for sale ${city} ${state} craigslist`,
      `${category} for sale ${city} ${state} OfferUp`,
      `${category} for sale ${city} ${state} Facebook Marketplace`,
      `used ${category} ${city} ${state} for sale`,
    ];

    const braveResults: BraveResult[] = [];

    for (const query of searchQueries) {
      const url = new URL(
        "https://api.search.brave.com/res/v1/web/search"
      );

      url.searchParams.set("q", query);
      url.searchParams.set("count", "10");
      url.searchParams.set("country", "US");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveApiKey,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const message = await response.text();

        console.error("Brave search failed:", message);

        continue;
      }

      const data = await response.json();

      const results = Array.isArray(data?.web?.results)
        ? data.web.results
        : [];

      for (const result of results) {
        if (!result?.url || !result?.title) {
          continue;
        }

        braveResults.push({
          title: result.title,
          url: result.url,
          description: result.description || "",
        });
      }
    }

    const uniqueResults = Array.from(
      new Map(
        braveResults.map((result) => [
          result.url,
          result,
        ])
      ).values()
    ).slice(0, 30);

    if (uniqueResults.length === 0) {
      return NextResponse.json(
        { error: "No real search results were found." },
        { status: 404 }
      );
    }

    const resultText = uniqueResults
      .map(
        (result, index) => `
RESULT ${index + 1}
Title: ${result.title}
URL: ${result.url}
Description: ${result.description || ""}
Marketplace: ${detectMarketplace(result.url || "")}
`
      )
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are the DealHaus Seller Acquisition Agent.

You analyze REAL web search results and identify legitimate marketplace seller opportunities.

IMPORTANT:
- Never invent a seller, listing, URL, price, description, or marketplace.
- Only use information present in the supplied search results.
- Every returned marketplace_listing_url must exactly match one URL from the supplied search results.
- Do not return generic category pages, search-result pages, stores, warehouses, dealers, articles, or unrelated websites.
- Prefer individual marketplace listing pages when identifiable.
- If a price is not clearly present, use null.
- If estimated resale value cannot reasonably be estimated, use null.
- acquisition_score must be 1-100.
- Focus on listings that may be underpriced or attractive for DealHaus brokerage/resale assistance.
- Return no more than 8 leads.
`,
        },
        {
          role: "user",
          content: `
DealHaus acquisition market:

City: ${city}
State: ${state}
Radius: ${radius} miles
Category: ${category}

REAL SEARCH RESULTS:

${resultText}

Return ONLY valid JSON array.

Each result must have:

{
  "marketplace_listing_url": "",
  "item_title": "",
  "item_description": "",
  "seller_city": "${city}",
  "seller_state": "${state}",
  "marketplace_source": "",
  "asking_price": null,
  "estimated_resale_price": null,
  "estimated_profit": null,
  "acquisition_score": 0,
  "acquisition_reason": "",
  "lead_priority": "low"
}
`,
        },
      ],
      temperature: 0.2,
    });

    const rawText =
      completion.choices[0]?.message?.content || "[]";

    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const scoredLeads = JSON.parse(cleanedText) as ScoredLead[];

    const allowedUrls = new Set(
      uniqueResults.map((result) => result.url)
    );

    const validLeads = scoredLeads
      .filter(
        (lead) =>
          lead.marketplace_listing_url &&
          allowedUrls.has(lead.marketplace_listing_url)
      )
      .slice(0, 8);

    if (validLeads.length === 0) {
      return NextResponse.json({
        success: true,
        run: null,
        leads: [],
        message:
          "Real search completed, but no suitable individual seller opportunities were identified.",
      });
    }

    const existingUrlRows = await supabase
      .from("seller_leads")
      .select("marketplace_listing_url")
      .in(
        "marketplace_listing_url",
        validLeads.map(
          (lead) => lead.marketplace_listing_url
        )
      );

    const existingUrls = new Set(
      (existingUrlRows.data || [])
        .map((row: any) => row.marketplace_listing_url)
        .filter(Boolean)
    );

    const newLeads = validLeads.filter(
      (lead) =>
        !existingUrls.has(lead.marketplace_listing_url)
    );

    const { data: runData, error: runError } =
      await supabase
        .from("acquisition_runs")
        .insert({
          search_city: city,
          search_radius: radius,
          acquisition_run_type: runType,
          leads_generated: newLeads.length,
          status: "completed",
        })
        .select()
        .single();

    if (runError) {
      console.error("Run insert error:", runError);
    }

    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        run: runData,
        leads: [],
        message:
          "Real search completed. All suitable results were already in DealHaus.",
      });
    }

    const rows = newLeads.map((lead) => {
      const askingPrice =
        lead.asking_price === null
          ? null
          : Number(lead.asking_price);

      const estimatedResale =
        lead.estimated_resale_price === null
          ? null
          : Number(lead.estimated_resale_price);

      const estimatedProfit =
        lead.estimated_profit === null
          ? null
          : Number(lead.estimated_profit);

      return {
        seller_name: null,
        seller_email: null,
        seller_phone: null,

        seller_city: lead.seller_city || city,
        seller_state: lead.seller_state || state,

        item_title: lead.item_title,
        item_description: lead.item_description || null,

        asking_price: askingPrice,
        estimated_resale_price: estimatedResale,
        estimated_profit: estimatedProfit,

        estimated_commission:
          estimatedResale !== null
            ? Number(
                (estimatedResale * 0.1).toFixed(2)
              )
            : null,

        lead_source: "Brave Search Acquisition Agent",
        lead_status: "new",

        ai_score: Number(lead.acquisition_score || 0),
        acquisition_score: Number(
          lead.acquisition_score || 0
        ),
        acquisition_reason:
          lead.acquisition_reason || null,

        marketplace_source:
          lead.marketplace_source ||
          detectMarketplace(
            lead.marketplace_listing_url
          ),

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

        platform:
          lead.marketplace_source ||
          detectMarketplace(
            lead.marketplace_listing_url
          ),

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

    return NextResponse.json({
      success: true,
      run: runData,
      searched_results: uniqueResults.length,
      qualified_results: validLeads.length,
      inserted_leads: data?.length || 0,
      leads: data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Acquisition run failed.";

    console.error("Acquisition run failed:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}