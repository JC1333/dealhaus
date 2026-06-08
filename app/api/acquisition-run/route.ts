import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type Lead = {
  item_title: string;
  seller_name: string;
  seller_city: string;
  seller_state: string;
  asking_price: number;
  estimated_profit: number;
  acquisition_score: number;
  acquisition_reason: string;
  platform: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const city = body.city || "Local Market";
    const state = body.state || "";
    const radius = Number(body.radius || 25);
    const runType = body.runType || "daily";
    const category = body.category || "furniture";

    const prompt = `
Generate 8 realistic seller lead opportunities for a furniture arbitrage marketplace called DealHaus.

Market:
City: ${city}
State: ${state}
Radius: ${radius} miles
Category: ${category}
Run type: ${runType}

Return ONLY valid JSON array.
Each object must include:
item_title, seller_name, seller_city, seller_state, asking_price, estimated_profit, acquisition_score, acquisition_reason, platform.

Rules:
- acquisition_score must be 1-100
- estimated_profit should be realistic resale/brokerage opportunity
- platform must be Facebook Marketplace, OfferUp, or Craigslist
- focus on sellers likely to accept help relisting or brokered resale
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content || "[]";
    const cleanedText = text
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

const leads: Lead[] = JSON.parse(cleanedText);

    const { data: runData, error: runError } = await supabase
      .from("acquisition_runs")
      .insert({
        search_city: city,
        search_radius: radius,
        acquisition_run_type: runType,
        leads_generated: leads.length,
        status: "completed",
      })
      .select()
      .single();

    if (runError) {
      console.error("Run insert error:", runError);
    }

    const rows = leads.map((lead) => ({
      item_title: lead.item_title,
      seller_name: lead.seller_name,
      seller_city: lead.seller_city,
      seller_state: lead.seller_state || state,
      asking_price: lead.asking_price,
      estimated_profit: Number(lead.estimated_profit || 0),
      acquisition_score: Number(lead.acquisition_score || 0),
      acquisition_reason: lead.acquisition_reason,
      platform: lead.platform,
      status: "new",
      search_city: city,
      search_radius: radius,
      acquisition_run_type: runType,
    }));

    const { data, error } = await supabase
      .from("seller_leads")
      .insert(rows)
      .select();

    if (error) {
      console.error("Lead insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      run: runData,
      leads: data,
    });
  } catch (error: any) {
    console.error("Acquisition run failed:", error);
    return NextResponse.json(
      { error: error.message || "Acquisition run failed" },
      { status: 500 }
    );
  }
}