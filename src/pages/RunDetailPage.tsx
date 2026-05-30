import { useParams, useLocation } from "react-router-dom";
import { RunDetail } from "../components/RunDetail";
import type { FunctionRunV2 } from "../types";

export function RunDetailPage() {
  const { runID } = useParams<{ runID: string }>();
  const location = useLocation();

  // Try navigation state first (same-tab), then sessionStorage (new tab)
  const run: FunctionRunV2 | null =
    (location.state as { run?: FunctionRunV2 } | null)?.run ??
    (() => {
      try {
        return JSON.parse(sessionStorage.getItem(`run:${runID}`) ?? "null");
      } catch {
        return null;
      }
    })();

  if (!run || run.id !== runID) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-slate-400 gap-4">
        <p className="text-sm">Run data unavailable. Close this tab and try again.</p>
      </div>
    );
  }

  return <RunDetail run={run} />;
}
