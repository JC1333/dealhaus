export default function AIWorkforceMonitor() {
  const workforce = [
    {
      agent: 'Lead Acquisition AI',
      tasks: 142,
      efficiency: '98%',
    },

    {
      agent: 'Negotiation AI',
      tasks: 87,
      efficiency: '93%',
    },

    {
      agent: 'Marketplace Sync AI',
      tasks: 214,
      efficiency: '97%',
    },

    {
      agent: 'CRM Follow-Up AI',
      tasks: 176,
      efficiency: '95%',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            AI Workforce Monitor
          </h3>

          <p className="text-zinc-400 mt-1">
            Autonomous workforce execution analytics
          </p>

        </div>

        <div className="bg-cyan-500/10 border border-cyan-500 px-4 py-2 rounded-2xl text-cyan-400 text-sm font-semibold">
          Workforce Active
        </div>

      </div>

      <div className="space-y-4">

        {workforce.map((worker, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-center justify-between">

              <div>

                <h4 className="text-lg font-semibold">
                  {worker.agent}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  {worker.tasks} Active Tasks
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-bold text-xl">
                  {worker.efficiency}
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