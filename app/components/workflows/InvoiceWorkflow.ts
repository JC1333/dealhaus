import { supabase as defaultSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

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

const COMPANY = {
  name: "DealHaus AI",
  description: "Local AI Marketplace Brokerage",
  email: "invoices@dealhaus.us",
  phoneDisplay: "(702) 608-1303",
  phoneLink: "+17026081303",
  website: "https://www.dealhaus.us",
  websiteDisplay: "www.dealhaus.us",
  location: "Las Vegas, Nevada",
};

const PAYMENT_DETAILS = {
  zelleName: "Crystal Bogdan",
  zellePhone: "(702) 806-9763",
  zellePhoneLink: "+17028069763",

  venmoHandle: "@Crystal-Bogdan3",
  venmoUrl: "https://venmo.com/u/Crystal-Bogdan3",

  cashAppHandle: "$CrystalBogdan",
  cashAppUrl: "https://cash.app/$CrystalBogdan",

  paypalHandle: "@JCB2014",
  paypalUrl: "https://paypal.me/JCB2014",

  applePayName: "Crystal Bogdan",
  applePayPhone: "(702) 806-9763",
  applePayPhoneLink: "+17028069763",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function createInvoiceNumber(transaction: BrokerageTransaction) {
  const year = new Date().getFullYear();
  const shortId = transaction.id
    .replaceAll("-", "")
    .slice(-8)
    .toUpperCase();

  return `DH-${year}-${shortId}`;
}

function createPaymentCard({
  method,
  accountLabel,
  accountValue,
  instructions,
  paymentUrl,
  buttonText,
}: {
  method: string;
  accountLabel: string;
  accountValue: string;
  instructions: string;
  paymentUrl?: string;
  buttonText?: string;
}) {
  const actionButton =
    paymentUrl && buttonText
      ? `
        <a
          href="${paymentUrl}"
          style="
            display:inline-block;
            margin-top:14px;
            padding:10px 17px;
            border-radius:8px;
            background:#0284c7;
            color:#ffffff;
            text-decoration:none;
            font-size:13px;
            font-weight:900;
          "
        >
          ${buttonText}
        </a>
      `
      : "";

  return `
    <table
      role="presentation"
      width="100%"
      height="160"
      cellspacing="0"
      cellpadding="0"
      style="
        width:100%;
        height:160px;
        margin-top:12px;
        border:1px solid #dbe4ef;
        border-radius:12px;
        background:#f8fafc;
        border-collapse:separate;
      "
    >
      <tr>
        <td
          valign="middle"
          style="
            width:56%;
            height:160px;
            padding:20px 24px;
          "
        >
          <div style="font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#64748b;">
            Payment Method
          </div>

          <div style="margin-top:6px;font-size:22px;font-weight:900;color:#0f172a;">
            ${method}
          </div>

          <div style="margin-top:9px;font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">
            ${accountLabel}
          </div>

          <div style="margin-top:4px;font-size:15px;font-weight:900;color:#0284c7;">
            ${accountValue}
          </div>

          ${actionButton}
        </td>

        <td
          valign="middle"
          style="
            width:44%;
            height:160px;
            padding:20px 24px;
            border-left:1px solid #dbe4ef;
            color:#475569;
            font-size:13px;
            line-height:1.6;
          "
        >
          ${instructions}
        </td>
      </tr>
    </table>
  `;
}

export async function runInvoiceWorkflow(supabase: SupabaseClient = defaultSupabase) {
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
        "Seller email is missing. Invoice could not be sent.",
        supabase
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
      transaction.seller_payout ||
        salePrice - commissionAmount
    );

    const invoiceNumber = createInvoiceNumber(transaction);

    const invoiceDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const sellerName = transaction.seller_name || "Seller";

    const itemTitle =
      transaction.item_title || "Completed DealHaus Sale";

    const subject = `Invoice ${invoiceNumber} | DealHaus Commission Due`;

    const plainTextMessage = [
      "DEALHAUS COMMISSION INVOICE",
      "",
      `Invoice Number: ${invoiceNumber}`,
      `Invoice Date: ${invoiceDate}`,
      `Seller: ${sellerName}`,
      `Item Sold: ${itemTitle}`,
      "",
      `Sale Price: ${formatCurrency(salePrice)}`,
      `DealHaus Commission (${commissionRate}%): ${formatCurrency(
        commissionAmount
      )}`,
      `Seller Receives After Commission: ${formatCurrency(
        sellerPayout
      )}`,
      "",
      `TOTAL AMOUNT DUE: ${formatCurrency(commissionAmount)}`,
      "",
      "Payment is due immediately and no later than 24 hours after sale confirmation.",
      "",
      "PAY WITH AN APP",
      `Venmo: ${PAYMENT_DETAILS.venmoHandle}`,
      `Cash App: ${PAYMENT_DETAILS.cashAppHandle}`,
      `PayPal: ${PAYMENT_DETAILS.paypalHandle}`,
      "",
      "PAY BY PHONE OR BANK",
      `Zelle: ${PAYMENT_DETAILS.zelleName}, ${PAYMENT_DETAILS.zellePhone}`,
      `Apple Pay: ${PAYMENT_DETAILS.applePayName}, ${PAYMENT_DETAILS.applePayPhone}`,
      "",
      `Include invoice number ${invoiceNumber} and the item title with your payment.`,
      "",
      `Questions: ${COMPANY.email}`,
      `Business Phone: ${COMPANY.phoneDisplay}`,
      `Website: ${COMPANY.websiteDisplay}`,
      "",
      "Thank you for choosing DealHaus.",
    ].join("\n");

    const paymentCards = [
      createPaymentCard({
        method: "Venmo",
        accountLabel: "Account",
        accountValue: PAYMENT_DETAILS.venmoHandle,
        instructions:
          "Use the button to open Venmo. Include the invoice number and item title with your payment.",
        paymentUrl: PAYMENT_DETAILS.venmoUrl,
        buttonText: "Pay with Venmo",
      }),
      createPaymentCard({
        method: "Cash App",
        accountLabel: "Cash Tag",
        accountValue: PAYMENT_DETAILS.cashAppHandle,
        instructions:
          "Use the button to open Cash App. Include the invoice number and item title with your payment.",
        paymentUrl: PAYMENT_DETAILS.cashAppUrl,
        buttonText: "Pay with Cash App",
      }),
      createPaymentCard({
        method: "PayPal",
        accountLabel: "Account",
        accountValue: PAYMENT_DETAILS.paypalHandle,
        instructions:
          "Use the button to open PayPal. Include the invoice number and item title with your payment.",
        paymentUrl: PAYMENT_DETAILS.paypalUrl,
        buttonText: "Pay with PayPal",
      }),
      createPaymentCard({
        method: "Zelle",
        accountLabel: PAYMENT_DETAILS.zelleName,
        accountValue: PAYMENT_DETAILS.zellePhone,
        instructions:
          "Open your bankâ€™s Zelle service and send the commission using the recipient name and payment number shown.",
      }),
      createPaymentCard({
        method: "Apple Pay",
        accountLabel: PAYMENT_DETAILS.applePayName,
        accountValue: PAYMENT_DETAILS.applePayPhone,
        instructions:
          "Send the commission through Apple Pay using the recipient name and payment number shown.",
      }),
    ].join("");

    const htmlMessage = `
<!doctype html>
<html lang="en">
  <body
    style="
      margin:0;
      padding:0;
      background:#eef4fb;
      font-family:Arial,Helvetica,sans-serif;
      color:#0f172a;
    "
  >
    <div style="display:none;max-height:0;overflow:hidden;">
      DealHaus commission invoice ${escapeHtml(invoiceNumber)}
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="width:100%;background:#eef4fb;padding:24px 10px;"
    >
      <tr>
        <td align="center">

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              width:100%;
              max-width:720px;
              background:#ffffff;
              border:1px solid #dbe4ef;
              border-radius:16px;
              overflow:hidden;
            "
          >
            <tr>
              <td
                style="
                  padding:28px 32px;
                  border-bottom:4px solid #0284c7;
                "
              >
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                >
                  <tr>
                    <td valign="top">
                      <div
                        style="
                          font-size:33px;
                          font-weight:900;
                          letter-spacing:-1px;
                          color:#0f172a;
                        "
                      >
                        DealHaus
                        <span style="color:#0284c7;">AI</span>
                      </div>

                      <div
                        style="
                          margin-top:7px;
                          color:#64748b;
                          font-size:14px;
                        "
                      >
                        ${COMPANY.description}
                      </div>
                    </td>

                    <td
                      align="right"
                      valign="top"
                      style="
                        font-size:13px;
                        line-height:1.75;
                        color:#475569;
                      "
                    >
                      <a
                        href="mailto:${COMPANY.email}"
                        style="color:#0284c7;text-decoration:none;"
                      >
                        ${COMPANY.email}
                      </a><br>

                      <a
                        href="tel:${COMPANY.phoneLink}"
                        style="color:#0284c7;text-decoration:none;"
                      >
                        ${COMPANY.phoneDisplay}
                      </a><br>

                      <a
                        href="${COMPANY.website}"
                        style="color:#0284c7;text-decoration:none;"
                      >
                        ${COMPANY.websiteDisplay}
                      </a><br>

                      ${COMPANY.location}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 32px;">

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                >
                  <tr>
                    <td valign="top">
                      <div
                        style="
                          font-size:13px;
                          font-weight:900;
                          text-transform:uppercase;
                          letter-spacing:1px;
                          color:#0284c7;
                        "
                      >
                        Commission Invoice
                      </div>

                      <h1
                        style="
                          margin:8px 0 0;
                          font-size:30px;
                          line-height:1.15;
                          color:#0f172a;
                        "
                      >
                        Payment for completed sale
                      </h1>
                    </td>

                    <td
                      align="right"
                      valign="top"
                      style="
                        font-size:13px;
                        line-height:1.65;
                        color:#64748b;
                      "
                    >
                      <strong style="color:#0f172a;">
                        Invoice Number
                      </strong><br>

                      ${escapeHtml(invoiceNumber)}<br><br>

                      <strong style="color:#0f172a;">
                        Invoice Date
                      </strong><br>

                      ${escapeHtml(invoiceDate)}
                    </td>
                  </tr>
                </table>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  style="margin-top:24px;"
                >
                  <tr>
                    <td
                      width="50%"
                      valign="top"
                      style="padding-right:7px;"
                    >
                      <div
                        style="
                          min-height:125px;
                          padding:20px;
                          border:1px solid #dbe4ef;
                          border-radius:12px;
                          background:#f8fafc;
                        "
                      >
                        <div
                          style="
                            color:#0284c7;
                            font-size:12px;
                            font-weight:900;
                            text-transform:uppercase;
                          "
                        >
                          Seller
                        </div>

                        <div
                          style="
                            margin-top:7px;
                            font-size:18px;
                            font-weight:900;
                            color:#0f172a;
                          "
                        >
                          ${escapeHtml(sellerName)}
                        </div>

                        <div
                          style="
                            margin-top:17px;
                            color:#0284c7;
                            font-size:12px;
                            font-weight:900;
                            text-transform:uppercase;
                          "
                        >
                          Item Sold
                        </div>

                        <div
                          style="
                            margin-top:7px;
                            font-size:15px;
                            font-weight:700;
                            color:#0f172a;
                          "
                        >
                          ${escapeHtml(itemTitle)}
                        </div>
                      </div>
                    </td>

                    <td
                      width="50%"
                      valign="top"
                      style="padding-left:7px;"
                    >
                      <div
                        style="
                          min-height:125px;
                          padding:20px;
                          border-radius:12px;
                          background:#0369a1;
                          color:#ffffff;
                        "
                      >
                        <div
                          style="
                            font-size:13px;
                            font-weight:900;
                            text-transform:uppercase;
                            color:#bae6fd;
                          "
                        >
                          Total Amount Due
                        </div>

                        <div
                          style="
                            margin-top:7px;
                            font-size:33px;
                            font-weight:900;
                            color:#ffffff;
                          "
                        >
                          ${formatCurrency(commissionAmount)}
                        </div>

                        <div
                          style="
                            margin-top:10px;
                            font-size:15px;
                            font-weight:900;
                            color:#ffffff;
                          "
                        >
                          Payment Due Immediately
                        </div>

                        <div
                          style="
                            margin-top:6px;
                            font-size:13px;
                            line-height:1.45;
                            color:#e0f2fe;
                          "
                        >
                          No later than 24 hours after sale confirmation.
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>

                <div
                  style="
                    margin-top:20px;
                    border:1px solid #dbe4ef;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                  >
                    <tr>
                      <td
                        style="
                          padding:14px 18px;
                          border-bottom:1px solid #dbe4ef;
                          color:#475569;
                        "
                      >
                        Sale Price
                      </td>

                      <td
                        align="right"
                        style="
                          padding:14px 18px;
                          border-bottom:1px solid #dbe4ef;
                          font-weight:800;
                          color:#0f172a;
                        "
                      >
                        ${formatCurrency(salePrice)}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:14px 18px;
                          border-bottom:1px solid #dbe4ef;
                          color:#475569;
                        "
                      >
                        DealHaus Commission (${commissionRate}%)
                      </td>

                      <td
                        align="right"
                        style="
                          padding:14px 18px;
                          border-bottom:1px solid #dbe4ef;
                          font-weight:800;
                          color:#dc2626;
                        "
                      >
                        -${formatCurrency(commissionAmount)}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:14px 18px;
                          color:#475569;
                        "
                      >
                        Seller Receives After Commission
                      </td>

                      <td
                        align="right"
                        style="
                          padding:14px 18px;
                          font-weight:900;
                          color:#16a34a;
                        "
                      >
                        ${formatCurrency(sellerPayout)}
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="margin-top:30px;">
                  <div style="font-size:22px;font-weight:900;color:#0f172a;">
                    Payment Methods
                  </div>

                  <div style="margin-top:6px;color:#64748b;font-size:13px;line-height:1.5;">
                    Choose one payment method below. Every option is displayed in the same format for easy comparison.
                  </div>
                </div>

                ${paymentCards}

                <div
                  style="
                    margin-top:24px;
                    padding:18px;
                    border:1px solid #bae6fd;
                    border-radius:12px;
                    background:#eff6ff;
                    color:#475569;
                    font-size:13px;
                    line-height:1.65;
                  "
                >
                  Include invoice number
                  <strong style="color:#075985;">
                    ${escapeHtml(invoiceNumber)}
                  </strong>
                  and the item title with your payment.

                  Once payment is confirmed, DealHaus will mark the
                  transaction Paid and Closed.
                </div>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  style="
                    margin-top:20px;
                    border:1px solid #dbe4ef;
                    border-radius:12px;
                    background:#f8fafc;
                  "
                >
                  <tr>
                    <td
                      width="50%"
                      valign="middle"
                      style="
                        padding:19px;
                        border-right:1px solid #dbe4ef;
                      "
                    >
                      <div
                        style="
                          font-size:13px;
                          font-weight:900;
                          color:#075985;
                          text-transform:uppercase;
                        "
                      >
                        Questions?
                      </div>

                      <div
                        style="
                          margin-top:8px;
                          color:#475569;
                          font-size:13px;
                          line-height:1.7;
                        "
                      >
                        <a
                          href="mailto:${COMPANY.email}"
                          style="color:#0284c7;text-decoration:none;"
                        >
                          ${COMPANY.email}
                        </a><br>

                        <a
                          href="tel:${COMPANY.phoneLink}"
                          style="color:#0284c7;text-decoration:none;"
                        >
                          ${COMPANY.phoneDisplay}
                        </a>
                      </div>
                    </td>

                    <td
                      width="50%"
                      align="center"
                      valign="middle"
                      style="padding:19px;"
                    >
                      <a
                        href="${COMPANY.website}"
                        style="
                          display:inline-block;
                          padding:12px 20px;
                          border-radius:8px;
                          background:#0284c7;
                          color:#ffffff;
                          text-decoration:none;
                          font-size:13px;
                          font-weight:900;
                        "
                      >
                        Visit DealHaus
                      </a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:21px 32px;
                  background:#082f49;
                  color:#ffffff;
                  text-align:center;
                "
              >
                <div style="font-size:19px;font-weight:900;">
                  DealHaus
                  <span style="color:#38bdf8;">AI</span>
                </div>

                <div
                  style="
                    margin-top:6px;
                    color:#bae6fd;
                    font-size:12px;
                  "
                >
                  Helping You Sell Smarter Â· Built on Integrity
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    try {
      const baseUrl =
        typeof window !== "undefined"
          ? ""
          : process.env.NEXT_PUBLIC_SITE_URL
            ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
            : process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "https://dealhaus.us";

      const response = await fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: transaction.seller_email,
          subject,
          message: plainTextMessage,
          html: htmlMessage,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        invoiceErrors += 1;

        await createInvoiceException(
        transaction,
        responseData?.error ||
            "Invoice email request failed.",
        supabase
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
        `Invoice email sent, but invoice status failed to update: ${updateError.message}`,
        supabase
      );

        continue;
      }

      invoicesSent += 1;
    } catch (error: unknown) {
      invoiceErrors += 1;

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown invoice email error.";

      await createInvoiceException(
        transaction,
        errorMessage,
        supabase
      );
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
  notes: string,
  supabase: SupabaseClient
) {
  const { data: existingException } = await supabase
    .from("exception_tasks")
    .select("id")
    .eq(
      "exception_type",
      "workflow_invoice_send_failed"
    )
    .eq(
      "related_table",
      "brokerage_transactions"
    )
    .eq("related_record_id", transaction.id)
    .eq("exception_status", "open")
    .limit(1);

  if (
    existingException &&
    existingException.length > 0
  ) {
    return;
  }

  await supabase.from("exception_tasks").insert({
    exception_type: "workflow_invoice_send_failed",
    related_table: "brokerage_transactions",
    related_record_id: transaction.id,
    item_title:
      transaction.item_title || "DealHaus Invoice",
    exception_status: "open",
    notes,
  });
}


