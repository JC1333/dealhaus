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
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from("ai_relist_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `
Create a marketplace-ready furniture listing for DealHaus.

Item: ${task.item_title}
Seller: ${task.seller_name || "Unknown"}
Seller asking price: ${task.asking_price || ""}
Estimated profit: ${task.estimated_profit || ""}

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

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const generated = JSON.parse(cleanedText);

    const { data, error } = await supabase
      .from("ai_relist_tasks")
      .update({
        ai_title: generated.ai_title,
        ai_description: generated.ai_description,
        ai_price_recommendation: Number(generated.ai_price_recommendation || 0),
        relist_status: "generated",
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "AI relist generation failed" },
      { status: 500 }
    );
  }
}