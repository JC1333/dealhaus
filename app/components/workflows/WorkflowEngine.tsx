"use client";

import { useEffect } from "react";
import { runSellerWorkflow } from "./SellerWorkflow";
import { runRelistWorkflow } from "./RelistWorkflow";
import { runBuyerWorkflow } from "./BuyerWorkflow";
import { runNegotiationWorkflow } from "./NegotiationWorkflow";

export default function WorkflowEngine() {
  async function runWorkflow() {
    console.log("Workflow cycle started");

    const sellerWorkflow = await runSellerWorkflow();
    const relistWorkflow = await runRelistWorkflow();
    const buyerWorkflow = await runBuyerWorkflow();
    const negotiationWorkflow = await runNegotiationWorkflow();

    console.log(
      `Workflow summary: approved=${sellerWorkflow.approvedCount}, alreadyPrepared=${sellerWorkflow.alreadyPrepared}, created=${sellerWorkflow.created}, relistExisting=${relistWorkflow.relistExisting}, relistCreated=${relistWorkflow.relistCreated}, buyerMatchExisting=${buyerWorkflow.buyerMatchExisting}, buyerMatchCreated=${buyerWorkflow.buyerMatchCreated}, buyerOutreachExisting=${buyerWorkflow.buyerOutreachExisting}, buyerOutreachCreated=${buyerWorkflow.buyerOutreachCreated}, negotiationExisting=${negotiationWorkflow.negotiationExisting}, negotiationCreated=${negotiationWorkflow.negotiationCreated}, errors=${
        sellerWorkflow.errors +
        relistWorkflow.relistErrors +
        buyerWorkflow.buyerMatchErrors +
        buyerWorkflow.buyerOutreachErrors +
        negotiationWorkflow.negotiationErrors
      }`
    );
  }

  useEffect(() => {
    runWorkflow();

    const interval = setInterval(() => {
      runWorkflow();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return null;
}