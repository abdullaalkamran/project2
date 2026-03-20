"use client";

type Props = {
  lotStatus: string;
  orderStatus?: string | null;
  loadConfirmed?: boolean;
  dispatched?: boolean;
  pickedUpAt?: Date | string | null;
  compact?: boolean;
  orderOnly?: boolean;
  lotOnly?: boolean;
  hideHeader?: boolean;
};

type StepState = "done" | "active" | "failed" | "grey";

const LOT_STEPS  = ["Lot Created", "Hub Registered", "In QC", "QC Submitted", "QC Passed", "Live"];
const ORDER_STEPS = ["Order Confirmed", "Goods at Hub", "Dispatched", "Hub Received", "Out for Delivery", "Delivered"];

const STATE_DESC: Record<StepState, string> = {
  done:   "Completed",
  active: "In progress",
  failed: "QC Failed — lot rejected",
  grey:   "Not reached yet",
};

const LOT_ORDER = [
  "PENDING_DELIVERY","AT_HUB","IN_QC","QC_SUBMITTED",
  "QC_PASSED","QC_FAILED","LIVE","AUCTION_ENDED","SOLD","DELIVERED",
];

function lotRank(s: string) { const i = LOT_ORDER.indexOf(s); return i === -1 ? 0 : i; }

function computeStates(p: Props): StepState[] {
  const { lotStatus, orderStatus, loadConfirmed, dispatched, pickedUpAt } = p;
  const failed = lotStatus === "QC_FAILED";
  const rank   = lotRank(lotStatus);

  const s1: StepState = "done";
  const s2: StepState = rank >= lotRank("AT_HUB")        ? "done" : "active";
  const s3: StepState = rank >= lotRank("IN_QC")         ? "done" : rank === lotRank("AT_HUB")        ? "active" : "grey";
  const s4: StepState = rank >= lotRank("QC_SUBMITTED")  ? "done" : rank === lotRank("IN_QC")         ? "active" : "grey";
  const s5: StepState = failed ? "failed"
    : rank >= lotRank("QC_PASSED") ? "done"
    : rank === lotRank("QC_SUBMITTED") ? "active" : "grey";
  const s6: StepState = failed ? "grey"
    : rank >= lotRank("LIVE")     ? "done"
    : rank === lotRank("QC_PASSED") ? "active" : "grey";

  const enabled = !failed && rank >= lotRank("LIVE");
  const OS = ["CONFIRMED","DISPATCHED","HUB_RECEIVED","OUT_FOR_DELIVERY","ARRIVED","PICKED_UP"];
  const or = orderStatus ? OS.indexOf(orderStatus) : -1;

  const s7:  StepState = !enabled ? "grey" : or >= 0 ? "done" : "active";
  const s8:  StepState = !enabled ? "grey" : loadConfirmed ? "done" : or >= 0 ? "active" : "grey";
  const s9:  StepState = !enabled ? "grey"
    : (dispatched || or >= OS.indexOf("DISPATCHED")) ? "done" : loadConfirmed ? "active" : "grey";
  const s10: StepState = !enabled ? "grey"
    : or >= OS.indexOf("HUB_RECEIVED") ? "done"
    : (dispatched || or >= OS.indexOf("DISPATCHED")) ? "active" : "grey";
  const s11: StepState = !enabled ? "grey"
    : or >= OS.indexOf("OUT_FOR_DELIVERY") ? "done"
    : or >= OS.indexOf("HUB_RECEIVED") ? "active" : "grey";
  const s12: StepState = !enabled ? "grey"
    : (orderStatus === "PICKED_UP" || pickedUpAt != null) ? "done"
    : or >= OS.indexOf("OUT_FOR_DELIVERY") ? "active" : "grey";

  return [s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12];
}

// ── Dot ──────────────────────────────────────────────────────────────────────

function Dot({ state, num, compact }: { state: StepState; num: number; compact?: boolean }) {
  const base = "shrink-0 rounded-full flex items-center justify-center transition-all duration-200 cursor-default group-hover/step:scale-125";
  const sz   = compact ? "w-4 h-4" : "w-5 h-5 text-[9px] font-bold";

  if (state === "done") return (
    <div className={`${base} ${sz} bg-emerald-500 shadow-sm group-hover/step:shadow-emerald-300 group-hover/step:shadow-md`}>
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );

  if (state === "failed") return (
    <div className={`${base} ${sz} bg-rose-500 shadow-sm group-hover/step:shadow-rose-300 group-hover/step:shadow-md`}>
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );

  if (state === "active") return (
    <div style={{ boxShadow: "0 0 0 3px rgba(59,130,246,0.15), 0 0 8px rgba(59,130,246,0.2)" }}
      className={`${base} ${sz} bg-white border-2 border-blue-500`}>
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
    </div>
  );

  return (
    <div className={`${base} ${sz} bg-white border-2 border-slate-200 text-slate-400 group-hover/step:border-slate-300`}>
      {!compact && num}
    </div>
  );
}

// ── Connector line ────────────────────────────────────────────────────────────

