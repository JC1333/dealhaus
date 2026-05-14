const listings = [
  {
    title: 'Modern White Sofa',
    price: '$450',
    city: 'Las Vegas',
    image:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
  },
  {
    title: 'Wood Dining Table',
    price: '$300',
    city: 'Henderson',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
  },
  {
    title: 'Luxury Bed Frame',
    price: '$600',
    city: 'Summerlin',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-16">
          <div>
            <h1 className="text-6xl font-bold">
              DealHaus
            </h1>

            <p className="text-white/70 text-xl mt-4">
              AI-powered furniture marketplace
            </p>
          </div>

          <button className="bg-white text-black px-6 py-3 rounded-2xl font-semibold">
            Sell Furniture
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {listings.map((listing) => (
            <div
              key={listing.title}
              className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
            >
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-64 object-cover"
              />

              <div className="p-6">
                <h2 className="text-2xl font-bold">
                  {listing.title}
                </h2>

                <p className="text-white/70 mt-2">
                  {listing.city}
                </p>

                <div className="flex items-center justify-between mt-6">
                  <span className="text-3xl font-bold">
                    {listing.price}
                  </span>

                  <button className="bg-white text-black px-4 py-2 rounded-xl">
                    View Deal
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}