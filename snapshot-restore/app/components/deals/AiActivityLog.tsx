type AiActivityLogProps = {
  logs: any[]
}

export default function AiActivityLog({ logs }: AiActivityLogProps) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-4xl sm:text-5xl font-bold tracking-tight">
          AI Activity Log
        </h3>

        <div className="rounded-2xl border border-green-500 bg-green-500/10 px-4 py-2">
          <p className="text-green-400 font-semibold">
            {logs.length} Actions
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-zinc-400">No AI outreach activity yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-zinc-800 bg-black p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-bold text-white">
                    {log.deal_title}
                  </p>

                  <p className="mt-1 text-sm text-cyan-400">
                    AI Outreach • {log.status}
                  </p>
                </div>

                <p className="text-xs text-zinc-500">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>

              <p className="mt-4 text-zinc-300 leading-relaxed">
                {log.outreach_message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}