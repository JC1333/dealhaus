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
  .replace(/\s+On\s[\s\S]+?wrote:\s*[\s\S]*$/i, "")
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
    // Seller sale-completion replies are routed by exact
    // brokerage transaction ID before normal closing/negotiation handling.
    const sellerCompletionSubject =
      receivedEmail.subject || event.data?.subject || "";

    const sellerCompletionMatch =
      sellerCompletionSubject.match(
        /DealHaus Sale Completion \[([0-9a-f-]{36})\]/i
      );

    if (sellerCompletionMatch) {
      if (!buyerMessage) {
        return NextResponse.json(
          {
            error:
              "Seller completion reply contained no readable message.",
          },
          { status: 400 }
        );
      }

      const transactionId =
        sellerCompletionMatch[1];

      const {
        data: completionTransaction,
        error: completionTransactionError,
      } = await supabase
        .from("brokerage_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (
        completionTransactionError ||
        !completionTransaction
      ) {
        return NextResponse.json(
          {
            error:
              completionTransactionError?.message ||
              "Completion transaction could not be found.",
          },
          { status: 404 }
        );
      }

      if (
        completionTransaction.transaction_status !== "open" ||
        completionTransaction.meetup_status !==
          "completion_confirmations_requested"
      ) {
        return NextResponse.json(
          {
            error:
              "Transaction is not waiting for seller completion confirmation.",
          },
          { status: 409 }
        );
      }

      if (!completionTransaction.seller_lead_id) {
        return NextResponse.json(
          {
            error:
              "Completion transaction has no linked seller lead.",
          },
          { status: 409 }
        );
      }

      const {
        data: completionSeller,
        error: completionSellerError,
      } = await supabase
        .from("seller_leads")
        .select(
          "id,seller_name,seller_email,approval_status,agreement_accepted"
        )
        .eq(
          "id",
          completionTransaction.seller_lead_id
        )
        .single();

      if (
        completionSellerError ||
        !completionSeller
      ) {
        return NextResponse.json(
          {
            error:
              completionSellerError?.message ||
              "Completion seller could not be found.",
          },
          { status: 404 }
        );
      }

      if (
        completionSeller.approval_status !== "approved" ||
        completionSeller.agreement_accepted !== true
      ) {
        return NextResponse.json(
          {
            error:
              "Seller is not approved for DealHaus completion processing.",
          },
          { status: 403 }
        );
      }

      const expectedSellerEmail =
        String(completionSeller.seller_email || "")
          .trim()
          .toLowerCase();

      if (
        !expectedSellerEmail ||
        buyerEmail !== expectedSellerEmail
      ) {
        return NextResponse.json(
          {
            error:
              "Seller completion reply sender does not match the transaction seller.",
          },
          { status: 403 }
        );
      }

      const sellerReply =
        buyerMessage.trim();

      const normalized =
        sellerReply.toLowerCase();

      const explicitlyNotCompleted =
        /\b(no|not yet|didn'?t|did not|wasn'?t|was not|never happened|no show|didn'?t show|did not show|cancelled|canceled|fell through|still have it|problem|issue)\b/i.test(
          normalized
        );

      const explicitlyCompleted =
        /\b(yes|yep|yeah|completed|complete|all done|done|went through|worked out|everything went well|everything went great|picked it up|picked up|sold|sale completed|transaction completed)\b/i.test(
          normalized
        );

      const classification =
        explicitlyNotCompleted
          ? "not_completed"
          : explicitlyCompleted
            ? "completed"
            : "needs_review";

      const sellerCompleted =
        classification === "completed";

      const nextMeetupStatus =
        sellerCompleted
          ? "completion_confirmations_requested"
          : classification === "not_completed"
            ? "seller_completion_not_completed"
            : "seller_completion_reply_needs_review";

      const previousNotes =
        String(
          completionTransaction.notes || ""
        ).trim();

      const completionReplyNote =
        `Seller completion reply: "${sellerReply}"\n` +
        `Seller completion classification: ${classification}\n` +
        (
          sellerCompleted
            ? "Seller confirmed the real-world transaction completed. Buyer confirmation is still required."
            : classification === "not_completed"
              ? "Seller reported the transaction did not complete. Human review or re-coordination required."
              : "Seller completion reply requires review."
        );

      const nextNotes =
        previousNotes
          ? `${previousNotes}\n\n${completionReplyNote}`
          : completionReplyNote;

      const {
        data: updatedCompletionTransaction,
        error: completionUpdateError,
      } = await supabase
        .from("brokerage_transactions")
        .update({
          meetup_status:
            nextMeetupStatus,
          seller_confirmed:
            sellerCompleted
              ? true
              : completionTransaction.seller_confirmed,
          notes:
            nextNotes,
        })
        .eq(
          "id",
          completionTransaction.id
        )
        .eq(
          "meetup_status",
          "completion_confirmations_requested"
        )
        .select(
          "id,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
        )
        .single();

      if (completionUpdateError) {
        return NextResponse.json(
          {
            error:
              completionUpdateError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        seller_completion:
          classification,
        transaction_id:
          updatedCompletionTransaction.id,
        meetup_status:
          updatedCompletionTransaction.meetup_status,
        seller_confirmed:
          updatedCompletionTransaction.seller_confirmed,
      });
    }
    // Closing coordination seller replies are routed by exact
    // brokerage transaction ID before negotiation or buyer-email handling.
    const closingSubject =
      receivedEmail.subject || event.data?.subject || "";

    const closingMatch = closingSubject.match(
      /DealHaus Closing Coordination \[([0-9a-f-]{36})\]/i
    );

    if (closingMatch) {
      if (!buyerMessage) {
        return NextResponse.json(
          {
            error:
              "Seller closing reply contained no readable message.",
          },
          { status: 400 }
        );
      }

      const transactionId = closingMatch[1];

      const {
        data: closingTransaction,
        error: closingTransactionError,
      } = await supabase
        .from("brokerage_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (
        closingTransactionError ||
        !closingTransaction
      ) {
        return NextResponse.json(
          {
            error:
              closingTransactionError?.message ||
              "Closing transaction could not be found.",
          },
          { status: 404 }
        );
      }

      if (
        closingTransaction.transaction_status !== "open"
      ) {
        return NextResponse.json(
          {
            error:
              "Closing transaction is not open.",
          },
          { status: 409 }
        );
      }

      if (
        closingTransaction.meetup_status !==
        "seller_coordination_started"
      ) {
        return NextResponse.json(
          {
            error:
              "Closing transaction is not waiting for a seller coordination reply.",
          },
          { status: 409 }
        );
      }

      if (!closingTransaction.seller_lead_id) {
        return NextResponse.json(
          {
            error:
              "Closing transaction has no linked seller lead.",
          },
          { status: 409 }
        );
      }

      const {
        data: closingSellerLead,
        error: closingSellerLeadError,
      } = await supabase
        .from("seller_leads")
        .select(
          "id,seller_name,seller_email,approval_status,agreement_accepted,preferred_contact_method"
        )
        .eq(
          "id",
          closingTransaction.seller_lead_id
        )
        .single();

      if (
        closingSellerLeadError ||
        !closingSellerLead
      ) {
        return NextResponse.json(
          {
            error:
              closingSellerLeadError?.message ||
              "Closing seller lead could not be found.",
          },
          { status: 404 }
        );
      }

      if (
        closingSellerLead.approval_status !==
          "approved" ||
        closingSellerLead.agreement_accepted !== true
      ) {
        return NextResponse.json(
          {
            error:
              "Closing seller is not approved for DealHaus coordination.",
          },
          { status: 403 }
        );
      }

      const expectedSellerEmail =
        String(
          closingSellerLead.seller_email || ""
        )
          .trim()
          .toLowerCase();

      if (
        !expectedSellerEmail ||
        buyerEmail !== expectedSellerEmail
      ) {
        return NextResponse.json(
          {
            error:
              "Seller closing reply sender does not match the transaction seller.",
          },
          { status: 403 }
        );
      }

      const sellerReply =
        buyerMessage.trim();

      const normalizedSellerReply =
        sellerReply.toLowerCase();

      const actionableClosingReply =
        /\b(pick\s*up|pickup|delivery|deliver|assembly|assemble|available|availability|today|tomorrow|morning|afternoon|evening|am|pm|address|location|time)\b/i.test(
          normalizedSellerReply
        );

      const nextMeetupStatus =
        actionableClosingReply
          ? "seller_preference_received"
          : "seller_reply_needs_review";

      const previousNotes =
        String(
          closingTransaction.notes || ""
        ).trim();

      const closingReplyNote =
        `Seller closing reply: "${sellerReply}"\n` +
        `Seller reply classification: ${
          actionableClosingReply
            ? "actionable"
            : "needs_review"
        }\n` +
        (
          actionableClosingReply
            ? "Next step: relay confirmed seller coordination details to buyer."
            : "Next step: seller closing reply requires review before buyer coordination."
        );

      const nextNotes =
        previousNotes
          ? `${previousNotes}\n\n${closingReplyNote}`
          : closingReplyNote;

      const {
        data: updatedClosingTransaction,
        error: closingUpdateError,
      } = await supabase
        .from("brokerage_transactions")
        .update({
          meetup_status:
            nextMeetupStatus,
          notes:
            nextNotes,
        })
        .eq(
          "id",
          closingTransaction.id
        )
        .eq(
          "meetup_status",
          "seller_coordination_started"
        )
        .select(
          "id,buyer_name,seller_name,sale_price,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
        )
        .single();

      if (closingUpdateError) {
        return NextResponse.json(
          {
            error:
              closingUpdateError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        closing_reply:
          actionableClosingReply
            ? "seller_preference_received"
            : "seller_reply_needs_review",
        transaction_id:
          updatedClosingTransaction.id,
        meetup_status:
          updatedClosingTransaction.meetup_status,
      });
    }

    // Seller negotiation replies are routed before normal buyer-email handling.
    const negotiationSubject =
      receivedEmail.subject || event.data?.subject || "";

    const negotiationMatch = negotiationSubject.match(
      /DealHaus Buyer Offer \[([0-9a-f-]{36})\]/i
    );

    if (negotiationMatch) {
      if (!buyerMessage) {
        return NextResponse.json(
          { error: "Seller negotiation reply contained no readable message." },
          { status: 400 }
        );
      }

      const negotiationTaskId = negotiationMatch[1];

      const { data: negotiationTask, error: negotiationError } =
        await supabase
          .from("negotiation_tasks")
          .select("*")
          .eq("id", negotiationTaskId)
          .single();

      if (negotiationError || !negotiationTask) {
        return NextResponse.json(
          {
            error:
              negotiationError?.message ||
              "Negotiation task could not be found.",
          },
          { status: 404 }
        );
      }

      const { data: inventoryItem, error: inventoryError } =
        await supabase
          .from("inventory")
          .select(
            "id,title,seller_email,ready_to_close,deal_stage"
          )
          .eq("id", negotiationTask.inventory_item_id)
          .single();

      if (inventoryError || !inventoryItem) {
        return NextResponse.json(
          {
            error:
              inventoryError?.message ||
              "Negotiation inventory item could not be found.",
          },
          { status: 404 }
        );
      }

      // Verify the email really came from the seller tied to this inventory.
      const approvedSellerEmails = new Set<string>();

      if (inventoryItem.seller_email) {
        approvedSellerEmails.add(
          String(inventoryItem.seller_email).trim().toLowerCase()
        );
      }

      const { data: relistTasks } = await supabase
        .from("ai_relist_tasks")
        .select("seller_lead_id,listing_prep_task_id")
        .eq("inventory_item_id", negotiationTask.inventory_item_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const relistTask = relistTasks?.[0];
      let sellerLeadId = relistTask?.seller_lead_id || null;

      if (!sellerLeadId && relistTask?.listing_prep_task_id) {
        const { data: prepTask } = await supabase
          .from("listing_prep_tasks")
          .select("seller_lead_id")
          .eq("id", relistTask.listing_prep_task_id)
          .single();

        sellerLeadId = prepTask?.seller_lead_id || null;
      }

      if (sellerLeadId) {
        const { data: sellerLead } = await supabase
          .from("seller_leads")
          .select(
            "seller_email,approval_status,agreement_accepted"
          )
          .eq("id", sellerLeadId)
          .single();

        if (
          sellerLead?.approval_status === "approved" &&
          sellerLead?.agreement_accepted === true &&
          sellerLead?.seller_email
        ) {
          approvedSellerEmails.add(
            String(sellerLead.seller_email).trim().toLowerCase()
          );
        }
      }

      if (!approvedSellerEmails.has(buyerEmail)) {
        return NextResponse.json(
          {
            error:
              "Seller negotiation reply sender does not match the approved seller.",
          },
          { status: 403 }
        );
      }

      const sellerReply = buyerMessage.trim();

      const counterMatch = sellerReply.match(
  /^(?:COUNTER|COUNTEROFFER|COUNTER\s+OFFER|I\s+COUNTER(?:\s+AT)?)\s*:?\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/i
);

      if (/^ACCEPT\b/i.test(sellerReply)) {
        const { error: taskUpdateError } = await supabase
          .from("negotiation_tasks")
          .update({
            negotiation_status: "offer_accepted",
          })
          .eq("id", negotiationTask.id);

        if (taskUpdateError) {
          return NextResponse.json(
            { error: taskUpdateError.message },
            { status: 500 }
          );
        }

        const { error: closeError } = await supabase
          .from("inventory")
          .update({
            ready_to_close: true,
            deal_stage: "ready_to_close",
          })
          .eq("id", negotiationTask.inventory_item_id);

        if (closeError) {
          return NextResponse.json(
            { error: closeError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          negotiation_reply: "accepted",
          negotiation_task_id: negotiationTask.id,
          buyer_offer: negotiationTask.current_offer,
        });
      }

      if (/^REJECT\b/i.test(sellerReply)) {
        const { error: rejectError } = await supabase
          .from("negotiation_tasks")
          .update({
            negotiation_status: "offer_rejected",
          })
          .eq("id", negotiationTask.id);

        if (rejectError) {
          return NextResponse.json(
            { error: rejectError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          negotiation_reply: "rejected",
          negotiation_task_id: negotiationTask.id,
        });
      }

      if (counterMatch) {
        const counterAmount = Number(counterMatch[1]);

        if (!Number.isFinite(counterAmount) || counterAmount <= 0) {
          return NextResponse.json(
            { error: "Seller counteroffer amount is invalid." },
            { status: 400 }
          );
        }

        const { error: counterError } = await supabase
          .from("negotiation_tasks")
          .update({
            current_offer: counterAmount,
            negotiation_status: "seller_counter_received",
          })
          .eq("id", negotiationTask.id);

        if (counterError) {
          return NextResponse.json(
            { error: counterError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          negotiation_reply: "counter",
          negotiation_task_id: negotiationTask.id,
          counter_offer: counterAmount,
        });
      }

      return NextResponse.json(
        {
          success: false,
          negotiation_reply: "unclear",
          negotiation_task_id: negotiationTask.id,
          error:
            'Seller reply must clearly say ACCEPT, REJECT, or provide a counteroffer amount.',
        },
        { status: 400 }
      );
    }
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



