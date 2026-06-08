export default function AIRiskManagement() {
  const risks = [
    {
      alert: 'High-value seller verification required',
      severity: 'Medium Risk',
      status: 'Monitoring',
    },

    {
      alert: 'Marketplace pricing anomaly detected',
      severity: 'Low Risk',
      status: 'AI Reviewing',
    },

    {
      alert: 'Buyer authenticity confirmed',
      severity: 'No Risk',
      status: 'Verified',
    },

    {
      alert: 'Rapid listing activity spike',
      severity: 'Medium Risk',
      status: 'Tracking',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h3 className="text-xl font-semibold">
            AI Risk Management
          </h3>

          <p className="text-zinc-400 mt-1">
            Autonomous transaction safety monitoring
          </p>

        </div>

        <div className="bg-red-500/10 border border-red-500 px-4 py-2 rounded-2xl text-red-400 text-sm font-semibold">
          Risk AI Active
        </div>

      </div>

      <div className="space-y-4">

        {risks.map((risk, index) => (

          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-2xl p-5"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h4 className="text-lg font-semibold">
                  {risk.alert}
                </h4>

                <p className="text-zinc-400 text-sm mt-2">
                  {risk.status}
                </p>

              </div>

              <div className="text-right">

                <p className="text-yellow-400 font-semibold">
                  {risk.severity}
                </p>

                <p className="text-zinc-500 text-xs mt-2">
                  AI Classification
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}