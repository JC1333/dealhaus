export default function NegotiationCenter() {
  const negotiations = [
    {
      item: 'Rolex Submariner',
      buyer: 'Luxury Buyer Group',
      offer: '$8,200',
      counter: '$8,750',
      close_probability: '92%',
      ai_agent: 'Negotiation Agent Alpha',
    },

    {
      item: 'Herman Miller Chair',
      buyer: 'Office Liquidators',
      offer: '$950',
      counter: '$1,150',
      close_probability: '81%',
      ai_agent: 'Pricing Agent Sigma',
    },

    {
      item: 'DJI Inspire 3',
      buyer: 'Production Studio',
      offer: '$11,500',
      counter: '$12,000',
      close_probability: '88%',
      ai_agent: 'Broker Agent Omega',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Negotiation Center
          </h3>

          <p className="text-zinc-400 mt-1">
            Autonomous AI deal negotiation system
          </p>

        </div>

        <div className="bg-purple-500/10 border border-purple-500 px-4 py-2 rounded-2xl text-purple-400 text-sm font-semibold">
          AI Negotiating
        </div>

      </div>

      <div className="space-y-4">

        {negotiations.map((deal, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {deal.item}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  Buyer: {deal.buyer}
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-bold">
                  {deal.close_probability}
                </p>

                <p className="text-zinc-500 text-xs">
                  Close Probability
                </p>

              </div>

            </div>

            <div className="grid grid-cols-3 gap-4 mt-5">

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  Buyer Offer
                </p>

                <p className="font-semibold text-cyan-400">
                  {deal.offer}
                </p>

              </div>

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  Counter Offer
                </p>

                <p className="font-semibold text-yellow-400">
                  {deal.counter}
                </p>

              </div>

              <div>

                <p className="text-zinc-500 text-xs mb-1">
                  AI Agent
                </p>

                <p className="font-semibold text-purple-400">
                  {deal.ai_agent}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}