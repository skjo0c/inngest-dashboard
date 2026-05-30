interface Props {
  currentPage: number;
  totalPages: number;
  maxLinked: number; /** highest page we have a cursor for, so it's directly linkable */
  onPageChange: (page: number) => void;
}

const WINDOW = 2; // pages shown on each side of current

export function Pagination({
  currentPage,
  totalPages,
  maxLinked,
  onPageChange,
}: Props) {
  if (totalPages <= 1) return null;

  /** Build the list of page tokens to render: numbers or "…" */
  const pages: (number | "...")[] = [];

  const addRange = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pages.push(i);
  };

  if (totalPages <= 9) {
    addRange(1, totalPages);
  } else {
    addRange(1, Math.min(2, totalPages));

    const start = Math.max(3, currentPage - WINDOW);
    const end = Math.min(totalPages - 2, currentPage + WINDOW);

    if (start > 3) pages.push("...");
    addRange(start, end);
    if (end < totalPages - 2) pages.push("...");

    addRange(Math.max(totalPages - 1, end + 1), totalPages);
  }

  const canGo = (p: number) => p >= 1 && p <= maxLinked;

  return (
    <div className="flex items-center justify-between pt-3">
      <button
        onClick={() => canGo(currentPage - 1) && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => canGo(p) && onPageChange(p)}
              disabled={!canGo(p)}
              className={`min-w-[32px] rounded-md px-2 py-1 text-sm font-medium transition-colors
                ${
                  p === currentPage
                    ? "bg-indigo-600 text-white border border-indigo-500"
                    : canGo(p)
                    ? "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "border border-slate-800 bg-transparent text-slate-600 cursor-not-allowed"
                }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => canGo(currentPage + 1) && onPageChange(currentPage + 1)}
        disabled={currentPage >= maxLinked || currentPage >= totalPages}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </div>
  );
}
