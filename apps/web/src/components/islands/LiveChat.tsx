import { useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  author: string;
  body: string;
};

export default function LiveChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function addMessage(body: string) {
    const entry = {
      id: crypto.randomUUID(),
      author: 'You',
      body,
    };
    setMessages((prev) => [...prev, entry]);
  }

  return (
    <div className="flex h-80 flex-col rounded-xl border border-white/10 bg-neutral-900/70">
      <header className="px-4 py-3 text-sm font-semibold text-neutral-100">
        Live Editorial Chat
      </header>
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm text-neutral-200"
      >
        {messages.length === 0 ? (
          <p className="text-neutral-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-primary-300">
                {message.author}
              </span>
              <span>{message.body}</span>
            </div>
          ))
        )}
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          addMessage(draft.trim());
          setDraft('');
        }}
      >
        <input
          className="flex-1 rounded-lg border border-white/10 bg-neutral-950/80 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          placeholder="Type a message…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg border border-primary-500/40 bg-primary-500/20 px-4 py-2 text-sm font-semibold text-primary-200 hover:bg-primary-500/30"
        >
          Send
        </button>
      </form>
    </div>
  );
}
