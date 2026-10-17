const STEPS = ['Pending', 'In Progress', 'Resolved'];

/** Three-step tracker: completed steps are filled, the current one is highlighted. */
export default function ProgressTrack({ status }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className="track" aria-label={`Progress: ${status}`}>
      {STEPS.map((step, i) => (
        <li key={step} className={`track__step ${i < current ? 'is-done' : ''} ${i === current ? 'is-current' : ''}`}>
          <span className="track__dot">{i < current || status === 'Resolved' ? '✓' : i + 1}</span>
          <span className="track__label">{step}</span>
        </li>
      ))}
    </ol>
  );
}
