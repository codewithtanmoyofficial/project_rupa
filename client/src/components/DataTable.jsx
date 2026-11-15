// Table card used by every list page (same style as the Courses screen):
// uppercase header, thin row dividers, "Page X of Y" + Prev/Next footer.
export default function DataTable({ title, columns, rows, loading, error, pagination, onPage, empty = 'No records found.' }) {
  const { page = 1, pages = 1 } = pagination || {};
  return (
    <div className="card overflow-hidden">
      {title && <h2 className="px-4 pt-4 pb-1 text-sm font-bold text-slate-900">{title}</h2>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 whitespace-nowrap ${c.className || ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-slate-100 hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 text-slate-600 ${c.cell || ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                  {loading ? 'Loading…' : error || empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button className="text-xs border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
            <button className="text-xs border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-4 text-xs font-medium">
      {onEdit && <button onClick={onEdit} className="text-slate-700 hover:text-brand">Edit</button>}
      {onDelete && <button onClick={onDelete} className="text-red-600 hover:text-red-700">Delete</button>}
    </div>
  );
}
