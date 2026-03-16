import { CheckCircle2 } from "lucide-react";

const STEPS = [
  "Confirmed",
  "Dispatched",
  "At Hub",
  "Assigned",
  "En Route",
  "Arrived",
  "Delivered",
] as const;

type Props = {
  status: string;
  distributorName: string | null;
};

function activeStep({ status, distributorName }: Props): number {
  if (status === "PICKED_UP")        return 7;
  if (status === "ARRIVED")          return 6;
  if (status === "OUT_FOR_DELIVERY") return 5;
  if (distributorName)               return 4;
  if (status === "HUB_RECEIVED")     return 3;
  return 2; // DISPATCHED
}

export default function DeliveryStepBar({ status, distributorName }: Props) {
  const current = activeStep({ status, distributorName });
  const done = current === 7;

  return (
    <div className="flex items-start gap-0 flex-wrap">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isDone   = step < current || done;
        const isActive = step === current && !done;
        const isFuture = step > current;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold transition-colors
                  ${isDone   ? "bg-emerald-500 text-white"
                  : isActive ? "bg-blue-500 text-white ring-2 ring-blue-200"
                  : "bg-slate-100 text-slate-400"}`}
              >
                {isDone ? <CheckCircle2 size={11} /> : step}
              </div>
              <p className={`whitespace-nowrap text-[9px] leading-none
                ${isDone   ? "text-emerald-600 font-medium"
                : isActive ? "text-blue-600 font-semibold"
                : "text-slate-400"}`}>
                {label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mb-3.5 h-px w-5 shrink-0 transition-colors
                ${isDone ? "bg-emerald-400" : "bg-slate-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
