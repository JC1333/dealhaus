import { supabase as defaultSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type RevenueSource = {
  inventoryItemId: number;
  itemTitle: string;
  salePrice: number;
  commissionRate: number;
  commissionAmount: number;
  sellerPayout: number;
  relatedTable: string;
  relatedRecordId: string | number;
};

async function recordException(
  exceptionType: string,
  source: RevenueSource,
  notes: string,
  supabase: SupabaseClient
) {
  const { data: existingException } = await supabase
    .from("exception_tasks")
    .select("id")
    .eq("exception_type", exceptionType)
    .eq("related_table", source.relatedTable)
    .eq("related_record_id", source.relatedRecordId)
    .eq("exception_status", "open")
    .limit(1);

  if (existingException && existingException.length > 0) {
    return;
  }

  await supabase.from("exception_tasks").insert({
    exception_type: exceptionType,
    related_table: source.relatedTable,
    related_record_id: source.relatedRecordId,
    item_title: source.itemTitle,
    exception_status: "open",
    notes,
  });
}

async function createRevenueRecord(source: RevenueSource, supabase: SupabaseClient) {
  const { data: existingRevenueRecords, error: existingError } =
    await supabase
      .from("revenue_records")
      .select("id")
      .eq("inventory_item_id", source.inventoryItemId)
      .limit(1);

  if (existingError) {
    return {
      created: false,
      existing: false,
      error: existingError.message,
    };
  }

  if (existingRevenueRecords && existingRevenueRecords.length > 0) {
    return {
      created: false,
      existing: true,
      error: null,
    };
  }

  const { error: revenueError } = await supabase
    .from("revenue_records")
    .insert({
      inventory_item_id: source.inventoryItemId,
      item_title: source.itemTitle,
      sale_price: source.salePrice,
      commission_rate: source.commissionRate,
      commission_amount: source.commissionAmount,
      seller_payout: source.sellerPayout,
      revenue_status: "earned",
    });

  if (revenueError) {
    await recordException(
      "workflow_revenue_creation_failed",
      source,
      revenueError.message,
      supabase
    );

    return {
      created: false,
      existing: false,
      error: revenueError.message,
    };
  }

  return {
    created: true,
    existing: false,
    error: null,
  };
}

async function closeInventory(source: RevenueSource, supabase: SupabaseClient) {
  const { error } = await supabase
    .from("inventory")
    .update({ status: "closed" })
    .eq("id", source.inventoryItemId);

  if (error) {
    await recordException(
      "workflow_inventory_close_failed_after_revenue",
      source,
      error.message,
      supabase
    );

    return false;
  }

  return true;
}

export async function runRevenueWorkflow(supabase: SupabaseClient = defaultSupabase) {
  let revenueCreated = 0;
  let revenueExisting = 0;
  let revenueErrors = 0;

  /*
   * Primary closing path:
   * Brokerage Center transaction is confirmed, paid, and closed.
   */
  const {
    data: closedTransactions,
    error: closedTransactionsError,
  } = await supabase
    .from("brokerage_transactions")
    .select(`
      id,
      inventory_item_id,
      marketplace_publish_task_id,
      item_title,
      sale_price,
      commission_rate,
      commission_amount,
      seller_payout,
      payment_status,
      transaction_status
    `)
    .eq("payment_status", "paid")
    .neq("transaction_status", "closed")
    .limit(100);

  if (closedTransactionsError) {
    revenueErrors += 1;

    console.log(
      "Workflow closed brokerage sweep error:",
      closedTransactionsError.message
    );
  } else if (closedTransactions && closedTransactions.length > 0) {
    for (const transaction of closedTransactions) {
      if (!transaction.inventory_item_id) {
        revenueErrors += 1;
        continue;
      }

      const salePrice = Number(transaction.sale_price || 0);
      const commissionRate = Number(transaction.commission_rate || 10);
      const commissionAmount = Number(
        transaction.commission_amount ||
          salePrice * (commissionRate / 100)
      );
      const sellerPayout = Number(
        transaction.seller_payout || salePrice - commissionAmount
      );

      const source: RevenueSource = {
        inventoryItemId: Number(transaction.inventory_item_id),
        itemTitle: transaction.item_title || "Untitled Deal",
        salePrice,
        commissionRate,
        commissionAmount,
        sellerPayout,
        relatedTable: "brokerage_transactions",
        relatedRecordId: transaction.id,
      };

      const result = await createRevenueRecord(source, supabase);

      if (result.error) {
        revenueErrors += 1;
        continue;
      }

      if (result.existing) {
        revenueExisting += 1;
      }

      if (result.created) {
        revenueCreated += 1;
      }

      if (transaction.marketplace_publish_task_id) {
        const { error: publishError } = await supabase
          .from("marketplace_publish_tasks")
          .update({ publish_status: "sold" })
          .eq("id", transaction.marketplace_publish_task_id);

        if (publishError) {
          revenueErrors += 1;

          await recordException(
            "workflow_marketplace_sold_sync_failed",
            source,
            publishError.message,
            supabase
          );
        }
      } else {
        const { error: publishError } = await supabase
          .from("marketplace_publish_tasks")
          .update({ publish_status: "sold" })
          .eq("inventory_item_id", transaction.inventory_item_id);

        if (publishError) {
          revenueErrors += 1;

          await recordException(
            "workflow_marketplace_sold_sync_failed",
            source,
            publishError.message,
            supabase
          );
        }
      }

      const inventoryClosed = await closeInventory(source, supabase);

      if (!inventoryClosed) {
        revenueErrors += 1;
        continue;
      }

      const { error: transactionCloseError } = await supabase
        .from("brokerage_transactions")
        .update({
          transaction_status: "closed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("payment_status", "paid")
        .neq("transaction_status", "closed");

      if (transactionCloseError) {
        revenueErrors += 1;

        await recordException(
          "workflow_transaction_close_failed_after_revenue",
          source,
          transactionCloseError.message,
          supabase
        );
      }
    }
  }

  /*
   * Existing fallback path:
   * A marketplace publish task was manually marked sold.
   */
  const { data: soldPublishTasks, error: soldTasksError } =
    await supabase
      .from("marketplace_publish_tasks")
      .select(
        "id, inventory_item_id, item_title, listing_price, publish_status"
      )
      .eq("publish_status", "sold")
      .limit(100);

  if (soldTasksError) {
    revenueErrors += 1;

    console.log(
      "Workflow sold publish-task sweep error:",
      soldTasksError.message
    );
  } else if (soldPublishTasks && soldPublishTasks.length > 0) {
    for (const task of soldPublishTasks) {
      if (!task.inventory_item_id) {
        revenueErrors += 1;
        continue;
      }

      const salePrice = Number(task.listing_price || 0);
      const commissionRate = 10;
      const commissionAmount = salePrice * 0.1;
      const sellerPayout = salePrice - commissionAmount;

      const source: RevenueSource = {
        inventoryItemId: Number(task.inventory_item_id),
        itemTitle: task.item_title || "Untitled Deal",
        salePrice,
        commissionRate,
        commissionAmount,
        sellerPayout,
        relatedTable: "marketplace_publish_tasks",
        relatedRecordId: task.id,
      };

      const result = await createRevenueRecord(source, supabase);

      if (result.error) {
        revenueErrors += 1;
        continue;
      }

      if (result.existing) {
        revenueExisting += 1;
      }

      if (result.created) {
        revenueCreated += 1;
      }

      const inventoryClosed = await closeInventory(source, supabase);

      if (!inventoryClosed) {
        revenueErrors += 1;
      }
    }
  }

  return {
    revenueCreated,
    revenueExisting,
    revenueErrors,
  };
}








