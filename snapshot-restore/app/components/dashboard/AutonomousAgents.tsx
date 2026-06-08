export default function AutonomousAgents() {
  const agents = [
    {
      agent: 'Seller Acquisition Agent',
      status: 'Scanning Facebook Marketplace',
      performance: '98%',
    },

    {
      agent: 'Buyer Match Agent',
      status: 'Matching luxury buyers',
      performance: '94%',
    },

    {
      agent: 'Negotiation Agent',
      status: 'Optimizing counter offers',
      performance: '91%',
    },

    {
      agent: 'Pricing Intelligence Agent',
      status: 'Analyzing resale trends',
      performance: '96%',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Autonomous AI Agents
          </h3>

          <p className="text-zinc-400 mt-1">
            Live brokerage automation systems
          </p>

        </div>

        <div className="bg-red-500/10 border border-red-500 px-4 py-2 rounded-2xl text-red-400 text-sm font-semibold">
          Agents Running
        </div>

      </div>

      <div className="space-y-4">

        {agents.map((agent, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {agent.agent}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  {agent.status}
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-bold text-xl">
                  {agent.performance}
                </p>

                <p className="text-zinc-500 text-xs">
                  Efficiency
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}