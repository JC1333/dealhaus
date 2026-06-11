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
    const { inventoryItemId } = await req.json();

    if (!inventoryItemId) {
      return NextResponse.json(
        { error: "Missing inventoryItemId" },
        { status: 400 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", inventoryItemId)
      .single();

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `
Create a short buyer outreach message for a furniture item listed by DealHaus.

Item title: ${item.title}
Description: ${item.description || ""}
Price: ${item.price || ""}

Return ONLY valid JSON:
{
  "buyer_name": "Potential Buyer",
  "buyer_platform": "Facebook Marketplace",
  "outreach_message": ""
}

Rules:
- Message should be under 70 words.
- Friendly and simple.
- Do not mention AI.
- Do not sound spammy.
- Mention the item and invite them to ask questions.
`,
        },
      ],
      temperature: 0.5,
    });

    const text = completion.choices[0]?.message?.content || "{}";

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const generated = JSON.parse(cleanedText);

    const { data, error } = await supabase
      .from("buyer_outreach_tasks")
      .insert({
        inventory_item_id: item.id,
        item_title: item.title,
        listing_price: item.price,
        buyer_name: generated.buyer_name || "Potential Buyer",
        buyer_platform: generated.buyer_platform || "Facebook Marketplace",
        outreach_message: generated.outreach_message,
        outreach_status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Buyer outreach task creation failed" },
      { status: 500 }
    );
  }
}