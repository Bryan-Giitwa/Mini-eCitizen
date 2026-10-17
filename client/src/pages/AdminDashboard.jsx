import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Analytics from '../components/Analytics';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { useMeta } from '../hooks/useMeta';
import { categoryIcon, formatDate } from '../utils';

const PAGE_SIZE = 10;

export default function AdminDashboard() {
  const { categories, statuses } = useMeta();
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', q: '', page: 1 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/analytics').then(setAnalytics).catch((err) => setError(err.message));
  }, []);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch the current page. `ignore` discards responses from outdated filters (race-condition guard).
  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams({ limit: PAGE_SIZE });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));

    setLoading(true);
    api(`/admin/requests?${params}`)
      .then((data) => !ignore && setResult(data))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));

    return () => { ignore = true; };
  }, [filters]);

  const setFilter = (name) => (e) => setFilters({ ...filters, [name]: e.target.value, page: 1 });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin dashboard</h1>
          <p className="muted">Overview of all citizen service requests.</p>
        </div>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {analytics && <Analytics data={analytics} />}

      <section className="card stack">
        <h2>All requests</h2>
        <div className="filters">
          <input type="search" placeholder="Search location, description or citizen…"
            value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search requests" />
          <select value={filters.status} onChange={setFilter('status')} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.category} onChange={setFilter('category')} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Category</th><th>Location</th><th>Citizen</th><th>Submitted</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {result.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><span aria-hidden="true">{categoryIcon(r.category)}</span> {r.category}</td>
                  <td>{r.location}</td>
                  <td>{r.citizen_name}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><Link to={`/requests/${r.id}`} className="btn btn--ghost btn--sm">Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && result.items.length === 0 && <p className="muted center pad">No requests match your filters.</p>}
        </div>

        <Pagination page={result.page} pages={result.pages} total={result.total}
          onChange={(page) => setFilters({ ...filters, page })} />
      </section>
    </>
  );
}
