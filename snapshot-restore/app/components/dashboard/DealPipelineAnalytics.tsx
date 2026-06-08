export default function DealPipelineAnalytics() {
  const stages = [
    {
      stage: 'Lead Intake',
      deals: 48,
      value: '$182,000',
    },

    {
      stage: 'Negotiation',
      deals: 26,
      value: '$341,000',
    },

    {
      stage: 'Closing',
      deals: 11,
      value: '$128,000',
    },

    {
      stage: 'Completed',
      deals: 64,
      value: '$904,000',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Deal Pipeline Analytics
          </h3>

          <p className="text-zinc-400 mt-1">
            AI brokerage funnel intelligence
          </p>

        </div>

        <div className="bg-yellow-500/10 border border-yellow-500 px-4 py-2 rounded-2xl text-yellow-400 text-sm font-semibold">
          Pipeline AI Active
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {stages.map((stage, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <h4 className="text-lg font-semibold mb-4">
              {stage.stage}
            </h4>

            <div className="space-y-3">

              <div className="flex items-center justify-between">

                <p className="text-zinc-400">
                  Active Deals
                </p>

                <p className="font-semibold text-cyan-400">
                  {stage.deals}
                </p>

              </div>

              <div className="flex items-center justify-between">

                <p className="text-zinc-400">
                  Pipeline Value
                </p>

                <p className="font-semibold text-green-400">
                  {stage.value}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}