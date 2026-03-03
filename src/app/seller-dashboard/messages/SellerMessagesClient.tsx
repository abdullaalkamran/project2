"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type ThreadMessage = {
  from: "buyer" | "seller" | "system";
  text: string;
  time: string;
};

type Thread = {
  id: string;
  buyer: string;
  lot: string;
  lastMsg: string;
  time: string;
  unread: number;
  messages: ThreadMessage[];
};

type MessagesResponse = {
  threads: Thread[];
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [reply, setReply] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<MessagesResponse>("/api/seller-dashboard/messages");
        const list = res.threads ?? [];
        setThreads(list);
        setActiveId(list[0]?.id ?? "");
      } catch {
        setThreads([]);
        setActiveId("");
      }
    };
    void load();
  }, []);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500">Real buyer conversations based on your order history.</p>
      </div>

      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:grid-cols-[280px_1fr]">
        <div className="border-b border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-100">
          {threads.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">No message threads yet.</div>
          )}
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setActiveId(thread.id)}
              className={`w-full border-b border-slate-50 px-4 py-4 text-left transition hover:bg-slate-50 ${activeId === thread.id ? "bg-emerald-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{thread.buyer}</span>
                <span className="text-xs text-slate-400">{thread.time}</span>
              </div>
              <p className="mt-0.5 text-xs text-emerald-700">{thread.lot}</p>
              <p className="mt-1 truncate text-sm text-slate-500">{thread.lastMsg}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {active ? (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="font-semibold text-slate-900">{active.buyer}</p>
                <p className="text-xs text-emerald-700">{active.lot}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {active.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "seller" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm ${
                        msg.from === "seller"
                          ? "bg-emerald-500 text-white"
                          : msg.from === "system"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {msg.text}
                      <p className={`mt-1 text-[10px] ${msg.from === "seller" ? "text-emerald-100" : "text-slate-400"}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a reply…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    onKeyDown={(e) => e.key === "Enter" && setReply("")}
                  />
                  <button
                    type="button"
                    onClick={() => setReply("")}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-sm text-slate-500">Select a thread to view conversation.</div>
          )}
        </div>
      </div>
    </div>
  );
}
