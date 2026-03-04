"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  /** When true, renders a read-only display (locked field in QC form) */
  disabled?: boolean;
  error?: string;
  /** Allow clearing the selection. Default true */
  clearable?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option…",
  disabled = false,
  error,
  clearable = true,
}: SearchableSelectProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  /* close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* close on Escape */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* auto-focus search when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQuery("");
  }, [open]);

  /* ── disabled (locked) state: plain read-only display ── */
  if (disabled) {
    return (
      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-default min-h-[38px] flex items-center">
        {value || <span className="text-slate-400">{placeholder}</span>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm outline-none transition
          focus:ring-2 focus:ring-emerald-100
          ${open
            ? "border-emerald-400 ring-2 ring-emerald-100 bg-white"
            : error
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
      >
        <span className={`truncate ${value ? "text-slate-800" : "text-slate-400"}`}>
          {value || placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {clearable && value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Search size={13} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 italic text-center">
                No results for &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((opt) => {
                const selected = opt === value;
                return (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={selected}
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition
                      ${selected
                        ? "bg-emerald-50 text-emerald-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <span className="flex-1">{opt}</span>
                    {selected && <Check size={13} className="shrink-0 text-emerald-500" />}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer hint */}
          {options.length > 10 && (
            <div className="border-t border-slate-100 px-3 py-1.5">
              <p className="text-[10px] text-slate-400">
                {filtered.length} of {options.length} options
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
