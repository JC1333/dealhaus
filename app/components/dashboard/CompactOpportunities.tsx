export default function CompactOpportunities() {
  const opportunities = [
    {
      title: 'Rolex Submariner',
      score: 98,
      price: '$14,500',
    },

    {
      title: 'MacBook Pro Bundle',
      score: 91,
      price: '$6,200',
    },

    {
      title: 'Sony FX6 Camera Kit',
      score: 94,
      price: '$11,800',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

      <div className="flex items-center justify-between mb-4">

        <div>

          <h3 className="text-lg font-semibold">
            Top Opportunities
          </h3>

          <p className="text-zinc-500 text-sm">
            AI-ranked listings
          </p>

        </div>

        <div className="text-green-400 text-sm font-semibold">
          Live
        </div>

      </div>

      <div className="space-y-2">

        {opportunities.map((item, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-lg px-3 py-2"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="font-medium text-sm">
                  {item.title}
                </p>

                <p className="text-zinc-500 text-xs mt-1">
                  {item.price}
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-bold text-sm">
                  {item.score}
                </p>

                <p className="text-zinc-500 text-[10px]">
                  AI
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}