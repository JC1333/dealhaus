export default function AICRM() {
  const leads = [
    {
      seller: 'Sarah Mitchell',
      item: 'Luxury Dining Set',
      status: 'Follow-Up Scheduled',
      value: '$4,800',
    },

    {
      seller: 'James Carter',
      item: 'Sony FX6 Camera',
      status: 'Negotiating',
      value: '$7,200',
    },

    {
      seller: 'Emily Rodriguez',
      item: 'Designer Handbags',
      status: 'Ready To Close',
      value: '$12,500',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            AI CRM
          </h3>

          <p className="text-zinc-400 mt-1">
            Autonomous seller relationship management
          </p>

        </div>

        <div className="bg-cyan-500/10 border border-cyan-500 px-4 py-2 rounded-2xl text-cyan-400 text-sm font-semibold">
          CRM AI Active
        </div>

      </div>

      <div className="space-y-4">

        {leads.map((lead, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {lead.seller}
                </h4>

                <p className="text-zinc-400 text-sm mt-1">
                  {lead.item}
                </p>

              </div>

              <div className="text-right">

                <p className="text-green-400 font-bold">
                  {lead.value}
                </p>

                <p className="text-zinc-500 text-xs">
                  Estimated Value
                </p>

              </div>

            </div>

            <div className="mt-4">

              <span className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 px-3 py-1 rounded-xl text-sm">
                {lead.status}
              </span>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}