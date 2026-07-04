import { runSellerWorkflow } from "./SellerWorkflow";
import { runRelistWorkflow } from "./RelistWorkflow";
import { runBuyerWorkflow } from "./BuyerWorkflow";
import { runNegotiationWorkflow } from "./NegotiationWorkflow";
import { runMarketplaceWorkflow } from "./MarketplaceWorkflow";
import { runRevenueWorkflow } from "./RevenueWorkflow";

export async function runFullWorkflow() {
  const sellerWorkflow = await runSellerWorkflow();
  const relistWorkflow = await runRelistWorkflow();
  const buyerWorkflow = await runBuyerWorkflow();
  const negotiationWorkflow = await runNegotiationWorkflow();
  const marketplaceWorkflow = await runMarketplaceWorkflow();
  const revenueWorkflow = await runRevenueWorkflow();

  const totalErrors =
    sellerWorkflow.errors +
    relistWorkflow.relistErrors +
    buyerWorkflow.buyerMatchErrors +
    buyerWorkflow.buyerOutreachErrors +
    negotiationWorkflow.negotiationErrors +
    marketplaceWorkflow.marketplacePublishErrors +
    revenueWorkflow.revenueErrors;

  return {
    sellerWorkflow,
    relistWorkflow,
    buyerWorkflow,
    negotiationWorkflow,
    marketplaceWorkflow,
    revenueWorkflow,
    totalErrors,
  };
}