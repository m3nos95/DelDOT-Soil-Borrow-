import { cn, scoreTone } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        "inline-flex min-w-[3.2rem] items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "amber" && "bg-amber-100 text-amber-800",
        tone === "orange" && "bg-orange-100 text-orange-800",
        tone === "gray" && "bg-slate-100 text-slate-600",
      )}
    >
      {score}%
    </span>
  );
}
