export default function AIFinancialForecasting() {
  const forecasts = [
    {
      metric: 'Projected Monthly Revenue',
      value: '$482,000',
      growth: '+21%',
    },

    {
      metric: 'Expected Commission Growth',
      value: '$96,400',
      growth: '+14%',
    },

    {
      metric: 'Predicted Deal Closures',
      value: '182',
      growth: '+18%',
    },

    {
      metric: 'AI Market Expansion',
      value: '4 New Markets',
      growth: '+9%',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            AI Financial Forecasting
          </h3>

          <p className="text-zinc-400 mt-1">
            Predictive brokerage financial intelligence
          </p>

        </div>

        <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl text-green-400 text-sm font-semibold">
          Forecast AI Active
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {forecasts.map((forecast, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <p className="text-zinc-500 text-sm mb-3">
              {forecast.metric}
            </p>

            <div className="flex items-end justify-between">

              <h4 className="text-3xl font-bold">
                {forecast.value}
              </h4>

              <p className="text-green-400 font-semibold">
                {forecast.growth}
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}