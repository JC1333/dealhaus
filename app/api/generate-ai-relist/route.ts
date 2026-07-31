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
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: taskError?.message || "AI relist task not found" },
        { status: 500 }
      );
    }

    const { data: prepTask } = await supabase
      .from("listing_prep_tasks")
      .select("*")
      .eq("id", task.listing_prep_task_id)
      .single();

    const { data: sellerLead } = await supabase
      .from("seller_leads")
      .select("*")
      .eq("id", task.seller_lead_id || prepTask?.seller_lead_id)
      .single();

    const sellerPhotoUrls = Array.isArray(sellerLead?.photo_urls)
      ? sellerLead.photo_urls
      : [];

    const sourceTitle =
      task.item_title || prepTask?.item_title || sellerLead?.item_title || "Marketplace Item";

    const sellerName =
      task.seller_name || prepTask?.seller_name || sellerLead?.seller_name || "Marketplace Seller";

    const askingPrice =
      Number(task.asking_price || prepTask?.asking_price || sellerLead?.asking_price || 0);

    const internalNotes = String(sellerLead?.acquisition_reason || "");

    const sourceDescription =
      String(sellerLead?.item_description || "").trim() ||
      internalNotes.match(/Description:\s*(.*?)(?=\.\s+Photos:|$)/i)?.[1]?.trim() ||
      sourceTitle;

    const sourceCategory =
      String(sellerLead?.category || "").trim() ||
      internalNotes.match(/Category:\s*(.*?)(?=\.\s+Condition:|$)/i)?.[1]?.trim() ||
      "Marketplace";

    const sourceCondition =
      String(sellerLead?.condition || "").trim() ||
      internalNotes.match(/Condition:\s*(.*?)(?=\.\s+Marketplace URL:|$)/i)?.[1]?.trim() ||
      "Used - Good";

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "Write accurate, natural Facebook Marketplace listings. Never expose private seller information or internal DealHaus business information.",
        },
        {
          role: "user",
          content: `
Create a Facebook Marketplace listing using only these public item details.

Original title: ${sourceTitle}
Item description: ${sourceDescription}
Seller asking price: ${askingPrice}
Category: ${sourceCategory}
Condition: ${sourceCondition}

Return only valid JSON:
{
  "ai_title": "",
  "ai_description": "",
  "ai_price_recommendation": 0
}

Rules:
- Keep the item identity and seller-provided condition accurate.
- Write naturally, clearly, and concisely.
- Do not invent features, measurements, accessories, delivery, warranty, authenticity, age, or condition details.
- Do not mention the seller's name.
- Do not mention DealHaus.
- Do not mention commissions, fees, agreements, payouts, or brokerage terms.
- Do not mention email, phone, contact preference, ZIP code, internal notes, database details, or photo URLs.
- Do not describe the item as new unless the supplied condition explicitly says it is new.
- Keep the recommended price reasonably close to the seller's asking price.
`,
        },
      ],
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const generated = JSON.parse(cleanedText);

    const aiTitle = generated.ai_title || sourceTitle;
    const aiDescription =
      generated.ai_description ||
      sourceDescription;

    const aiPrice = Number(generated.ai_price_recommendation || askingPrice || 0);

    const { data: updatedTask, error: updateError } = await supabase
      .from("ai_relist_tasks")
      .update({
  ai_title: aiTitle,
  ai_description: aiDescription,
  ai_price_recommendation: aiPrice,
  relist_status: "listed",
})
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }


    if (sellerPhotoUrls.length === 0) {
      await supabase.from("exception_tasks").insert({
        exception_type: "workflow_missing_seller_photos",
        related_table: "seller_leads",
        related_record_id:
          sellerLead?.id ||
          task.seller_lead_id ||
          prepTask?.seller_lead_id ||
          null,
        item_title: sourceTitle,
        exception_status: "open",
        notes:
          "AI relisting stopped because no real seller photos were available. The seller must upload photos before this item can be published.",
      });

      return NextResponse.json(
        {
          error:
            "No real seller photos are available. Upload photos before continuing.",
        },
        { status: 409 }
      );
    }

    const finalImageUrls = sellerPhotoUrls;

    const { data: existingInventory } = await supabase
      .from("inventory")
      .select("id")
      .eq("title", aiTitle)
      .eq("seller_email", sellerLead?.seller_email || "")
      .limit(1)
      .maybeSingle();

    let inventoryId = existingInventory?.id;

    if (!inventoryId) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory")
        .insert({
          title: aiTitle,
          description: aiDescription,
          price: aiPrice,
          asking_price: String(askingPrice),
          status: "active",
          seller_name: sellerName,
          seller_email: sellerLead?.seller_email || "",
          seller_phone: sellerLead?.seller_phone || "",
          preferred_contact_method:
          sellerLead?.preferred_contact_method || "email",
          seller_city: sellerLead?.seller_city || "",
          seller_state: sellerLead?.seller_state || "",
          category: "Marketplace",
          condition: sourceCondition,
          image: finalImageUrls[0],
          images: finalImageUrls,
        })
        .select()
        .single();

      if (inventoryError) {
        return NextResponse.json({ error: inventoryError.message }, { status: 500 });
      }

      inventoryId = inventoryItem.id;
    }

       await supabase
      .from("ai_relist_tasks")
      .update({
        inventory_item_id: inventoryId,
      })
      .eq("id", taskId);

    return NextResponse.json({
      success: true,
      task: updatedTask,
      inventoryId,
    });
  } catch (error: any) {
    console.log("Generate AI relist API error:", error);

    return NextResponse.json(
      { error: error.message || "AI relist generation failed" },
      { status: 500 }
    );
  }
}

