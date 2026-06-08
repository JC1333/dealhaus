export default function NotificationsCenter() {
  const notifications = [
    {
      event: 'New luxury buyer matched',
      detail: 'Buyer Match AI found a verified buyer for Rolex inventory.',
      time: '1 min ago',
    },

    {
      event: 'Seller responded',
      detail: 'Sarah Mitchell confirmed pickup appointment.',
      time: '7 min ago',
    },

    {
      event: 'AI price optimization complete',
      detail: 'Pricing Intelligence Agent updated listing values.',
      time: '14 min ago',
    },

    {
      event: 'Marketplace sync completed',
      detail: 'Facebook Marketplace listings successfully synchronized.',
      time: '22 min ago',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Notifications Center
          </h3>

          <p className="text-zinc-400 mt-1">
            Real-time AI brokerage alerts
          </p>

        </div>

        <div className="bg-red-500/10 border border-red-500 px-4 py-2 rounded-2xl text-red-400 text-sm font-semibold">
          Live Events
        </div>

      </div>

      <div className="space-y-4">

        {notifications.map((notification, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {notification.event}
                </h4>

                <p className="text-zinc-400 text-sm mt-2">
                  {notification.detail}
                </p>

              </div>

              <div>

                <p className="text-zinc-500 text-xs whitespace-nowrap">
                  {notification.time}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}