function Line({ from, to }: { from: StepState; to: StepState | null; side?: "left" | "right" }) {
  if (!to) return <div className="flex-1" />;
  const green = from === "done" && to !== "grey";
  const fade  = from === "done" && to === "active";
  return (
    <div className="relative flex-1 flex items-center" style={{ height: 2 }}>
      {fade ? (
        <div className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(to right, #10b981, #cbd5e1)" }} />
      ) : (
        <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${green ? "bg-emerald-400" : "bg-slate-200"}`} />
      )}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const TIP_BG: Record<StepState, string> = {
  done:   "bg-emerald-600",
  active: "bg-blue-600",
  failed: "bg-rose-600",
  grey:   "bg-slate-600",
};

function Tip({ state, label, num }: { state: StepState; label: string; num: number }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-3 -translate-x-1/2
      opacity-0 group-hover/step:opacity-100 transition-all duration-150
      group-hover/step:-translate-y-0 translate-y-1 scale-95 group-hover/step:scale-100">
      <div className={`${TIP_BG[state]} rounded-xl px-3 py-2 shadow-xl text-white min-w-[110px] text-center`}>
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Step {num}</p>
        <p className="text-[11px] font-semibold leading-tight">{label}</p>
        <p className="text-[9px] opacity-75 mt-0.5">{STATE_DESC[state]}</p>
      </div>
      {/* caret */}
      <div className={`mx-auto w-2.5 h-2.5 rotate-45 -mt-1.5 ${TIP_BG[state]}`} />
    </div>
  );
}

// ── Phase row ─────────────────────────────────────────────────────────────────

const PHASE_ICON_LOT = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
  </svg>
);
const PHASE_ICON_ORDER = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16l2 .001M13 16H9m4 0h2m0 0h2a1 1 0 001-1v-3.65a1 1 0 00-.22-.624l-3.48-4.35A1 1 0 0016.52 6H13" />
  </svg>
);

function PhaseRow({
  steps, states, offset, compact, label, icon, color,
}: {
  steps: string[]; states: StepState[]; offset: number;
  compact?: boolean; label: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div>
      {!compact && (
        <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
          {icon}
          <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
        </div>
      )}
      <div className="flex items-start">
        {steps.map((lbl, i) => (
          <div key={lbl} className="group/step relative flex flex-1 flex-col items-center min-w-0">
            <div className="flex w-full items-center">
              <Line from={states[i - 1] ?? "grey"} to={i > 0 ? states[i] : null} side="left" />
              <Dot state={states[i]} num={offset + i} compact={compact} />
              <Line from={states[i]} to={i < steps.length - 1 ? states[i + 1] : null} side="right" />
            </div>
            {!compact && (
              <p className={`mt-1.5 w-full text-center text-[9px] font-medium leading-tight px-0.5 ${
                states[i] === "grey"   ? "text-slate-300"
                : states[i] === "failed" ? "text-rose-400"
                : states[i] === "active" ? "text-blue-600 font-semibold"
                : "text-emerald-600"
              }`}>
                {lbl}
              </p>
            )}
            <Tip state={states[i]} label={lbl} num={offset + i} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Progress header ───────────────────────────────────────────────────────────

function ProgressHeader({ states, allSteps }: { states: StepState[]; allSteps: string[] }) {
  const doneCount   = states.filter((s) => s === "done").length;
  const failedCount = states.filter((s) => s === "failed").length;
  const total       = states.length;
  const activeIdx   = states.findIndex((s) => s === "active");
  const activeLbl   = activeIdx !== -1 ? allSteps[activeIdx] : failedCount > 0 ? "QC Failed" : "Completed";
  const allDone     = doneCount === total;
  const hasFailed   = failedCount > 0;

  return (
    <div className="mb-2 flex items-center justify-between text-[10px]">
      <span className={`font-semibold ${hasFailed ? "text-rose-500" : allDone ? "text-emerald-600" : "text-slate-500"}`}>
        {hasFailed ? "QC Failed" : allDone ? "All steps complete" : activeLbl}
      </span>
      <span className="font-bold text-slate-400">{doneCount}/{total}</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LotLifecycleTracker(props: Props) {
  const states    = computeStates(props);
  const { compact, orderOnly, lotOnly, hideHeader } = props;
  const visibleStates = orderOnly ? states.slice(6, 12) : lotOnly ? states.slice(0, 6) : states;
  const allSteps  = orderOnly ? ORDER_STEPS : lotOnly ? LOT_STEPS : [...LOT_STEPS, ...ORDER_STEPS];

  return (
    <div className={compact ? "space-y-1.5" : "space-y-1"}>
      {!compact && !hideHeader && <ProgressHeader states={visibleStates} allSteps={allSteps} />}

      <div className={compact ? "space-y-1.5" : "space-y-5"}>
        {!orderOnly && (
          <PhaseRow
            steps={LOT_STEPS} states={states.slice(0, 6)} offset={1}
            compact={compact} label="Lot Phase" icon={PHASE_ICON_LOT} color="text-slate-400"
          />
        )}
        {!lotOnly && (
          <PhaseRow
            steps={ORDER_STEPS} states={states.slice(6, 12)} offset={orderOnly ? 1 : 7}
            compact={compact} label="Order & Delivery" icon={PHASE_ICON_ORDER} color="text-slate-400"
          />
        )}
      </div>
    </div>
  );
}
