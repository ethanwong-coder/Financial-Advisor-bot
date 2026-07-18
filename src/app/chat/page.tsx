"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "USER" | "ASSISTANT";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages ?? []));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "USER", content: text }]);
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "The assistant is unavailable.");
      return;
    }
    setMessages((m) => [...m, { role: "ASSISTANT", content: data.reply }]);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Assistant</h1>
      <p className="mb-4 text-sm text-slate-500">
        Ask about your flags in plain English. The assistant explains what the
        checks found and what facts are missing — it does not compute deadlines
        itself and never gives investment or legal advice.
      </p>

      <div className="card min-h-[50vh] space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Try: “What does my inherited-IRA flag mean?” or “Which beneficiary
            issues should I look at first?”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "USER" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "USER"
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-slate-400">Thinking…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          className="input"
          placeholder="Ask about a flag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn-primary" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
