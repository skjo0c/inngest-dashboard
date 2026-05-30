import type { RunStatus, TraceSpanStatus } from "../types";

const STATUS_CONFIG: Record<
  RunStatus | TraceSpanStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  COMPLETED: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-900/40",
    text: "text-emerald-400",
    label: "Completed",
  },
  FAILED: {
    dot: "bg-red-400",
    bg: "bg-red-900/40",
    text: "text-red-400",
    label: "Failed",
  },
  RUNNING: {
    dot: "bg-blue-400",
    bg: "bg-blue-900/40",
    text: "text-blue-400",
    label: "Running",
  },
  QUEUED: {
    dot: "bg-slate-400",
    bg: "bg-slate-700/40",
    text: "text-slate-400",
    label: "Queued",
  },
  WAITING: {
    dot: "bg-amber-400",
    bg: "bg-amber-900/40",
    text: "text-amber-400",
    label: "Waiting",
  },
  CANCELLED: {
    dot: "bg-zinc-400",
    bg: "bg-zinc-800/40",
    text: "text-zinc-400",
    label: "Cancelled",
  },
  SKIPPED: {
    dot: "bg-zinc-500",
    bg: "bg-zinc-800/40",
    text: "text-zinc-500",
    label: "Skipped",
  },
};

const fallback = {
  dot: "bg-slate-500",
  bg: "bg-slate-800/40",
  text: "text-slate-400",
  label: "Unknown",
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: RunStatus | TraceSpanStatus | string;
  size?: "xs" | "sm";
}) {
  const cfg = STATUS_CONFIG[status as RunStatus] ?? fallback;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${cfg.bg} ${cfg.text} ${
        size === "xs" ? "text-xs" : "text-xs"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
