export default function BuyerMatchEngine() {
  const buyers = [
    {
      buyer: 'Luxury Living Group',
      interest: 'Designer Furniture',
      budget: '$25,000',
      ai_score: 96,
      intent: 'High Intent',
    },

    {
      buyer: 'Elite Tech Traders',
      interest: 'Apple Products',
      budget: '$18,500',
      ai_score: 91,
      intent: 'Ready To Buy',
    },

    {
      buyer: 'Production Hub LA',
      interest: 'Camera Equipment',
      budget: '$42,000',
      ai_score: 94,
      intent: 'Active Acquisition',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Buyer Match Engine
          </h3>

          <p className="text-zinc-400 mt-1">
            AI-powered buyer acquisition intelligence
          </p>

        </div>

        <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl text-green-400 text-sm font-semibold">
          Buyer AI Active
        </div>

      </div>

      <div className="space-y-4">

        {buyers.map((buyer, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {buyer.buyer}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  Interested In: {buyer.interest}
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-bold text-xl">
                  {buyer.ai_score}
                </p>

                <p className="text-zinc-500 text-xs">
                  AI Match Score
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  Acquisition Budget
                </p>

                <p className="font-semibold text-cyan-400">
                  {buyer.budget}
                </p>

              </div>

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  Buyer Intent
                </p>

                <p className="font-semibold text-yellow-400">
                  {buyer.intent}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}