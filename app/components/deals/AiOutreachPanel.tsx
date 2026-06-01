type AiOutreachPanelProps = {
  deal: any
  outreachMessage: string
  setOutreachMessage: (value: string) => void
  onGenerate: () => void
  onSend: () => void
  onClose: () => void
}

export default function AiOutreachPanel({
  deal,
  outreachMessage,
  setOutreachMessage,
  onGenerate,
  onSend,
  onClose,
}: AiOutreachPanelProps) {
  if (!deal) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">
              AI Seller Outreach
            </h2>

            <p className="text-zinc-400 mt-2 text-lg">
              {deal.title}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-5">
          <p className="text-zinc-400 mb-4">
            AI-generated seller outreach message:
          </p>

          <textarea
            value={outreachMessage}
            onChange={(e) => setOutreachMessage(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
          />

          <div className="grid grid-cols-2 gap-4 mt-5">
            <button
              onClick={onGenerate}
              className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black hover:bg-cyan-300 transition"
            >
              Regenerate AI Message
            </button>

            <button
              onClick={onSend}
              className="rounded-xl bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400 transition"
            >
              Send Outreach
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}