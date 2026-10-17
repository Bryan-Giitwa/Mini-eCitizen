/** Two-column layout shared by Login and Register: brand panel + form. */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-shell__panel">
        <h2>Your city, one report away.</h2>
        <ul>
          <li><span aria-hidden="true">💡</span> Report streetlights, water and waste issues</li>
          <li><span aria-hidden="true">📍</span> Share the exact location and a photo</li>
          <li><span aria-hidden="true">🔔</span> Follow progress from Pending to Resolved</li>
        </ul>
      </aside>
      <div className="card stack auth-shell__form">
        <div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
