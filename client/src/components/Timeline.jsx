import { formatDate, statusClass } from '../utils';

/** Vertical timeline of every status change on a request. */
export default function Timeline({ history }) {
  return (
    <ol className="timeline">
      {history.map((h) => (
        <li key={h.id} className={`timeline__item timeline__item--${statusClass(h.status)}`}>
          <div className="timeline__head">
            <strong>{h.status}</strong>
            <span className="muted">{formatDate(h.created_at, true)}</span>
          </div>
          {h.note && <p>{h.note}</p>}
          {h.changed_by_name && <small className="muted">by {h.changed_by_name}</small>}
        </li>
      ))}
    </ol>
  );
}
