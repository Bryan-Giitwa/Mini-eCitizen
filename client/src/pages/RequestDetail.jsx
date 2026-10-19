import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, apiUrl } from '../api';
import { useAuth } from '../AuthContext';
import ProgressTrack from '../components/ProgressTrack';
import StatusBadge from '../components/StatusBadge';
import StatusUpdater from '../components/StatusUpdater';
import Timeline from '../components/Timeline';
import { categoryIcon, formatDate } from '../utils';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequest(null);
    setError('');
    api(`/requests/${id}`).then(setRequest).catch((err) => setError(err.message));
  }, [id]);

  const isAdmin = user.role === 'admin';
  const back = isAdmin ? '/admin' : '/';

  if (error) {
    return (
      <>
        <p className="alert alert--error">{error}</p>
        <Link to={back}>← Back</Link>
      </>
    );
  }
  if (!request) return <p className="muted">Loading…</p>;

  return (
    <>
      <Link to={back} className="back">← Back</Link>
      <div className="detail">
        <section className="card stack">
          <div className="request-card__top">
            <span className="chip"><span aria-hidden="true">{categoryIcon(request.category)}</span> {request.category}</span>
            <StatusBadge status={request.status} />
          </div>
          <h1>{request.location}</h1>
          <ProgressTrack status={request.status} />
          <p className="prewrap">{request.description}</p>
          {request.image_path && (
            <a href={apiUrl(request.image_path)} target="_blank" rel="noreferrer">
              <img className="evidence" src={apiUrl(request.image_path)} alt="Photo attached to this request" loading="lazy" />
            </a>
          )}
          <small className="muted">
            Request #{request.id} · submitted {formatDate(request.created_at, true)}
            {isAdmin && <> by {request.citizen_name} ({request.citizen_email})</>}
          </small>
        </section>

        <aside className="stack">
          {isAdmin && <StatusUpdater request={request} onUpdated={setRequest} />}
          <div className="card">
            <h3>Activity</h3>
            <Timeline history={request.history} />
          </div>
        </aside>
      </div>
    </>
  );
}
