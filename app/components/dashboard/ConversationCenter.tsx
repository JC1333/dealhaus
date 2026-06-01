export default function ConversationCenter() {
  const conversations = [
    {
      contact: 'Luxury Buyer Group',
      message: 'Interested in the Rolex inventory.',
      status: 'AI Responded',
      time: '2 min ago',
    },

    {
      contact: 'Sarah Mitchell',
      message: 'Can pickup happen tomorrow?',
      status: 'Awaiting Seller',
      time: '11 min ago',
    },

    {
      contact: 'Elite Tech Traders',
      message: 'Counter offer accepted.',
      status: 'Deal Closing',
      time: '25 min ago',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Conversation Center
          </h3>

          <p className="text-zinc-400 mt-1">
            AI-powered buyer & seller communications
          </p>

        </div>

        <div className="bg-cyan-500/10 border border-cyan-500 px-4 py-2 rounded-2xl text-cyan-400 text-sm font-semibold">
          Messaging AI Active
        </div>

      </div>

      <div className="space-y-4">

        {conversations.map((conversation, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {conversation.contact}
                </h4>

                <p className="text-zinc-400 text-sm mt-2">
                  {conversation.message}
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-semibold">
                  {conversation.status}
                </p>

                <p className="text-zinc-500 text-xs mt-2">
                  {conversation.time}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}