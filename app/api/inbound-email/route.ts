import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

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
  const cleaned = text.replace(/\r\n/g, "\n").trim();

  const separators = [
    /\nOn .+ wrote:\n/i,
    /\n-{2,}\s*Original Message\s*-{2,}/i,
    /\nFrom:\s.+\nSent:\s.+/i,
  ];

  let newest = cleaned;

  for (const separator of separators) {
    const parts = newest.split(separator);

    if (parts.length > 1) {
      newest = parts[0].trim();
    }
  }

  return newest.trim();
}

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is missing." },
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      console.log(
        "Inbound buyer email received with no matching conversation:",
        buyerEmail
      );

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

        return possibleTitles.some((title) =>
          subject.includes(title)
        );
      }) || conversations[0];

    const { data: existingMessage } = await supabase
      .from("buyer_conversation_messages")
      .select("id")
      .eq("buyer_conversation_id", matchedConversation.id)
      .eq("message", buyerMessage)
      .limit(1)
      .maybeSingle();

    if (!existingMessage) {
      const { error: messageError } = await supabase
        .from("buyer_conversation_messages")
        .insert({
          buyer_conversation_id: matchedConversation.id,
          sender:
            matchedConversation.buyer_name || "Buyer",
          message: buyerMessage,
        });

      if (messageError) {
        return NextResponse.json(
          { error: messageError.message },
          { status: 500 }
        );
      }
    }

    const nextUnreadCount =
      Number(matchedConversation.unread_count || 0) + 1;

    const { error: updateError } = await supabase
      .from("buyer_conversations")
      .update({
        last_message: buyerMessage,
        unread_count: nextUnreadCount,
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
      message_saved: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Inbound email processing failed.";

    console.error("DealHaus inbound email error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}