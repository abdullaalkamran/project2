"use client";

import { useState } from "react";

const threads = [
  { id: 1, seller: "Rahim Agro", lot: "Premium Basmati Rice", last: "When can we arrange delivery?", time: "10:42 AM", unread: 2 },
  { id: 2, seller: "Karim Traders", lot: "Mustard Oil — 500 L", last: "Please confirm your delivery address.", time: "Yesterday", unread: 0 },
  { id: 3, seller: "Alam Mills", lot: "Wheat Flour — 3,000 kg", last: "Your order has been dispatched.", time: "Feb 18", unread: 0 },
];

const msgMap: Record<number, { from: "me" | "seller"; text: string; time: string }[]> = {
  1: [
    { from: "seller", text: "Hello! Your bid on Premium Basmati Rice has been accepted.", time: "9:00 AM" },
    { from: "me", text: "Great! When can we arrange delivery?", time: "10:42 AM" },
  ],
  2: [
    { from: "seller", text: "Please confirm your delivery address so we can dispatch.", time: "Yesterday 3:00 PM" },
  ],
  3: [
    { from: "seller", text: "Your order ORD-2026-009 has been dispatched. Tracking: BD123456789", time: "Feb 18 11:00 AM" },
    { from: "me", text: "Thank you!", time: "Feb 18 11:30 AM" },
  ],
};

export default function BuyerMessagesPage() {
  const [activeThread, setActiveThread] = useState(threads[0].id);
  const [reply, setReply] = useState("");

  const active = threads.find((t) => t.id === activeThread)!;
  const messages = msgMap[activeThread] ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500">Chat with sellers about your orders and lots.</p>
      </div>

      <div className="flex h-[540px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Thread list */}
        <aside className="w-64 shrink-0 border-r border-slate-100 overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveThread(t.id)}
              className={`w-full text-left px-4 py-4 border-b border-slate-50 transition hover:bg-slate-50 ${activeThread === t.id ? "bg-emerald-50" : ""}`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.seller}</p>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{t.time}</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{t.lot}</p>
              <p className="text-xs text-slate-500 truncate mt-1">{t.last}</p>
              {t.unread > 0 && (
                <span className="mt-1 inline-block rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.unread}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Chat panel */}
        <div className="flex flex-1 flex-col">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="font-semibold text-slate-900">{active.seller}</p>
            <p className="text-xs text-slate-400">{active.lot}</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${m.from === "me" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-800"}`}>
                  <p>{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.from === "me" ? "text-emerald-200" : "text-slate-400"}`}>{m.time}</p>
                </div>
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
        </div>
      </div>
    </div>
  );
}
