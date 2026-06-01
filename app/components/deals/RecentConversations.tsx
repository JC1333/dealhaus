type RecentConversationsProps = {
  conversations: any[]
  onSelectConversation: (conversation: any) => void
}

export default function RecentConversations({
  conversations,
  onSelectConversation,
}: RecentConversationsProps) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Recent Conversations
        </h3>

        <div className="rounded-2xl border border-cyan-500 bg-cyan-500/10 px-4 py-2">
          <p className="text-cyan-400 font-semibold">
            {conversations.filter((c) => c.unread_count > 0).length} Active
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <p className="text-zinc-400">No conversations yet.</p>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className="cursor-pointer rounded-2xl border border-zinc-800 bg-black p-6 hover:border-cyan-500 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xl font-bold text-white">
                    {conversation.deal_title}
                  </p>

                  <p className="text-base text-zinc-400 mt-1">
                    {conversation.buyer_name} • {conversation.buyer_email}
                  </p>

                  <p className="mt-2 text-lg text-zinc-300 line-clamp-2">
                    {conversation.message}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(conversation.created_at).toLocaleString()}
                  </p>
                </div>

                {Number(conversation.unread_count) > 0 && (
                  <div className="flex h-10 min-w-[40px] items-center justify-center rounded-full bg-green-500 px-3">
                    <span className="font-bold text-black">
                      {conversation.unread_count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}