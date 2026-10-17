import { memo } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { categoryIcon, formatDate } from '../utils';

function RequestCard({ request }) {
  return (
    <Link to={`/requests/${request.id}`} className="card request-card">
      <div className="request-card__top">
        <span className="chip"><span aria-hidden="true">{categoryIcon(request.category)}</span> {request.category}</span>
        <StatusBadge status={request.status} />
      </div>
      <h3>{request.location}</h3>
      <p className="clamp">{request.description}</p>
      <small className="muted">Submitted {formatDate(request.created_at)} · #{request.id}</small>
    </Link>
  );
}

// Memoised: the list re-renders on every filter change, but unchanged cards can be skipped.
export default memo(RequestCard);
