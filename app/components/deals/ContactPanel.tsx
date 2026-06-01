type ContactPanelProps = {
  selectedDeal: any
  contactName: string
  setContactName: (value: string) => void
  contactEmail: string
  setContactEmail: (value: string) => void
  contactMessage: string
  setContactMessage: (value: string) => void
  onClose: () => void
  onSend: () => void
}

export default function ContactPanel({
  selectedDeal,
  contactName,
  setContactName,
  contactEmail,
  setContactEmail,
  contactMessage,
  setContactMessage,
  onClose,
  onSend,
}: ContactPanelProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Contact Seller</h2>
            <p className="text-zinc-400 mt-1">{selectedDeal?.title}</p>
          </div>

          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="email"
            placeholder="Your email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
          />

          <textarea
            placeholder="Message seller..."
            rows={6}
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
          />

          <button
            onClick={onSend}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black hover:bg-cyan-300 transition"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}