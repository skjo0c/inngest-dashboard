import type { App, AppFunction, RunStatus } from "../types";

const STATUSES: { value: RunStatus; label: string }[] = [
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "RUNNING", label: "Running" },
  { value: "QUEUED", label: "Queued" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface Props {
  apps: App[];
  allFunctions: AppFunction[];
  appID: string | null;
  functionID: string | null;
  fromDate: string;
  untilDate: string;
  status: RunStatus | null;
  onAppChange: (id: string | null) => void;
  onFunctionChange: (id: string | null) => void;
  onFromDateChange: (d: string) => void;
  onUntilDateChange: (d: string) => void;
  onStatusChange: (s: RunStatus | null) => void;
}

export function RunsFilters({
  apps,
  allFunctions,
  appID,
  functionID,
  fromDate,
  untilDate,
  status,
  onAppChange,
  onFunctionChange,
  onFromDateChange,
  onUntilDateChange,
  onStatusChange,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {/* App filter */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          App
        </span>
        <select
          value={appID ?? ""}
          onChange={(e) => {
            onAppChange(e.target.value || null);
            onFunctionChange(null);
          }}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none min-w-[140px]"
        >
          <option value="">All apps</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {/* Function filter */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Function
        </span>
        <select
          value={functionID ?? ""}
          onChange={(e) => onFunctionChange(e.target.value || null)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none min-w-[180px]"
        >
          <option value="">All functions</option>
          {allFunctions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      {/* Status filter */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Status
        </span>
        <select
          value={status ?? ""}
          onChange={(e) =>
            onStatusChange((e.target.value as RunStatus) || null)
          }
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none min-w-[130px]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {/* Date from */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          From
        </span>
        <input
          type="datetime-local"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
      </label>

      {/* Date until */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Until
        </span>
        <input
          type="datetime-local"
          value={untilDate}
          onChange={(e) => onUntilDateChange(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
      </label>
    </div>
  );
}
