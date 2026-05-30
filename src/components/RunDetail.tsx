import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import JsonView from "@uiw/react-json-view";
import { nordTheme } from "@uiw/react-json-view/nord";
import { format, parseISO, formatDistanceStrict } from "date-fns";
import { gqlFetch } from "../api/graphql";
import { GET_RUN_TRACE, GET_SPAN_OUTPUT } from "../api/queries";
import { StatusBadge } from "./StatusBadge";
import { FlowDiagram } from "./FlowDiagram";
import type { FunctionRunV2, TraceSpan, RunTraceSpanOutput } from "../types";

/* ─── Helpers ──────────────────────────────────────────── */

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy HH:mm:ss");
  } catch {
    return iso;
  }
}

function dur(start: string | null, end: string | null, queued: string): string {
  const s = start ?? queued;
  if (!end) return "—";
  try {
    return formatDistanceStrict(parseISO(s), parseISO(end));
  } catch {
    return "—";
  }
}

function spanDur(ms: number | null): string | null {
  if (ms == null) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function tryPrettyJson(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** DFS-flatten, sorting each level by queuedAt so the list reflects trigger order */
function flattenSpans(span: TraceSpan): TraceSpan[] {
  const sorted = [...span.childrenSpans].sort(
    (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
  );
  return [span, ...sorted.flatMap(flattenSpans)];
}

/* ─── Collapsible JSON block ────────────────────────────── */

function JsonBlock({
  raw,
}: {
  raw: string | null | undefined;
}) {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not valid JSON — fall back to plain text
    return (
      <pre className="overflow-x-auto p-3 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
        {raw}
      </pre>
    );
  }

  return (
    <div className="p-3">
      <JsonView
        value={parsed as object}
        style={{
          ...nordTheme,
          fontSize: "14px",
          lineHeight: "1.6",
          background: "transparent",
        }}
        // collapsed={2}
        displayDataTypes={false}
        displayObjectSize={false}
        enableClipboard={false}
        shortenTextAfterLength={120}
      />
    </div>
  );
}

/* ─── StepItem ─────────────────────────────────────────── */

function StepItem({
  span,
  depth,
  isSelected,
  onSelect,
}: {
  span: TraceSpan;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // isSelected drives open/close — clicking a different step collapses this one
  const [activeTab, setActiveTab] = useState<"input" | "output">("output");
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll into view when selected (e.g. from diagram click)
  useEffect(() => {
    if (isSelected) {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  const { data, isLoading } = useQuery<{
    runTraceSpanOutputByID: RunTraceSpanOutput;
  }>({
    queryKey: ["spanOutput", span.outputID],
    queryFn: () =>
      gqlFetch<{ runTraceSpanOutputByID: RunTraceSpanOutput }>(GET_SPAN_OUTPUT, {
        outputID: span.outputID,
      }),
    enabled: isSelected && !!span.outputID,
    staleTime: Infinity,
  });

  const output = data?.runTraceSpanOutputByID;
  const hasInput = !!output?.input;
  const hasData = !!output?.data;
  const hasError = !!output?.error;

  const isInvoke = span.stepOp === "INVOKE";
  const indentPx = depth * 12;

  const statusBorderColor: Record<string, string> = {
    COMPLETED: "border-l-emerald-500/60",
    FAILED: "border-l-red-500/60",
    RUNNING: "border-l-blue-500/60",
    QUEUED: "border-l-slate-500/40",
    WAITING: "border-l-amber-500/60",
    CANCELLED: "border-l-zinc-500/40",
    SKIPPED: "border-l-zinc-600/40",
  };
  const leftBorder = isSelected
    ? "border-l-indigo-400"
    : (statusBorderColor[span.status] ?? "border-l-slate-700/40");

  return (
    <div ref={itemRef} className={`border-l-2 ${leftBorder}`}>
      {/* Row header */}
      <button
        onClick={() => onSelect()}
        className={`flex w-full items-center gap-2 py-2 pr-3 text-left hover:bg-slate-800/50 transition-colors ${
          isSelected ? "bg-slate-800/50" : ""
        }`}
        style={{ paddingLeft: `${indentPx + 10}px` }}
      >
        <span className="w-3 shrink-0 text-[10px] text-slate-600">
          {isSelected ? "▾" : "▸"}
        </span>

        {span.stepOp && (
          <span
            className={`shrink-0 rounded px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              isInvoke
                ? "bg-indigo-900/60 text-indigo-400"
                : "bg-slate-700/60 text-slate-400"
            }`}
          >
            {span.stepOp}
          </span>
        )}

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
          {span.name}
        </span>

        <StatusBadge status={span.status} size="xs" />

        {spanDur(span.duration) != null && (
          <span className="shrink-0 text-xs text-slate-500 tabular-nums">
            {spanDur(span.duration)}
          </span>
        )}
      </button>

      {/* Expandable body — only shown when this step is selected */}
      {isSelected && (
        <div className="border-t border-slate-800/40 bg-slate-950/60">
          {/* Tab bar */}
          {(hasInput || hasData || hasError) && (
            <div className="flex border-b border-slate-800/40">
              {hasInput && (
                <button
                  onClick={() => setActiveTab("input")}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeTab === "input"
                      ? "border-b-2 border-indigo-500 text-indigo-400"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  Input
                </button>
              )}
              {(hasData || hasError) && (
                <button
                  onClick={() => setActiveTab("output")}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeTab === "output"
                      ? "border-b-2 border-indigo-500 text-indigo-400"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  Output
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && span.outputID && (
              <p className="px-3 py-2 text-sm text-slate-600">Loading…</p>
            )}

            {!span.outputID && (
              <p className="px-3 py-2 text-sm italic text-slate-700">
                No output recorded for this step.
              </p>
            )}

            {!isLoading && span.outputID && !hasInput && !hasData && !hasError && (
              <p className="px-3 py-2 text-sm italic text-slate-700">
                No output available yet.
              </p>
            )}

            {/* Error */}
            {!isLoading && activeTab === "output" && hasError && (
              <div className="p-3">
                <p className="mb-1 text-sm font-semibold text-red-400">
                  {output!.error!.name}: {output!.error!.message}
                </p>
                {output!.error!.stack && (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-red-300/60">
                    {output!.error!.stack}
                  </pre>
                )}
              </div>
            )}

            {/* JSON output */}
            {!isLoading && activeTab === "output" && hasData && !hasError && (
              <JsonBlock raw={output!.data} />
            )}

            {/* JSON input */}
            {!isLoading && activeTab === "input" && hasInput && (
              <JsonBlock raw={output!.input} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── StepInspector sidebar ─────────────────────────────── */

function StepInspector({
  spans,
  selectedSpanID,
  width,
  onSelectSpan,
}: {
  spans: TraceSpan[];
  selectedSpanID: string | null;
  width: number;
  onSelectSpan: (span: TraceSpan | null) => void;
}) {
  // Build depth map from tree structure
  const depthMap = new Map<string, number>();
  function calcDepths(span: TraceSpan, d: number) {
    depthMap.set(span.spanID, d);
    span.childrenSpans.forEach((c) => calcDepths(c, d + 1));
  }
  if (spans[0]) calcDepths(spans[0], 0);

  return (
    <div
      className="flex h-full shrink-0 flex-col border-l border-slate-800"
      style={{ width }}
    >
      <div className="shrink-0 border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Steps&nbsp;
          <span className="text-slate-400">{spans.length}</span>
        </span>
      </div>

      <div className="flex-1 divide-y divide-slate-800/40 overflow-y-auto">
        {spans.map((span) => (
          <StepItem
            key={span.spanID}
            span={span}
            depth={depthMap.get(span.spanID) ?? 0}
            isSelected={span.spanID === selectedSpanID}
            onSelect={() =>
              onSelectSpan(span.spanID === selectedSpanID ? null : span)
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main RunDetail panel ──────────────────────────────── */

interface Props {
  run: FunctionRunV2;
  onClose?: () => void;
}

export function RunDetail({ run, onClose }: Props) {
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState(
    () => Math.round(window.innerWidth * 0.3)
  );

  // ── Resizable drag handle ──────────────────────────────
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      setInspectorWidth(
        Math.max(240, Math.min(Math.round(window.innerWidth * 0.5), dragStartWidth.current + delta))
      );
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = inspectorWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  // ──────────────────────────────────────────────────────

  const { data, isLoading, isError, error } = useQuery<{
    runTrace: TraceSpan;
  }>({
    queryKey: ["runTrace", run.id],
    queryFn: () =>
      gqlFetch<{ runTrace: TraceSpan }>(GET_RUN_TRACE, { runID: run.id }),
  });

  const trace = data?.runTrace;
  const allSpans = trace ? flattenSpans(trace) : [];

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-800 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-3">
              <StatusBadge status={run.status} />
              <span className="font-mono text-xs text-slate-500">{run.id}</span>
            </div>
            <h2 className="truncate text-lg font-semibold text-white">
              {run.function.name}
            </h2>
            <p className="text-sm text-slate-400">
              {run.app.name}
              {run.eventName && (
                <span className="ml-2 font-mono text-xs text-slate-500">
                  • {run.eventName}
                </span>
              )}
            </p>
          </div>

        </div>

        {/* Metadata strip */}
        <div className="grid shrink-0 grid-cols-4 gap-4 border-b border-slate-800 px-6 py-3 text-xs">
          <div>
            <div className="mb-0.5 text-slate-500">Queued</div>
            <div className="text-slate-200">{fmt(run.queuedAt)}</div>
          </div>
          <div>
            <div className="mb-0.5 text-slate-500">Started</div>
            <div className="text-slate-200">{fmt(run.startedAt)}</div>
          </div>
          <div>
            <div className="mb-0.5 text-slate-500">Ended</div>
            <div className="text-slate-200">{fmt(run.endedAt)}</div>
          </div>
          <div>
            <div className="mb-0.5 text-slate-500">Duration</div>
            <div className="text-slate-200">
              {dur(run.startedAt, run.endedAt, run.queuedAt)}
            </div>
          </div>
        </div>

        {/* Main area: flow diagram + step inspector */}
        <div className="flex min-h-0 flex-1">
          {/* Flow diagram */}
          <div className="min-w-0 flex-1 overflow-hidden">
            {isLoading && (
              <div className="flex h-full items-center justify-center text-slate-500">
                Loading trace…
              </div>
            )}
            {isError && (
              <div className="flex h-full items-center justify-center text-red-400">
                {error instanceof Error ? error.message : "Failed to load trace"}
              </div>
            )}
            {!isLoading && !isError && !trace && (
              <div className="flex h-full items-center justify-center text-slate-500">
                No trace data available yet.
              </div>
            )}
            {trace && (
              <FlowDiagram
                rootSpan={trace}
                eventName={run.eventName}
                onSpanClick={setSelectedSpan}
              />
            )}
          </div>

          {/* Drag handle */}
          {trace && (
            <div
              onMouseDown={startDrag}
              className="w-1 shrink-0 cursor-col-resize bg-slate-800 hover:bg-indigo-600/60 transition-colors"
              title="Drag to resize"
            />
          )}

          {/* Step inspector sidebar */}
          {trace && (
            <StepInspector
              spans={allSpans}
              width={inspectorWidth}
              selectedSpanID={selectedSpan?.spanID ?? null}
              onSelectSpan={setSelectedSpan}
            />
          )}
        </div>

        {/* Footer legend */}
        {trace && (
          <div className="flex shrink-0 items-center gap-5 border-t border-slate-800 px-6 py-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="h-px w-5 border-t-2 border-indigo-500 border-dashed" />
              <span>invoke</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-px w-5 border-t-2 border-slate-500" />
              <span>step</span>
            </div>
            <span className="ml-auto">
              Click a node or step row to inspect input / output
            </span>
          </div>
        )}
    </div>
  );
}
