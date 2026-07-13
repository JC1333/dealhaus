import { supabase } from "@/lib/supabase";

type BrokerageTransaction = {
  id: string;
  inventory_item_id: number | null;
  item_title: string | null;
  seller_name: string | null;
  seller_email: string | null;
  sale_price: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  seller_payout: number | null;
  buyer_confirmed: boolean | null;
  seller_confirmed: boolean | null;
  invoice_status: string | null;
  payment_status: string | null;
};

export async function runInvoiceWorkflow() {
  let invoicesSent = 0;
  let invoicesExisting = 0;
  let invoiceErrors = 0;

  const { data: transactions, error: transactionError } = await supabase
    .from("brokerage_transactions")
    .select(`
      id,
      inventory_item_id,
      item_title,
      seller_name,
      seller_email,
      sale_price,
      commission_rate,
      commission_amount,
      seller_payout,
      buyer_confirmed,
      seller_confirmed,
      invoice_status,
      payment_status
    `)
    .eq("buyer_confirmed", true)
    .eq("seller_confirmed", true)
    .eq("payment_status", "unpaid")
    .limit(100);

  if (transactionError) {
    console.error(
      "Invoice workflow transaction load error:",
      transactionError.message
    );

    return {
      invoicesSent,
      invoicesExisting,
      invoiceErrors: invoiceErrors + 1,
    };
  }

  const eligibleTransactions =
    (transactions as BrokerageTransaction[] | null) || [];

  for (const transaction of eligibleTransactions) {
    if (
      transaction.invoice_status === "sent" ||
      transaction.invoice_status === "paid"
    ) {
      invoicesExisting += 1;
      continue;
    }

    if (transaction.invoice_status !== "not_sent") {
      invoicesExisting += 1;
      continue;
    }

    if (!transaction.seller_email) {
      invoiceErrors += 1;

      await createInvoiceException(
        transaction,
        "Seller email is missing. Invoice could not be sent."
      );

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

    const subject = `DealHaus commission invoice — ${
      transaction.item_title || "Completed sale"
    }`;

    const message = [
      `Hello ${transaction.seller_name || "Seller"},`,
      "",
      `Both the buyer and seller have confirmed the completed sale of:`,
      `${transaction.item_title || "your DealHaus listing"}`,
      "",
      `Sale price: $${salePrice.toFixed(2)}`,
      `DealHaus commission rate: ${commissionRate}%`,
      `Commission due: $${commissionAmount.toFixed(2)}`,
      `Seller payout after commission: $${sellerPayout.toFixed(2)}`,
      "",
      "Please submit the DealHaus commission using one of the approved payment methods shown in your DealHaus instructions.",
      "",
      "Once payment is received, the transaction will be marked paid and closed.",
      "",
      "Thank you,",
      "DealHaus",
    ].join("\n");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: transaction.seller_email,
          subject,
          message,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        invoiceErrors += 1;

        await createInvoiceException(
          transaction,
          responseData?.error || "Invoice email request failed."
        );

        continue;
      }

      const { error: updateError } = await supabase
        .from("brokerage_transactions")
        .update({
          invoice_status: "sent",
        })
        .eq("id", transaction.id);

      if (updateError) {
        invoiceErrors += 1;

        await createInvoiceException(
          transaction,
          `Invoice email sent, but invoice status failed to update: ${updateError.message}`
        );

        continue;
      }

      invoicesSent += 1;
    } catch (error: unknown) {
      invoiceErrors += 1;

      const message =
        error instanceof Error
          ? error.message
          : "Unknown invoice email error.";

      await createInvoiceException(transaction, message);
    }
  }

  return {
    invoicesSent,
    invoicesExisting,
    invoiceErrors,
  };
}

async function createInvoiceException(
  transaction: BrokerageTransaction,
  notes: string
) {
  const { data: existingException } = await supabase
    .from("exception_tasks")
    .select("id")
    .eq("exception_type", "workflow_invoice_send_failed")
    .eq("related_table", "brokerage_transactions")
    .eq("related_record_id", transaction.id)
    .eq("exception_status", "open")
    .limit(1);

  if (existingException && existingException.length > 0) {
    return;
  }

  await supabase.from("exception_tasks").insert({
    exception_type: "workflow_invoice_send_failed",
    related_table: "brokerage_transactions",
    related_record_id: transaction.id,
    item_title: transaction.item_title || "DealHaus Invoice",
    exception_status: "open",
    notes,
  });
}