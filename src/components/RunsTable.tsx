import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { format, formatDistanceStrict, parseISO } from "date-fns";
import { gqlFetch } from "../api/graphql";
import { GET_RUNS } from "../api/queries";
import { StatusBadge } from "./StatusBadge";
import { Pagination } from "./Pagination";
import type { FunctionRunV2, RunStatus, RunsConnection } from "../types";

export const PAGE_SIZE = 20;

interface Props {
  appID: string | null;
  functionID: string | null;
  fromDate: string;
  untilDate: string | null;
  status: RunStatus | null;
  page: number;
  /** cursor for the current page (null = first page) */
  cursor: string | null;
  totalPages: number;
  maxLinked: number;
  onPageInfo: (endCursor: string | null, totalCount: number) => void;
  onPageChange: (page: number) => void;
  onSelectRun: (run: FunctionRunV2) => void;
}

function formatDuration(
  startedAt: string | null,
  endedAt: string | null,
  queuedAt: string
): string {
  const start = startedAt ?? queuedAt;
  const end = endedAt;
  if (!end) return "—";
  try {
    return formatDistanceStrict(parseISO(start), parseISO(end));
  } catch {
    return "—";
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, HH:mm:ss");
  } catch {
    return iso;
  }
}

export function RunsTable({
  appID,
  functionID,
  fromDate,
  untilDate,
  status,
  page,
  cursor,
  totalPages,
  maxLinked,
  onPageInfo,
  onPageChange,
  onSelectRun,
}: Props) {
  const filter: Record<string, unknown> = {
    from: fromDate
      ? new Date(fromDate + ":00").toISOString()
      : new Date(Date.now() - 7 * 86400_000).toISOString(),
  };

  if (untilDate) filter.until = new Date(untilDate + ":00").toISOString();
  if (appID) filter.appIDs = [appID];
  if (functionID) filter.functionIDs = [functionID];
  if (status) filter.status = [status];

  const { data, isLoading, isError, error } = useQuery<{
    runs: RunsConnection;
  }>({
    queryKey: ["runs", appID, functionID, fromDate, untilDate, status, page, cursor],
    queryFn: () =>
      gqlFetch<{ runs: RunsConnection }>(GET_RUNS, {
        first: PAGE_SIZE,
        after: cursor ?? undefined,
        filter,
      }),
    keepPreviousData: true,
  } as Parameters<typeof useQuery>[0]);

  useEffect(() => {
    if (data?.runs) {
      onPageInfo(data.runs.pageInfo.endCursor, data.runs.totalCount);
    }
  }, [data, onPageInfo]);

  const runs = data?.runs.edges.map((e) => e.node) ?? [];
  const totalCount = data?.runs.totalCount ?? 0;

  const firstRowNum = (page - 1) * PAGE_SIZE + 1;

  return (
    <div>
      {/* Table header */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">
          {isLoading ? (
            "Loading runs…"
          ) : (
            <>
              <span className="text-white font-semibold">{totalCount.toLocaleString()}</span>{" "}
              run{totalCount !== 1 ? "s" : ""}
            </>
          )}
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Function
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                App
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Queued At
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Duration
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-400">
                  Error:{" "}
                  {error instanceof Error ? error.message : "Unknown error"}
                </td>
              </tr>
            )}

            {!isLoading && !isError && runs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No runs found for the selected filters.
                </td>
              </tr>
            )}

            {runs.map((run, idx) => (
              <tr
                key={run.id}
                className="group hover:bg-slate-800/40 transition-colors"
              >
                <td className="px-4 py-3 text-slate-500 tabular-nums">
                  {firstRowNum + idx}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3 text-slate-200 font-medium max-w-[200px] truncate">
                  {run.function.name}
                </td>
                <td className="px-4 py-3 text-slate-400 max-w-[120px] truncate">
                  {run.app.name}
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs max-w-[160px] truncate">
                  {run.eventName ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap tabular-nums">
                  {formatTime(run.queuedAt)}
                </td>
                <td className="px-4 py-3 text-slate-400 tabular-nums whitespace-nowrap">
                  {formatDuration(run.startedAt, run.endedAt, run.queuedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSelectRun(run)}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-indigo-700 hover:border-indigo-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View trace
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        maxLinked={maxLinked}
        onPageChange={onPageChange}
      />
    </div>
  );
}
