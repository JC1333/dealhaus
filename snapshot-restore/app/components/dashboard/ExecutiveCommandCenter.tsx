export default function ExecutiveCommandCenter() {
  const stats = [
    {
      label: 'AI Systems Online',
      value: '23',
      color: 'text-green-400',
    },

    {
      label: 'Daily Brokerage Volume',
      value: '$184K',
      color: 'text-cyan-400',
    },

    {
      label: 'Autonomous Decisions',
      value: '1,284',
      color: 'text-yellow-400',
    },

    {
      label: 'Active Negotiations',
      value: '67',
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-8">

        <div>

          <h3 className="text-3xl font-semibold">
            Executive Command Center
          </h3>

          <p className="text-zinc-400 mt-2">
            Real-time AI brokerage operational overview
          </p>

        </div>

        <div className="bg-green-500/10 border border-green-500 px-5 py-3 rounded-2xl text-green-400 font-semibold">
          Systems Operational
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {stats.map((stat, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <p className="text-zinc-500 text-sm mb-3">
              {stat.label}
            </p>

            <h4 className={`text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </h4>

          </div>

        ))}

      </div>

    </div>
  )
}