/** Previous / next controls for a paginated list. Renders nothing for a single page. */
export default function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return <p className="muted small">{total} result{total === 1 ? '' : 's'}</p>;
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="muted small">{total} results</span>
      <div className="pager__controls">
        <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
        <span className="small">Page {page} of {pages}</span>
        <button className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</button>
      </div>
    </nav>
  );
}
