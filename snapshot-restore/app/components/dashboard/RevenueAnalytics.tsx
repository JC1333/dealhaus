export default function RevenueAnalytics() {
  const metrics = [
    {
      label: 'Monthly Revenue',
      value: '$284,500',
      growth: '+18%',
    },

    {
      label: 'Projected Commission',
      value: '$92,000',
      growth: '+11%',
    },

    {
      label: 'Closed Deals',
      value: '148',
      growth: '+24%',
    },

    {
      label: 'AI Conversion Rate',
      value: '91%',
      growth: '+7%',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Revenue Analytics
          </h3>

          <p className="text-zinc-400 mt-1">
            AI brokerage financial intelligence
          </p>

        </div>

        <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl text-green-400 text-sm font-semibold">
          Revenue AI Active
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {metrics.map((metric, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <p className="text-zinc-500 text-sm mb-3">
              {metric.label}
            </p>

            <div className="flex items-end justify-between">

              <h4 className="text-3xl font-bold">
                {metric.value}
              </h4>

              <p className="text-green-400 font-semibold">
                {metric.growth}
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}