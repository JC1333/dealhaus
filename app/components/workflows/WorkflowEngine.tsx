"use client";

import { useEffect, useState } from "react";
import { runSellerWorkflow } from "./SellerWorkflow";
import { runRelistWorkflow } from "./RelistWorkflow";
import { runBuyerWorkflow } from "./BuyerWorkflow";
import { runNegotiationWorkflow } from "./NegotiationWorkflow";
import { runMarketplaceWorkflow } from "./MarketplaceWorkflow";
import { runRevenueWorkflow } from "./RevenueWorkflow";

export default function WorkflowEngine() {
  const [automationEnabled, setAutomationEnabled] = useState(false);

  async function runWorkflow() {
    console.log("Workflow cycle started");

    const sellerWorkflow = await runSellerWorkflow();
    const relistWorkflow = await runRelistWorkflow();
    const buyerWorkflow = await runBuyerWorkflow();
    const negotiationWorkflow = await runNegotiationWorkflow();
    const marketplaceWorkflow = await runMarketplaceWorkflow();
    const revenueWorkflow = await runRevenueWorkflow();

       console.log(
      `Workflow summary: approved=${sellerWorkflow.approvedCount}, alreadyPrepared=${sellerWorkflow.alreadyPrepared}, created=${sellerWorkflow.created}, relistExisting=${relistWorkflow.relistExisting}, relistCreated=${relistWorkflow.relistCreated}, buyerMatchExisting=${buyerWorkflow.buyerMatchExisting}, buyerMatchCreated=${buyerWorkflow.buyerMatchCreated}, buyerOutreachExisting=${buyerWorkflow.buyerOutreachExisting}, buyerOutreachCreated=${buyerWorkflow.buyerOutreachCreated}, negotiationExisting=${negotiationWorkflow.negotiationExisting}, negotiationCreated=${negotiationWorkflow.negotiationCreated}, marketplacePublishExisting=${marketplaceWorkflow.marketplacePublishExisting}, marketplacePublishCreated=${marketplaceWorkflow.marketplacePublishCreated}, revenueExisting=${revenueWorkflow.revenueExisting}, revenueCreated=${revenueWorkflow.revenueCreated}, errors=${
        sellerWorkflow.errors +
        relistWorkflow.relistErrors +
        buyerWorkflow.buyerMatchErrors +
        buyerWorkflow.buyerOutreachErrors +
        negotiationWorkflow.negotiationErrors +
        marketplaceWorkflow.marketplacePublishErrors +
        revenueWorkflow.revenueErrors
      }`
    );
  }

  useEffect(() => {
    const savedSetting = localStorage.getItem("dealhaus_automation_enabled");

    if (savedSetting === "true") {
      setAutomationEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!automationEnabled) {
      console.log("Workflow automation is paused.");
      return;
    }

    runWorkflow();

    const interval = setInterval(() => {
      runWorkflow();
    }, 120000);

    return () => clearInterval(interval);
  }, [automationEnabled]);

  return (
    <button
      onClick={() => {
        const nextValue = !automationEnabled;
        setAutomationEnabled(nextValue);
        localStorage.setItem("dealhaus_automation_enabled", String(nextValue));
      }}
      className={`fixed bottom-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${
        automationEnabled
          ? "bg-green-400 text-black"
          : "bg-zinc-800 text-white border border-zinc-600"
      }`}
    >
      {automationEnabled ? "Automation ON" : "Automation OFF"}
    </button>
  );
}