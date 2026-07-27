import { runSellerWorkflow } from "./SellerWorkflow";
import { runRelistWorkflow } from "./RelistWorkflow";
import { runBuyerWorkflow } from "./BuyerWorkflow";
import { runNegotiationWorkflow } from "./NegotiationWorkflow";
import { runMarketplaceWorkflow } from "./MarketplaceWorkflow";
import { runRevenueWorkflow } from "./RevenueWorkflow";
import { runInvoiceWorkflow } from "./InvoiceWorkflow";

export async function runFullWorkflow() {
  console.log("WORKFLOW START: Seller");
  const sellerWorkflow = await runSellerWorkflow();
  console.log("WORKFLOW COMPLETE: Seller");

  console.log("WORKFLOW START: Relist");
  const relistWorkflow = await runRelistWorkflow();
  console.log("WORKFLOW COMPLETE: Relist");

  console.log("WORKFLOW START: Buyer");
  const buyerWorkflow = await runBuyerWorkflow();
  console.log("WORKFLOW COMPLETE: Buyer");

  console.log("WORKFLOW START: Negotiation");
  const negotiationWorkflow = await runNegotiationWorkflow();
  console.log("WORKFLOW COMPLETE: Negotiation");

  console.log("WORKFLOW START: Marketplace");
  const marketplaceWorkflow = await runMarketplaceWorkflow();
  console.log("WORKFLOW COMPLETE: Marketplace");

  console.log("WORKFLOW START: Invoice");
  const invoiceWorkflow = await runInvoiceWorkflow();
  console.log("WORKFLOW COMPLETE: Invoice");

  console.log("WORKFLOW START: Revenue");
  const revenueWorkflow = await runRevenueWorkflow();
  console.log("WORKFLOW COMPLETE: Revenue");

  const totalErrors =
    sellerWorkflow.errors +
    relistWorkflow.relistErrors +
    buyerWorkflow.buyerMatchErrors +
    buyerWorkflow.buyerOutreachErrors +
    negotiationWorkflow.negotiationErrors +
    marketplaceWorkflow.marketplacePublishErrors +
    revenueWorkflow.revenueErrors +
    invoiceWorkflow.invoiceErrors;

  return {
    sellerWorkflow,
    relistWorkflow,
    buyerWorkflow,
    negotiationWorkflow,
    marketplaceWorkflow,
    revenueWorkflow,
    invoiceWorkflow,
    totalErrors,
  };
}
