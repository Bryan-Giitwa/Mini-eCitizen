import { statusClass } from '../utils';

export default function StatusBadge({ status }) {
  return <span className={`badge badge--${statusClass(status)}`}>{status}</span>;
}
