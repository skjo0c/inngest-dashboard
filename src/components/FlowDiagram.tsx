import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StatusBadge } from "./StatusBadge";
import type { TraceSpan } from "../types";

/* ─── Node widths ─────────────────────────────────────── */
const NODE_W = 200;
const NODE_H = 72;
const H_GAP = 24;
const V_GAP = 80;
const TRIGGER_W = 160;
const TRIGGER_H = 48;

/* ─── Helpers ────────────────────────────────────────── */

/** Recursively compute the minimum subtree width needed to lay out this span */
function subtreeWidth(span: TraceSpan): number {
  if (span.childrenSpans.length === 0) return NODE_W;
  const childrenTotal =
    span.childrenSpans.reduce((sum, c) => sum + subtreeWidth(c), 0) +
    H_GAP * (span.childrenSpans.length - 1);
  return Math.max(NODE_W, childrenTotal);
}

/** Build React Flow nodes + edges from the root TraceSpan */
function buildFlowElements(
  root: TraceSpan,
  eventName: string | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const TRIGGER_ID = "__trigger__";

  // Trigger (virtual) node
  nodes.push({
    id: TRIGGER_ID,
    type: "triggerNode",
    position: { x: -TRIGGER_W / 2, y: 0 },
    data: { label: eventName ?? "Event Trigger" },
  });

  // Edge: trigger → root span
  edges.push({
    id: `${TRIGGER_ID}-${root.spanID}`,
    source: TRIGGER_ID,
    target: root.spanID,
    type: "smoothstep",
    style: { stroke: "#475569", strokeWidth: 1.5 },
    markerEnd: { type: "arrowclosed" as const, color: "#475569" },
  });

  /** Recursively place a span and its children */
  function placeSpan(span: TraceSpan, depth: number, centerX: number) {
    const y = TRIGGER_H + V_GAP + depth * (NODE_H + V_GAP);

    nodes.push({
      id: span.spanID,
      type: "spanNode",
      position: { x: centerX - NODE_W / 2, y },
      data: { span },
    });

    if (span.childrenSpans.length === 0) return;

    const totalW =
      span.childrenSpans.reduce((sum, c) => sum + subtreeWidth(c), 0) +
      H_GAP * (span.childrenSpans.length - 1);

    let x = centerX - totalW / 2;

    for (const child of span.childrenSpans) {
      const sw = subtreeWidth(child);
      const childCenter = x + sw / 2;

      placeSpan(child, depth + 1, childCenter);

      const isInvoke = child.stepOp === "INVOKE";
      edges.push({
        id: `${span.spanID}-${child.spanID}`,
        source: span.spanID,
        target: child.spanID,
        type: "smoothstep",
        animated: child.status === "RUNNING",
        style: {
          stroke: isInvoke ? "#6366f1" : "#475569",
          strokeWidth: 1.5,
          strokeDasharray: isInvoke ? "5 3" : undefined,
        },
        markerEnd: { type: "arrowclosed" as const, color: isInvoke ? "#6366f1" : "#475569" },
        label: isInvoke ? "invoke" : undefined,
        labelStyle: { fill: "#6366f1", fontSize: 10 },
        labelBgStyle: { fill: "#0f172a" },
      });

      x += sw + H_GAP;
    }
  }

  placeSpan(root, 0, 0);

  return { nodes, edges };
}

/* ─── Custom node: Trigger ───────────────────────────── */
function TriggerNode({ data }: { data: { label: string } }) {
  return (
    <div
      className="flex items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-950 px-4 py-2 text-xs font-semibold text-indigo-300 shadow-lg shadow-indigo-900/30"
      style={{ width: TRIGGER_W, height: TRIGGER_H, cursor: "default" }}
    >
      ⚡ {data.label}
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500" />
    </div>
  );
}

/* ─── Custom node: Trace Span ─────────────────────────── */
function SpanNode({
  data,
  selected,
}: {
  data: { span: TraceSpan };
  selected: boolean;
}) {
  const { span } = data;

  const isInvoke = span.stepOp === "INVOKE";
  const isRoot = span.isRoot;

  const durationMs = span.duration;
  const durationLabel =
    durationMs != null
      ? durationMs >= 1000
        ? `${(durationMs / 1000).toFixed(1)}s`
        : `${durationMs}ms`
      : null;

  const borderClass = selected
    ? "border-indigo-400 ring-2 ring-indigo-500/50"
    : isRoot
    ? "border-slate-500"
    : isInvoke
    ? "border-indigo-700"
    : "border-slate-700";

  const bgClass = selected ? "bg-slate-700" : isRoot ? "bg-slate-800" : "bg-slate-900";

  const invokeTarget =
    isInvoke && span.stepInfo?.__typename === "InvokeStepInfo"
      ? (span.stepInfo as { functionID: string; runID: string | null }).functionID
          .split("/")
          .pop()
      : null;

  return (
    <div
      className={`rounded-lg border ${borderClass} ${bgClass} shadow-md transition-colors`}
      style={{ width: NODE_W, minHeight: NODE_H, cursor: "pointer" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-600" />

      <div className="px-3 pt-2.5 pb-2">
        {/* Op badge */}
        {span.stepOp && (
          <span
            className={`mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isInvoke
                ? "bg-indigo-900/60 text-indigo-400"
                : "bg-slate-700/60 text-slate-400"
            }`}
          >
            {span.stepOp}
          </span>
        )}

        {/* Name */}
        <div className="truncate text-xs font-semibold text-slate-100 leading-tight">
          {span.name}
        </div>

        {/* Invoke target */}
        {invokeTarget && (
          <div className="mt-0.5 truncate text-[10px] text-indigo-400">
            → {invokeTarget}
          </div>
        )}

        {/* Footer: status + duration */}
        <div className="mt-2 flex items-center justify-between">
          <StatusBadge status={span.status} size="xs" />
          {durationLabel && (
            <span className="text-[10px] text-slate-500 tabular-nums">
              {durationLabel}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-600" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  triggerNode: TriggerNode,
  spanNode: SpanNode,
};

/* ─── Main component ─────────────────────────────────── */
interface Props {
  rootSpan: TraceSpan;
  eventName: string | null;
  onSpanClick: (span: TraceSpan | null) => void;
}

export function FlowDiagram({ rootSpan, eventName, onSpanClick }: Props) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildFlowElements(rootSpan, eventName),
    [rootSpan, eventName]
  );

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  const onInit = useCallback(
    (instance: { fitView: () => void }) => instance.fitView(),
    []
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (node.type === "spanNode") {
        onSpanClick((node.data as { span: TraceSpan }).span);
      }
    },
    [onSpanClick]
  );

  return (
    <div style={{ width: "100%", height: "100%", background: "#0a0f1e" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onNodeClick={handleNodeClick}
        onPaneClick={() => onSpanClick(null)}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e293b"
          gap={20}
          size={1.5}
        />
        <Controls
          style={{ background: "#1e293b", border: "1px solid #334155" }}
        />
        <MiniMap
          style={{ background: "#1e293b" }}
          nodeColor={(n) => {
            if (n.type === "triggerNode") return "#6366f1";
            const s = (n.data as { span?: TraceSpan })?.span?.status;
            const map: Record<string, string> = {
              COMPLETED: "#22c55e",
              FAILED: "#ef4444",
              RUNNING: "#3b82f6",
              QUEUED: "#94a3b8",
              WAITING: "#f59e0b",
              CANCELLED: "#6b7280",
            };
            return map[s ?? ""] ?? "#475569";
          }}
        />
      </ReactFlow>
    </div>
  );
}
