"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type ThreadMessage = {
  from: "me" | "seller" | "system";
  text: string;
  time: string;
};

type Thread = {
  id: string;
  seller: string;
  lot: string;
  lastMsg: string;
  time: string;
  unread: number;
  messages: ThreadMessage[];
};

export default function BuyerMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<{ threads: Thread[] }>("/api/buyer-dashboard/messages");
        setThreads(data.threads);
        if (data.threads.length > 0) setActiveThreadId(data.threads[0].id);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const active = threads.find((t) => t.id === activeThreadId);
  const messages = active?.messages ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-500">Chat with sellers about your orders and lots.</p>
        </div>
        <div className="h-[540px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500">Chat with sellers about your orders and lots.</p>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          No messages yet. Messages appear here once you have confirmed orders.
        </div>
      ) : (
        <div className="flex h-[540px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Thread list */}
          <aside className="w-64 shrink-0 border-r border-slate-100 overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveThreadId(t.id)}
                className={`w-full text-left px-4 py-4 border-b border-slate-50 transition hover:bg-slate-50 ${activeThreadId === t.id ? "bg-emerald-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.seller}</p>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">{t.time}</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{t.lot}</p>
                <p className="text-xs text-slate-500 truncate mt-1">{t.lastMsg}</p>
                {t.unread > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.unread}</span>
                )}
              </button>
            ))}
          </aside>

          {/* Chat panel */}
          <div className="flex flex-1 flex-col">
            {active ? (
              <>
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="font-semibold text-slate-900">{active.seller}</p>
                  <p className="text-xs text-slate-400">{active.lot}</p>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.from === "me" ? "justify-end" : m.from === "system" ? "justify-center" : "justify-start"}`}>
                      {m.from === "system" ? (
                        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1">{m.text}</span>
                      ) : (
                        <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${m.from === "me" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-800"}`}>
                          <p>{m.text}</p>
                          <p className={`mt-1 text-[10px] ${m.from === "me" ? "text-emerald-200" : "text-slate-400"}`}>{m.time}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => setReply("")}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
