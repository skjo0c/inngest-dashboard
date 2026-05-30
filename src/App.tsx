import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import { gqlFetch } from "./api/graphql";
import { GET_APPS } from "./api/queries";
import { RunsFilters } from "./components/RunsFilters";
import { RunsTable, PAGE_SIZE } from "./components/RunsTable";
import type { App, FunctionRunV2, RunStatus } from "./types";

function today(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function sevenDaysAgo(): string {
  return format(subDays(new Date(), 7), "yyyy-MM-dd'T'00:00");
}

// URL the Inngest dev server uses to reach the worker (Docker internal or localhost)
const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "http://inngest-worker:3000/api/inngest";

async function hardResync() {
  // 1. Remove app + all stale functions from the dev server DB
  const del = await fetch(`/fn/remove?url=${encodeURIComponent(WORKER_URL)}`, { method: "DELETE" });
  if (!del.ok && del.status !== 404) {
    throw new Error(`Failed to remove app: ${del.status}`);
  }
  // 2. PUT to the worker — triggers the SDK to call POST /fn/register on the dev server
  const sync = await fetch("/api/worker-sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: WORKER_URL }),
  });
  if (!sync.ok) {
    throw new Error(`Worker sync failed: ${sync.status}`);
  }
}

export default function App() {
  /* ── Filters ─────────────────────────────────────────── */
  const [appID, setAppID] = useState<string | null>(null);
  const [functionID, setFunctionID] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(sevenDaysAgo());
  const [untilDate, setUntilDate] = useState<string>(today());
  const [status, setStatus] = useState<RunStatus | null>(null);

  /* ── Pagination ──────────────────────────────────────── */
  // cursors[i] = `after` cursor to fetch page i+1.
  // cursors[0] = null → first page needs no cursor.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // highest page we can directly navigate to (we have its cursor)
  const maxLinked = cursors.length; // e.g. if cursors = [null, "abc"], maxLinked = 2 → pages 1 and 2 are reachable

  const currentCursor = cursors[page - 1] ?? null;

  /* ── Navigate to run detail ─────────────────────────── */
  const openRun = (run: FunctionRunV2) => {
    sessionStorage.setItem(`run:${run.id}`, JSON.stringify(run));
    window.open(`/runs/${run.id}`, "_blank");
  };

  /* ── Apps data (for filter dropdowns) ───────────────── */
  const { data: appsData } = useQuery<{ apps: App[] }>({
    queryKey: ["apps"],
    queryFn: () => gqlFetch<{ apps: App[] }>(GET_APPS),
  });

  const apps = appsData?.apps ?? [];

  const allFunctions = useMemo(
    () =>
      appID
        ? (apps.find((a) => a.id === appID)?.functions ?? [])
        : apps.flatMap((a) => a.functions),
    [apps, appID]
  );

  /* ── Handlers ────────────────────────────────────────── */
  const resetPagination = useCallback(() => {
    setPage(1);
    setCursors([null]);
    setTotalCount(0);
  }, []);

  /* ── Resync ──────────────────────────────────────────── */
  const queryClient = useQueryClient();
  const [resyncing, setResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);

  const handleResync = useCallback(async () => {
    setResyncing(true);
    setResyncError(null);
    try {
      await hardResync();
      await queryClient.invalidateQueries({ queryKey: ["apps"] });
      resetPagination();
    } catch (e) {
      setResyncError(e instanceof Error ? e.message : "Resync failed");
    } finally {
      setResyncing(false);
    }
  }, [queryClient, resetPagination]);

  const handlePageInfo = useCallback(
    (endCursor: string | null, count: number) => {
      setTotalCount(count);
      setCursors((prev) => {
        // Store the endCursor so page+1 is navigable.
        if (prev.length > page) return prev; // already have it
        return [...prev, endCursor];
      });
    },
    [page]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > Math.min(maxLinked + 1, totalPages)) return;
      setPage(newPage);
    },
    [maxLinked, totalPages]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-indigo-400 text-xl">⚡</span>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Inngest Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {resyncError && (
              <span className="text-xs text-red-400">{resyncError}</span>
            )}
            <button
              onClick={handleResync}
              disabled={resyncing}
              className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              {resyncing ? "Resyncing…" : "↺ Resync Functions"}
            </button>
            <a
              href="http://localhost:8288"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Open dev server →
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-5">
        <RunsFilters
          apps={apps}
          allFunctions={allFunctions}
          appID={appID}
          functionID={functionID}
          fromDate={fromDate}
          untilDate={untilDate}
          status={status}
          onAppChange={(id) => {
            setAppID(id);
            setFunctionID(null);
            resetPagination();
          }}
          onFunctionChange={(id) => {
            setFunctionID(id);
            resetPagination();
          }}
          onFromDateChange={(d) => {
            setFromDate(d);
            resetPagination();
          }}
          onUntilDateChange={(d) => {
            setUntilDate(d);
            resetPagination();
          }}
          onStatusChange={(s) => {
            setStatus(s);
            resetPagination();
          }}
        />

        <RunsTable
          appID={appID}
          functionID={functionID}
          fromDate={fromDate}
          untilDate={untilDate || null}
          status={status}
          page={page}
          cursor={currentCursor}
          totalPages={totalPages}
          maxLinked={maxLinked}
          onPageInfo={handlePageInfo}
          onPageChange={handlePageChange}
          onSelectRun={openRun}
        />
      </main>
    </div>
  );
}
