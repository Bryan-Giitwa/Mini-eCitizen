import { formatHours } from '../utils';

function Stat({ label, value, tone }) {
  return (
    <div className={`card stat ${tone ? `stat--${tone}` : ''}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

/** Open vs resolved as a CSS conic-gradient donut — no chart library needed. */
function Donut({ open, resolved }) {
  const total = open + resolved;
  const pct = total ? Math.round((resolved / total) * 100) : 0;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ '--pct': `${pct}%` }} role="img"
        aria-label={`${pct}% of cases resolved`}>
        <div className="donut__hole"><strong>{pct}%</strong><small>resolved</small></div>
      </div>
      <ul className="legend">
        <li><i className="dot dot--open" /> Open <strong>{open}</strong></li>
        <li><i className="dot dot--resolved" /> Resolved <strong>{resolved}</strong></li>
      </ul>
    </div>
  );
}

function Bars({ rows, valueKey, labelKey, format = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r[labelKey]}>
          <span className="bars__label">{format(r[labelKey])}</span>
          <span className="bars__track">
            <span className="bars__fill" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </span>
          <span className="bars__value">{r[valueKey]}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Analytics({ data }) {
  const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-KE', { weekday: 'short', timeZone: 'UTC' });

  return (
    <section className="stack">
      <div className="stats">
        <Stat label="Total cases" value={data.total} />
        <Stat label="Open cases" value={data.open} tone="warn" />
        <Stat label="Resolved" value={data.resolved} tone="good" />
        <Stat label="Avg. resolution time" value={formatHours(data.avgResolutionHours)} />
      </div>

      <div className="charts">
        <div className="card">
          <h3>Open vs resolved</h3>
          <Donut open={data.open} resolved={data.resolved} />
          <p className="muted small">
            {data.byStatus['Pending']} pending · {data.byStatus['In Progress']} in progress
          </p>
        </div>
        <div className="card">
          <h3>Cases by category</h3>
          {data.byCategory.length ? (
            <Bars rows={data.byCategory} valueKey="total" labelKey="category" />
          ) : <p className="muted">No data yet.</p>}
        </div>
        <div className="card">
          <h3>New cases, last 7 days</h3>
          <Bars rows={data.last7Days} valueKey="count" labelKey="day" format={dayLabel} />
        </div>
      </div>
    </section>
  );
}
