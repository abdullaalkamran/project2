"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";

type Props = {
  buyerId: string | null;
  buyerName: string;
  orderCode: string;
  productName: string;
};

export default function QuickMessageModal({ buyerId, buyerName, orderCode, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
      setSent(false);
      setError("");
      setMessage("");
    }
  }, [open]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId, buyerName, message, orderCode, productName }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message ?? "Failed to send message.");
      } else {
        setSent(true);
        setMessage("");
        setTimeout(() => setOpen(false), 1800);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
      >
        <MessageSquare size={13} />
        Message
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-900">Quick Message</p>
                <p className="text-xs text-slate-500">
                  To: <span className="font-medium text-slate-700">{buyerName}</span>
                  <span className="ml-2 text-slate-400">· {orderCode}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {sent ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                    ✓
                  </div>
                  <p className="font-semibold text-emerald-700">Message sent!</p>
                  <p className="text-xs text-slate-500">{buyerName} will see it in their notifications.</p>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-xs text-slate-400">
                    Re: <span className="font-medium text-slate-600">{productName}</span>
                  </p>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                    }}
                    rows={4}
                    placeholder={`Write a message to ${buyerName}...`}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 resize-none"
                  />
                  {error && (
                    <p className="mt-1.5 text-xs text-rose-500">{error}</p>
                  )}
                  <p className="mt-1 text-right text-[10px] text-slate-400">Ctrl+Enter to send</p>
                </>
              )}
            </div>

            {/* Footer */}
            {!sent && (
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <Send size={13} />
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
