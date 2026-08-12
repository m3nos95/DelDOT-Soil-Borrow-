import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Upload", hint: "NOFO & Projects" },
  { n: 2, label: "Analyze", hint: "AI Matching" },
  { n: 3, label: "Review", hint: "Results" },
  { n: 4, label: "Download", hint: "Report" },
];

export function WorkflowBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      {STEPS.map((item, i) => {
        const active = item.n === step;
        const done = item.n < step;
        return (
          <li
            key={item.n}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              i > 0 && "border-l border-slate-200",
              active && "bg-navy-900 text-white",
              !active && done && "bg-slate-50",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                active ? "bg-white text-navy-900" : done ? "bg-deldot-green text-white" : "bg-slate-200 text-navy-700",
              )}
            >
              {item.n}
            </span>
            <span>
              <div className={cn("text-sm font-semibold", active ? "text-white" : "text-navy-900")}>{item.label}</div>
              <div className={cn("text-xs", active ? "text-white/70" : "text-slate-500")}>{item.hint}</div>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
