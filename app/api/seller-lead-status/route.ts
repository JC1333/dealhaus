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

export async function POST(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing lead id or status" },
        { status: 400 }
      );
    }

    let outreachMessage = null;
    let outreachStatus = undefined;

    if (status === "approved_for_outreach") {
      const { data: lead, error: leadError } = await supabase
        .from("seller_leads")
        .select("*")
        .eq("id", id)
        .single();

      if (leadError) {
        return NextResponse.json({ error: leadError.message }, { status: 500 });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: `
Write a short, engaging seller outreach message for DealHaus.

DealHaus is a new local AI-powered marketplace brokerage based in Las Vegas, Nevada.

Goal:
Introduce DealHaus clearly, explain why we are reaching out about this specific item, explain the service and 10% commission, and ask whether the seller is open to hearing more.

Lead:
Item: ${lead.item_title}
Seller: ${lead.seller_name || "there"}
City: ${lead.seller_city || ""}
Platform: ${lead.platform || ""}
Asking price: ${lead.asking_price || ""}

Required points:
- Mention that DealHaus is a new local brokerage here in Las Vegas, Nevada.
- Mention the seller's specific item naturally.
- Explain that DealHaus helps promote/relist the item and reach more potential buyers.
- Seller keeps possession of the item.
- No upfront fee.
- DealHaus earns a 10% commission only if DealHaus helps get the item sold.
- Ask if the seller is open to hearing more about how it works.

Rules:
- Keep it around 70-110 words.
- Friendly, local, professional, conversational, and engaging.
- Do not sound spammy or overly salesy.
- Do not claim DealHaus already has a buyer.
- Do not promise a sale.
- Do not imply the seller has already authorized DealHaus.
- Do not mention estimated profit or resale spread.
`,
          },
        ],
        temperature: 0.5,
      });

      outreachMessage =
        completion.choices[0]?.message?.content?.trim() ||
        "Hi! I help local sellers promote quality furniture items and only take a small commission if the item sells. Would you be open to DealHaus helping get more buyer interest for this item?";

      outreachStatus = "ready";
    }

    const updatePayload: any = { status };

    if (outreachMessage) {
      updatePayload.outreach_message = outreachMessage;
    }

    if (outreachStatus) {
      updatePayload.outreach_status = outreachStatus;
    }

    const { data, error } = await supabase
      .from("seller_leads")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

if (status === "approved_for_outreach" && data?.outreach_message) {
  const { error: taskError } = await supabase
    .from("outreach_tasks")
    .insert({
      seller_lead_id: data.id,
      item_title: data.item_title,
      seller_name: data.seller_name,
      platform: data.platform,
      outreach_message: data.outreach_message,
      send_status: "pending",
      attempt_count: 0,
    });

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }
}

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Status update failed" },
      { status: 500 }
    );
  }
}