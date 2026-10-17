import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import RequestCard from '../components/RequestCard';
import { useMeta } from '../hooks/useMeta';

export default function Dashboard() {
  const { user } = useAuth();
  const { statuses } = useMeta();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/requests')
      .then(setRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Count per status once, instead of filtering the list for every tab on every render.
  const counts = useMemo(() => {
    const c = { All: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [requests]);

  const visible = useMemo(
    () => (filter === 'All' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  return (
    <>
      <section className="hero">
        <div>
          <h1>Hello, {user.name.split(' ')[0]} 👋</h1>
          <p>See what’s happening with the issues you reported, or report a new one.</p>
          <Link to="/requests/new" className="btn btn--light">+ New request</Link>
        </div>
        <div className="hero__stats">
          <div><strong>{counts['Pending'] || 0}</strong><span>Pending</span></div>
          <div><strong>{counts['In Progress'] || 0}</strong><span>In progress</span></div>
          <div><strong>{counts['Resolved'] || 0}</strong><span>Resolved</span></div>
        </div>
      </section>

      {error && <p className="alert alert--error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && requests.length === 0 && !error && (
        <div className="card empty">
          <h3>No requests yet</h3>
          <p className="muted">Spotted a broken streetlight or a water leak? Let us know.</p>
          <Link to="/requests/new" className="btn btn--primary">Submit your first request</Link>
        </div>
      )}

      {requests.length > 0 && (
        <>
          <div className="tabs" role="tablist">
            {['All', ...statuses].map((s) => (
              <button key={s} role="tab" aria-selected={filter === s}
                className={`tab ${filter === s ? 'tab--active' : ''}`} onClick={() => setFilter(s)}>
                {s} <span className="tab__count">{counts[s] || 0}</span>
              </button>
            ))}
          </div>
          <div className="grid">
            {visible.map((r) => <RequestCard key={r.id} request={r} />)}
          </div>
          {visible.length === 0 && <p className="muted">Nothing with status “{filter}”.</p>}
        </>
      )}
    </>
  );
}
