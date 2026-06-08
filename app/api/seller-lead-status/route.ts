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
Write a short friendly seller outreach message for DealHaus.

Goal:
Ask the seller if they are open to DealHaus helping relist/promote their item and only taking a commission if it sells.

Lead:
Item: ${lead.item_title}
Seller: ${lead.seller_name || "there"}
City: ${lead.seller_city || ""}
Platform: ${lead.platform || ""}
Asking price: ${lead.asking_price || ""}
Estimated profit: ${lead.estimated_profit || ""}

Rules:
- Keep it under 80 words.
- Friendly, simple, not pushy.
- Do not mention AI.
- Do not promise a sale.
- Mention commission only if it sells.
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