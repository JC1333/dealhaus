'use client';

type GoLiveChecklistProps = {
  sellerLeadCount: number;
  queueCount: number;
  activeDealCount: number;
  conversationCount: number;
  closedDealCount: number;
};

export default function GoLiveChecklist({
  sellerLeadCount,
  queueCount,
  activeDealCount,
  conversationCount,
  closedDealCount,
}: GoLiveChecklistProps) {
  const checklist = [
    {
      title: 'Add 5 real marketplace seller leads',
      status: sellerLeadCount >= 5 ? 'done' : 'needs_action',
      detail: `${sellerLeadCount} seller leads currently tracked`,
    },
    {
      title: 'Contact sellers and mark outreach status',
      status: sellerLeadCount > 0 ? 'in_progress' : 'needs_action',
      detail: 'Use Copy Outreach Message and Mark Contacted',
    },
    {
      title: 'Approve seller + commission agreement',
      status: queueCount > 0 ? 'done' : 'needs_action',
      detail: `${queueCount} items approved or waiting in relist queue`,
    },
    {
      title: 'Generate AI buyer-facing listings',
      status: activeDealCount > 0 ? 'done' : 'needs_action',
      detail: `${activeDealCount} active listings currently live`,
    },
    {
      title: 'Contact buyers and track responses',
      status: conversationCount > 0 ? 'in_progress' : 'needs_action',
      detail: `${conversationCount} buyer conversations tracked`,
    },
    {
      title: 'Close first commission deal',
      status: closedDealCount > 0 ? 'done' : 'needs_action',
      detail: `${closedDealCount} closed deals recorded`,
    },
  ];

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">
          Go Live Operations Checklist
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Daily action list focused on getting DealHaus from leads to commission.
        </p>
      </div>

      <div className="grid gap-4">
        {checklist.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-zinc-800 bg-black p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.status === 'done'
                    ? 'bg-green-500/20 text-green-400'
                    : item.status === 'in_progress'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {item.status === 'done'
                  ? 'DONE'
                  : item.status === 'in_progress'
                  ? 'IN PROGRESS'
                  : 'NEEDS ACTION'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}