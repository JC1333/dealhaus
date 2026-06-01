export async function GET() {

  const importedDeals = [

    {
      title: 'Luxury Watch Collection',
      source: 'Facebook Marketplace',
      aiScore: 96,
      spread: '$4,200',
      demand: 'Extremely High',
      qualification: 'High Arbitrage',
    },

    {
      title: 'RH Cloud Couch',
      source: 'OfferUp',
      aiScore: 91,
      spread: '$2,850',
      demand: 'High',
      qualification: 'High Arbitrage',
    },

    {
      title: 'Commercial Gym Equipment',
      source: 'Craigslist',
      aiScore: 88,
      spread: '$6,100',
      demand: 'Institutional Buyers',
      qualification: 'High Arbitrage',
    },

  ]

  return Response.json(importedDeals)

}