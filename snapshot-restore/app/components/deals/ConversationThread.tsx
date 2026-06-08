type ConversationThreadProps = {
  conversation: any
  messages: any[]
  replyMessage: string
  setReplyMessage: (value: string) => void
  onSendReply: () => void
  onClose: () => void
}

export default function ConversationThread({
  conversation,
  messages,
  replyMessage,
  setReplyMessage,
  onSendReply,
  onClose,
}: ConversationThreadProps) {
  if (!conversation) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {conversation.deal_title}
            </h2>

            <p className="text-zinc-400 mt-2 text-lg">
              {conversation.buyer_name} • {conversation.buyer_email}
            </p>
          </div>

          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="text-sm text-cyan-400 font-semibold mb-2">
              Buyer Message
            </p>

            <p className="text-zinc-300 text-lg">
              {conversation.message}
            </p>

            <p className="mt-3 text-xs text-zinc-500">
              {new Date(conversation.created_at).toLocaleString()}
            </p>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className="text-sm text-green-400 font-semibold mb-2">
                {message.sender}
              </p>

              <p className="text-zinc-300 text-lg">
                {message.message}
              </p>

              <p className="mt-3 text-xs text-zinc-500">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-5">
          <textarea
            placeholder="Type your reply..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
          />

          <button
            onClick={onSendReply}
            className="mt-4 w-full rounded-xl bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400 transition"
          >
            Send Reply
          </button>
        </div>
      </div>
    </div>
  )
}