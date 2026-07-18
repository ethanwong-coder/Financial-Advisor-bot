"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Spinner } from "@/components/Spinner";

interface Msg {
  role: "USER" | "ASSISTANT";
  content: string;
}

function TypingDots() {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}

export default function ChatPage() {
  const reduce = useReducedMotion();
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
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, [messages, loading, reduce]);

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
        {messages.length === 0 && !loading && (
          <p className="text-sm text-slate-400">
            Try: “What does my inherited-IRA flag mean?” or “Which beneficiary
            issues should I look at first?”
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={m.role === "USER" ? "text-right" : "text-left"}
            >
              <div
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "USER"
                    ? "bg-brand text-white shadow-sm"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="text-left">
            <TypingDots />
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          className="input"
          placeholder="Ask about a flag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className="btn-primary" disabled={loading || !input.trim()}>
          {loading ? <Spinner className="h-4 w-4" /> : "Send"}
        </button>
      </form>
    </div>
  );
}
