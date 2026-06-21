"use client";

import DashboardWorkspace from "./workspaces/DashboardWorkspace";
import DealsWorkspace from "./workspaces/DealsWorkspace";
import ConversationsWorkspace from "./workspaces/ConversationsWorkspace";
import RevenueWorkspace from "./workspaces/RevenueWorkspace";
import IngestionWorkspace from "./workspaces/IngestionWorkspace";
import SellerOnboarding from "./seller/SellerOnboarding";

type WorkspaceRouterProps = {
  activeWorkspace: string;
  sellerLeadCount: number;
  queueCount: number;
  activeDealCount: number;
  conversationCount: number;
  closedDealCount: number;
  projectedCommission: number;
  activeDealValue: number;
  closedCommission: number;
  totalPipelineCommission: number;
  sellerSubmissions: any[];
  onGenerateListing: (submission: any) => void;
  onRefreshSubmissions: () => void;
  sellerOnboardingForm: any;
  setSellerOnboardingForm: (form: any) => void;
  submitSellerOnboarding: () => void;
  inventory: any[];
};

export default function WorkspaceRouter({
  activeWorkspace,
  sellerLeadCount,
  queueCount,
  activeDealCount,
  conversationCount,
  closedDealCount,
  projectedCommission,
  activeDealValue,
  closedCommission,
  totalPipelineCommission,
  sellerSubmissions,
  onGenerateListing,
  onRefreshSubmissions,
  sellerOnboardingForm,
  setSellerOnboardingForm,
  submitSellerOnboarding,
  inventory,
}: WorkspaceRouterProps) {
  if (activeWorkspace === "dashboard") {
    return (
      <DashboardWorkspace
        sellerLeadCount={sellerLeadCount}
        queueCount={queueCount}
        activeDealCount={activeDealCount}
        conversationCount={conversationCount}
        closedDealCount={closedDealCount}
        projectedCommission={projectedCommission}
        activeDealValue={activeDealValue}
        closedCommission={closedCommission}
        totalPipelineCommission={totalPipelineCommission}
      />
    );
  }

  if (activeWorkspace === "deals") {
    return <DealsWorkspace />;
  }

  if (activeWorkspace === "conversations") {
    return <ConversationsWorkspace />;
  }

  if (activeWorkspace === "revenue") {
    return <RevenueWorkspace />;
  }

  if (activeWorkspace === "ingestion") {
    return (
      <IngestionWorkspace
        sellerSubmissions={sellerSubmissions}
        onGenerateListing={onGenerateListing}
        onRefreshSubmissions={onRefreshSubmissions}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SellerOnboarding
        form={sellerOnboardingForm}
        setForm={setSellerOnboardingForm}
        onSubmit={submitSellerOnboarding}
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
        <h3 className="text-2xl font-semibold mb-6">
          Latest Active Listings
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {inventory.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="bg-black border border-zinc-800 rounded-2xl overflow-hidden"
            >
              <img
                src={
                  item.image ||
                  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop"
                }
                alt={item.title}
                className="h-80 w-full object-cover"
              />

              <div className="p-4">
                <h4 className="font-semibold text-base">{item.title}</h4>

                <p className="text-green-400 font-bold mt-2">
                  ${Number(item.price || item.asking_price || 0).toLocaleString()}
                </p>

                <p className="text-zinc-400 text-sm mt-2">
                  {item.seller_city || "Location pending"} {item.seller_state || ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}