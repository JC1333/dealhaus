export default function MarketplaceSync() {
  const marketplaces = [
    {
      platform: 'Facebook Marketplace',
      listings: 124,
      status: 'Synced',
      traffic: '+18%',
    },

    {
      platform: 'OfferUp',
      listings: 72,
      status: 'Synced',
      traffic: '+9%',
    },

    {
      platform: 'eBay',
      listings: 58,
      status: 'AI Optimizing',
      traffic: '+22%',
    },

    {
      platform: 'Craigslist',
      listings: 31,
      status: 'Monitoring',
      traffic: '+4%',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            Marketplace Sync
          </h3>

          <p className="text-zinc-400 mt-1">
            Live multi-platform inventory synchronization
          </p>

        </div>

        <div className="bg-green-500/10 border border-green-500 px-4 py-2 rounded-2xl text-green-400 text-sm font-semibold">
          Sync Active
        </div>

      </div>

      <div className="space-y-4">

        {marketplaces.map((marketplace, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {marketplace.platform}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  {marketplace.listings} Active Listings
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-semibold">
                  {marketplace.status}
                </p>

                <p className="text-zinc-500 text-xs mt-1">
                  Sync Status
                </p>

              </div>

            </div>

            <div className="mt-4">

              <p className="text-cyan-400 font-semibold">
                Traffic Growth: {marketplace.traffic}
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}