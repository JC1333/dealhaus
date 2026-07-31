import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.WORKFLOW_RUNNER_SECRET;
  const providedSecret = request.headers.get("x-workflow-secret");

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "WORKFLOW_RUNNER_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabase();

  const result = {
    listingPrepCreated: 0,
    listingPrepExisting: 0,
    relistCreated: 0,
    relistExisting: 0,
    inventoryGenerated: 0,
    marketplaceTasksCreated: 0,
    marketplaceTasksExisting: 0,
    brokerageTransactionsCreated: 0,
    errors: [] as string[],
  };

  try {
    /*
     * STAGE 1:
     * Approved and authorized sellers -> listing prep
     */
    const { data: approvedLeads, error: approvedLeadsError } =
      await supabase
        .from("seller_leads")
        .select(`
          id,
          item_title,
          seller_name,
          seller_city,
          seller_state,
          asking_price,
          estimated_profit
        `)
        .eq("approval_status", "approved")
        .eq("agreement_accepted", true)
        .limit(100);

    if (approvedLeadsError) {
      throw new Error(
        `Seller approval query failed: ${approvedLeadsError.message}`
      );
    }

    for (const lead of approvedLeads || []) {
      const { data: existingPrep, error: prepLookupError } =
        await supabase
          .from("listing_prep_tasks")
          .select("id")
          .eq("seller_lead_id", lead.id)
          .limit(1);

      if (prepLookupError) {
        result.errors.push(
          `Listing prep lookup failed for ${lead.id}: ${prepLookupError.message}`
        );
        continue;
      }

      if (existingPrep && existingPrep.length > 0) {
        result.listingPrepExisting += 1;
      } else {
        const { error: prepInsertError } = await supabase
          .from("listing_prep_tasks")
          .insert({
            seller_lead_id: lead.id,
            item_title: lead.item_title,
            seller_name: lead.seller_name,
            seller_city: lead.seller_city,
            seller_state: lead.seller_state,
            asking_price: lead.asking_price,
            estimated_profit: lead.estimated_profit,
            prep_status: "ready_for_relist",
          });

        if (prepInsertError) {
          result.errors.push(
            `Listing prep insert failed for ${lead.id}: ${prepInsertError.message}`
          );
          continue;
        }

        result.listingPrepCreated += 1;
      }

      const { error: leadStatusError } = await supabase
        .from("seller_leads")
        .update({
          status: "sent_to_relist_queue",
        })
        .eq("id", lead.id)
        .neq("status", "sent_to_relist_queue");

      if (leadStatusError) {
        result.errors.push(
          `Seller status update failed for ${lead.id}: ${leadStatusError.message}`
        );
      }
    }

    /*
     * STAGE 2:
     * Listing prep -> AI relist task -> generated inventory
     */
    const { data: prepTasks, error: prepTasksError } = await supabase
      .from("listing_prep_tasks")
      .select("id, seller_lead_id")
      .eq("prep_status", "ready_for_relist")
      .limit(100);

    if (prepTasksError) {
      throw new Error(
        `Relist prep query failed: ${prepTasksError.message}`
      );
    }

    const origin = new URL(request.url).origin;

    for (const task of prepTasks || []) {
      if (!task.seller_lead_id) {
        result.errors.push(
          `Listing prep task ${task.id} has no seller_lead_id.`
        );
        continue;
      }

      const { data: sellerLead, error: sellerLeadError } =
        await supabase
          .from("seller_leads")
          .select("status, approval_status, agreement_accepted")
          .eq("id", task.seller_lead_id)
          .single();

      if (
        sellerLeadError ||
        !sellerLead ||
        sellerLead.status !== "sent_to_relist_queue" ||
        sellerLead.approval_status !== "approved" ||
        sellerLead.agreement_accepted !== true
      ) {
        continue;
      }

      const { data: existingRelist, error: relistLookupError } =
        await supabase
          .from("ai_relist_tasks")
          .select("id, inventory_item_id")
          .eq("listing_prep_task_id", task.id)
          .limit(1);

      if (relistLookupError) {
        result.errors.push(
          `Relist lookup failed for ${task.id}: ${relistLookupError.message}`
        );
        continue;
      }

      if (existingRelist && existingRelist.length > 0) {
        result.relistExisting += 1;
        continue;
      }

      const { data: newRelistTask, error: relistInsertError } =
        await supabase
          .from("ai_relist_tasks")
          .insert({
            listing_prep_task_id: task.id,
            relist_status: "pending",
          })
          .select("id")
          .single();

      if (relistInsertError || !newRelistTask) {
        result.errors.push(
          `Relist insert failed for ${task.id}: ${
            relistInsertError?.message || "No relist task returned."
          }`
        );
        continue;
      }

      result.relistCreated += 1;

      const aiResponse = await fetch(
        `${origin}/api/generate-ai-relist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId: newRelistTask.id,
          }),
          signal: AbortSignal.timeout(120000),
        }
      );

      if (!aiResponse.ok) {
        const responseText = await aiResponse.text();

        result.errors.push(
          `AI relist generation failed for ${newRelistTask.id}: ${responseText}`
        );
        continue;
      }

      result.inventoryGenerated += 1;
    }

    /*
     * STAGE 3:
     * Active inventory -> marketplace publish task and transaction
     */
    const { data: inventoryItems, error: inventoryError } =
      await supabase
        .from("inventory")
        .select(`
          id,
          title,
          price,
          status,
          seller_name,
          seller_email
        `)
        .eq("status", "active")
        .limit(100);

    if (inventoryError) {
      throw new Error(
        `Inventory query failed: ${inventoryError.message}`
      );
    }

    for (const item of inventoryItems || []) {
      let publishTaskId: string | null = null;

      const { data: existingPublish, error: publishLookupError } =
        await supabase
          .from("marketplace_publish_tasks")
          .select("id")
          .eq("inventory_item_id", item.id)
          .limit(1);

      if (publishLookupError) {
        result.errors.push(
          `Publish lookup failed for ${item.id}: ${publishLookupError.message}`
        );
        continue;
      }

      if (existingPublish && existingPublish.length > 0) {
        publishTaskId = existingPublish[0].id;
        result.marketplaceTasksExisting += 1;
      } else {
        const { data: newPublishTask, error: publishInsertError } =
          await supabase
            .from("marketplace_publish_tasks")
            .insert({
              inventory_item_id: item.id,
              item_title: item.title || "Marketplace Listing",
              listing_price: item.price || 0,
              facebook_url: "",
              offerup_url: "",
              craigslist_url: "",
              publish_status: "ready_to_publish",
            })
            .select("id")
            .single();

        if (publishInsertError || !newPublishTask) {
          result.errors.push(
            `Publish task insert failed for ${item.id}: ${
              publishInsertError?.message || "No publish task returned."
            }`
          );
          continue;
        }

        publishTaskId = newPublishTask.id;
        result.marketplaceTasksCreated += 1;
      }

      const { data: existingTransaction, error: transactionLookupError } =
        await supabase
          .from("brokerage_transactions")
          .select("id")
          .eq("inventory_item_id", item.id)
          .limit(1);

      if (transactionLookupError) {
        result.errors.push(
          `Transaction lookup failed for ${item.id}: ${transactionLookupError.message}`
        );
        continue;
      }

      if (!existingTransaction || existingTransaction.length === 0) {
        const { data: relistLink, error: relistLinkError } =
          await supabase
            .from("ai_relist_tasks")
            .select("listing_prep_task_id")
            .eq("inventory_item_id", item.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (relistLinkError || !relistLink?.listing_prep_task_id) {
          result.errors.push(
            `Seller link lookup failed for inventory ${item.id}: ${
              relistLinkError?.message || "No listing prep task link found."
            }`
          );
          continue;
        }

        const { data: prepLink, error: prepLinkError } =
          await supabase
            .from("listing_prep_tasks")
            .select("seller_lead_id")
            .eq("id", relistLink.listing_prep_task_id)
            .maybeSingle();

        if (prepLinkError || !prepLink?.seller_lead_id) {
          result.errors.push(
            `Seller lead lookup failed for inventory ${item.id}: ${
              prepLinkError?.message || "No seller lead link found."
            }`
          );
          continue;
        }

        const salePrice = Number(item.price || 0);

        const { error: transactionInsertError } = await supabase
          .from("brokerage_transactions")
          .insert({
            inventory_item_id: item.id,
            seller_lead_id: prepLink.seller_lead_id,
            marketplace_publish_task_id: publishTaskId,
            item_title: item.title || "Marketplace Listing",
            seller_name: item.seller_name || "Marketplace Seller",
            seller_email: item.seller_email || null,
            sale_price: salePrice,
            commission_rate: 10,
            commission_amount: salePrice * 0.1,
            seller_payout: salePrice * 0.9,
            meetup_status: "pending",
            buyer_confirmed: false,
            seller_confirmed: false,
            invoice_status: "not_sent",
            payment_status: "unpaid",
            transaction_status: "open",
          });

        if (transactionInsertError) {
          result.errors.push(
            `Transaction insert failed for ${item.id}: ${transactionInsertError.message}`
          );
        } else {
          result.brokerageTransactionsCreated += 1;
        }
      }
    }

    return NextResponse.json({
      ok: result.errors.length === 0,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown workflow error.";

    console.error("SERVER WORKFLOW ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        result,
      },
      { status: 500 }
    );
  }
}

