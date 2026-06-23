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

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from("ai_relist_tasks")
      .select(`
        *,
        listing_prep_tasks (
          id,
          seller_lead_id,
          seller_leads (
            id,
            item_title,
            seller_name,
            seller_email,
            seller_city,
            seller_state,
            asking_price,
            acquisition_reason
          )
        )
      `)
      .eq("id", taskId)
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    const sellerLead = task?.listing_prep_tasks?.seller_leads;

    const sourceTitle =
      task.item_title || sellerLead?.item_title || "Marketplace Item";

    const sellerName =
      task.seller_name || sellerLead?.seller_name || "Marketplace Seller";

    const askingPrice =
      task.asking_price || sellerLead?.asking_price || 0;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `
Create a marketplace-ready listing for DealHaus.

Item: ${sourceTitle}
Seller: ${sellerName}
Seller asking price: ${askingPrice}
Notes: ${sellerLead?.acquisition_reason || ""}

Return ONLY valid JSON with:
{
  "ai_title": "",
  "ai_description": "",
  "ai_price_recommendation": number
}

Rules:
- Title should be professional and searchable.
- Description should be persuasive but honest.
- Do not mention AI.
- Do not make unsupported claims.
- Price recommendation should be realistic for resale.
`,
        },
      ],
      temperature: 0.5,
    });

    const text = completion.choices[0]?.message?.content || "{}";

    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const generated = JSON.parse(cleanedText);

    const aiTitle = generated.ai_title || sourceTitle;
    const aiDescription =
      generated.ai_description ||
      sellerLead?.acquisition_reason ||
      "Marketplace listing prepared by DealHaus.";

    const aiPrice = Number(generated.ai_price_recommendation || askingPrice || 0);

    const { data: updatedTask, error: updateError } = await supabase
      .from("ai_relist_tasks")
      .update({
        generated_title: aiTitle,
        generated_description: aiDescription,
        generated_price: aiPrice,
        relist_status: "listed",
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: existingInventory } = await supabase
      .from("inventory")
      .select("id")
      .eq("title", aiTitle)
      .eq("seller_email", sellerLead?.seller_email || "")
      .limit(1)
      .single();

    if (!existingInventory) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory")
        .insert({
          title: aiTitle,
          description: aiDescription,
          price: aiPrice,
          asking_price: askingPrice,
          status: "active",
          seller_name: sellerName,
          seller_email: sellerLead?.seller_email || "",
          seller_city: sellerLead?.seller_city || "",
          seller_state: sellerLead?.seller_state || "",
          category: "Marketplace",
          condition: "Seller provided",
          image:
            "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop",
        })
        .select()
        .single();

      if (inventoryError) {
        return NextResponse.json(
          { error: inventoryError.message },
          { status: 500 }
        );
      }

      await supabase
        .from("ai_relist_tasks")
        .update({
          inventory_item_id: inventoryItem.id,
        })
        .eq("id", taskId);
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "AI relist generation failed" },
      { status: 500 }
    );
  }
}