'use client'

import GoLiveChecklist from './GoLiveChecklist'
import AgentOrchestrator from './AgentOrchestrator'
import WorkflowMonitor from "./WorkflowMonitor";
import WorkflowControlCenter from "./WorkflowControlCenter";

type DashboardWorkspaceProps = {
  sellerLeadCount: number
  queueCount: number
  activeDealCount: number
  conversationCount: number
  closedDealCount: number
  projectedCommission: number
  activeDealValue: number
  closedCommission: number
  totalPipelineCommission: number
}

export default function DashboardWorkspace({
  sellerLeadCount,
  queueCount,
  activeDealCount,
  conversationCount,
  closedDealCount,
  projectedCommission,
  activeDealValue,
  closedCommission,
  totalPipelineCommission,
}: DashboardWorkspaceProps) {
  const dashboardStats = [
    {
      label: 'Total Pipeline Commission',
      value: `$${Math.round(totalPipelineCommission).toLocaleString()}`,
    },
    {
      label: 'Projected Commission',
      value: `$${Math.round(projectedCommission).toLocaleString()}`,
    },
    {
      label: 'Active Deal Value',
      value: `$${Math.round(activeDealValue).toLocaleString()}`,
    },
    {
      label: 'Closed Commission',
      value: `$${Math.round(closedCommission).toLocaleString()}`,
    },
    {
      label: 'Seller Leads',
      value: sellerLeadCount,
    },
    {
      label: 'AI Relist Queue',
      value: queueCount,
    },
    {
      label: 'Active Deals',
      value: activeDealCount,
    },
    {
      label: 'Buyer Conversations',
      value: conversationCount,
    },
    {
      label: 'Closed Deals',
      value: closedDealCount,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Operations Dashboard
          </h1>

          <p className="text-zinc-400 mt-3 text-base sm:text-lg">
            Executive command center for DealHaus AI brokerage operations.
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500 px-5 py-3 rounded-2xl">
          <p className="text-green-400 font-semibold">
            AI Systems Online
          </p>
        </div>
      </div>

      <AgentOrchestrator />
<WorkflowControlCenter />
<WorkflowMonitor />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {dashboardStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-800 bg-black p-5"
          >
            <p className="text-xs text-zinc-500">
              {stat.label}
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <GoLiveChecklist
        sellerLeadCount={sellerLeadCount}
        queueCount={queueCount}
        activeDealCount={activeDealCount}
        conversationCount={conversationCount}
        closedDealCount={closedDealCount}
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-2xl font-bold text-white">
          Owner Focus
        </h2>

        <p className="text-zinc-400 mt-2">
          DealHaus is now organized into focused workspaces. Use this dashboard
          to monitor agent health, KPI progress, launch readiness, and business
          performance. Daily operations now live inside Marketplace Ingestion,
          Active Deals, AI Conversations, and Revenue Analytics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-zinc-500 text-sm">
              Your Role
            </p>

            <p className="text-white font-bold mt-2">
              Review exceptions, revenue, and major approvals.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-zinc-500 text-sm">
              AI Role
            </p>

            <p className="text-white font-bold mt-2">
              Monitor workflows, score opportunities, and advance pipeline tasks.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-zinc-500 text-sm">
              Launch Focus
            </p>

            <p className="text-white font-bold mt-2">
              Real seller acquisition, real buyer acquisition, and autonomous follow-up.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}