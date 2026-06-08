export default function OutreachQueue() {
  const outreachQueue = [
    {
      seller: 'Sarah M.',
      item: 'MacBook Pro M3',
      platform: 'Facebook Marketplace',
      status: 'Awaiting Response',
      ai_agent: 'Seller Outreach Agent',
    },

    {
      seller: 'David R.',
      item: 'Sony A7IV Camera',
      platform: 'OfferUp',
      status: 'Negotiating',
      ai_agent: 'Negotiation Agent',
    },

    {
      seller: 'Emily T.',
      item: 'Commercial Espresso Machine',
      platform: 'Craigslist',
      status: 'Pickup Scheduled',
      ai_agent: 'Appointment Setter Agent',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Outreach Queue
          </h3>

          <p className="text-zinc-400 mt-1">
            Autonomous seller communication pipeline
          </p>

        </div>

        <div className="bg-cyan-500/10 border border-cyan-500 px-4 py-2 rounded-2xl text-cyan-400 text-sm font-semibold">
          AI Active
        </div>

      </div>

      <div className="space-y-4">

        {outreachQueue.map((lead, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {lead.item}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  Seller: {lead.seller}
                </p>

              </div>

              <div className="text-right">

                <p className="text-cyan-400 font-semibold">
                  {lead.platform}
                </p>

                <p className="text-zinc-500 text-xs mt-1">
                  Marketplace Source
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  AI Agent
                </p>

                <p className="font-semibold text-green-400">
                  {lead.ai_agent}
                </p>

              </div>

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  Current Status
                </p>

                <p className="font-semibold text-yellow-400">
                  {lead.status}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}