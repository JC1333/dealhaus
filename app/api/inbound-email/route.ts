import { NextResponse } from "next/server";
import { Resend } from "resend";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ResendReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    subject?: string;
  };
};

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractNewestReply(text: string) {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const lines = cleaned.split("\n");
  const replyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Gmail / common quoted-reply markers
    if (
      /^On .+wrote:$/i.test(trimmed) ||
      /^On .+wrote:\s*>?/i.test(trimmed) ||
      /^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed) ||
      /^From:\s/i.test(trimmed) ||
      /^Sent:\s/i.test(trimmed) ||
      /^To:\s/i.test(trimmed) ||
      /^Subject:\s/i.test(trimmed) ||
      /^>/.test(trimmed)
    ) {
      break;
    }

    replyLines.push(line);
  }

  return replyLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!resendApiKey || !openaiApiKey) {
      return NextResponse.json(
        { error: "Resend or OpenAI API key is missing." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server credentials are missing." },
        { status: 500 }
      );
    }

    const event = (await req.json()) as ResendReceivedEvent;

    if (event.type !== "email.received") {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const emailId = event.data?.email_id;

    if (!emailId) {
      return NextResponse.json(
        { error: "Inbound email ID is missing." },
        { status: 400 }
      );
    }

    const resend = new Resend(resendApiKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: receivedEmail, error: receiveError } =
      await resend.emails.receiving.get(emailId);

    if (receiveError || !receivedEmail) {
      return NextResponse.json(
        {
          error:
            receiveError?.message ||
            "Unable to retrieve the received email.",
        },
        { status: 500 }
      );
    }

    const buyerEmail = extractEmailAddress(receivedEmail.from || "");

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "Unable to determine sender email." },
        { status: 400 }
      );
    }

    const rawMessage =
      receivedEmail.text ||
      (receivedEmail.html ? stripHtml(receivedEmail.html) : "");

    const buyerMessage = extractNewestReply(rawMessage);

    if (!buyerMessage) {
      return NextResponse.json(
        { error: "Inbound email contained no readable message." },
        { status: 400 }
      );
    }

    const { data: conversations, error: conversationError } =
      await supabase
        .from("buyer_conversations")
        .select("*")
        .ilike("buyer_email", buyerEmail)
        .order("created_at", { ascending: false })
        .limit(10);

    if (conversationError) {
      return NextResponse.json(
        { error: conversationError.message },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: true,
        unmatched: true,
        buyer_email: buyerEmail,
      });
    }

    const inventoryIds = conversations
      .map((conversation: any) => conversation.inventory_id)
      .filter(Boolean);

    let inventoryById = new Map<string, any>();

    if (inventoryIds.length > 0) {
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("*")
        .in("id", inventoryIds);

      inventoryById = new Map(
        (inventoryData || []).map((item: any) => [
          String(item.id),
          item,
        ])
      );
    }

    const subject = (receivedEmail.subject || "").toLowerCase();

    const matchedConversation =
      conversations.find((conversation: any) => {
        const inventoryItem = inventoryById.get(
          String(conversation.inventory_id)
        );

        const possibleTitles = [
          inventoryItem?.item_title,
          inventoryItem?.title,
          conversation.inventory_title,
        ]
          .filter(Boolean)
          .map((title) => String(title).toLowerCase());

        return possibleTitles.some((title) => subject.includes(title));
      }) || conversations[0];

    const inventoryItem = inventoryById.get(
      String(matchedConversation.inventory_id)
    );

    const itemTitle =
      inventoryItem?.item_title ||
      inventoryItem?.title ||
      matchedConversation.inventory_title ||
      "the item";

    const { data: existingMessage } = await supabase
      .from("buyer_conversation_messages")
      .select("id")
      .eq("buyer_conversation_id", matchedConversation.id)
      .eq("message", buyerMessage)
      .limit(1)
      .maybeSingle();

    if (existingMessage) {
      return NextResponse.json({
        success: true,
        duplicate: true,
      });
    }

    const { error: messageError } = await supabase
      .from("buyer_conversation_messages")
      .insert({
        buyer_conversation_id: matchedConversation.id,
        sender: matchedConversation.buyer_name || "Buyer",
        message: buyerMessage,
      });

    if (messageError) {
      return NextResponse.json(
        { error: messageError.message },
        { status: 500 }
      );
    }

    const { data: history } = await supabase
      .from("buyer_conversation_messages")
      .select("sender,message,created_at")
      .eq("buyer_conversation_id", matchedConversation.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory = (history || [])
      .map((message: any) => `${message.sender}: ${message.message}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are the DealHaus Buyer Conversation Agent.

DealHaus is an AI marketplace brokerage that connects buyers and sellers.

Your job is to professionally respond to buyer inquiries using ONLY the information provided about the listing and conversation.

Rules:
- Be friendly, professional, concise, and helpful.
- Never mention that you are AI.
- Never invent listing details.
- Never invent availability, condition, dimensions, location, delivery, pickup arrangements, seller information, or pricing.
- Never promise that an item is still available unless the supplied data confirms it.
- Never accept or reject an offer on your own.
- If the buyer makes an offer, asks for a discount, negotiates price, or proposes a different price, tell them you will check on the offer and follow up.
- If information needed to answer is unavailable, say you will confirm the detail rather than guessing.
- Do not provide private seller information.
- Do not request payment outside the approved DealHaus transaction process.
- Keep most responses under 120 words.
- Do not include an email signature. DealHaus adds the signature automatically.
`,
        },
        {
          role: "user",
          content: `
LISTING INFORMATION

Title: ${itemTitle}
Price: ${inventoryItem?.price ?? "Not provided"}
Description: ${inventoryItem?.description ?? "Not provided"}
Status: ${inventoryItem?.status ?? "Not provided"}
Deal stage: ${inventoryItem?.deal_stage ?? "Not provided"}

BUYER

Name: ${matchedConversation.buyer_name || "Buyer"}

RECENT CONVERSATION

${conversationHistory || "No previous messages."}

NEW BUYER MESSAGE

${buyerMessage}

Write the appropriate DealHaus response to the buyer.
`,
        },
      ],
      temperature: 0.3,
    });

    const aiReply =
      completion.choices[0]?.message?.content?.trim();

    if (!aiReply) {
      return NextResponse.json(
        { error: "AI did not generate a response." },
        { status: 500 }
      );
    }

    const emailMessage = `Hi ${matchedConversation.buyer_name || "there"},

${aiReply}

Best regards,
The DealHaus Team
AI Marketplace Brokerage
Helping You Sell Smarter. Built on Integrity. Guided by Faith.

support@dealhaus.us
dealhaus.us`;

    const { error: sendError } = await resend.emails.send({
      from: "DealHaus Support <support@dealhaus.us>",
      to: buyerEmail,
      subject: `Re: ${itemTitle}`,
      text: emailMessage,
    });

    if (sendError) {
      return NextResponse.json(
        { error: sendError.message || "AI reply email failed." },
        { status: 500 }
      );
    }

    const { error: aiMessageError } = await supabase
      .from("buyer_conversation_messages")
      .insert({
        buyer_conversation_id: matchedConversation.id,
        sender: "DealHaus",
        message: aiReply,
      });

    if (aiMessageError) {
      return NextResponse.json(
        { error: aiMessageError.message },
        { status: 500 }
      );
    }

    const nextUnreadCount =
      Number(matchedConversation.unread_count || 0) + 1;

    const { error: updateError } = await supabase
      .from("buyer_conversations")
      .update({
        last_message: buyerMessage,
        unread_count: nextUnreadCount,
        conversation_stage: "buyer_contacted",
      })
      .eq("id", matchedConversation.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation_id: matchedConversation.id,
      buyer_email: buyerEmail,
      buyer_message_saved: true,
      ai_reply_sent: true,
      ai_reply_saved: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Inbound AI conversation processing failed.";

    console.error("DealHaus inbound AI conversation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}