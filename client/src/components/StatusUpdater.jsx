import { useState } from 'react';
import { api } from '../api';
import { useMeta } from '../hooks/useMeta';

/** Admin-only control for moving a request through Pending → In Progress → Resolved. */
export default function StatusUpdater({ request, onUpdated }) {
  const { statuses } = useMeta();
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await api(`/admin/requests/${request.id}/status`, {
        method: 'PATCH',
        body: { status, note },
      });
      setNote('');
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Update status</h3>
      <label className="field">
        <span>Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Note to citizen (optional)</span>
        <textarea rows="3" maxLength="500" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Technician scheduled for tomorrow morning" />
      </label>
      {error && <p className="alert alert--error">{error}</p>}
      <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save update'}</button>
    </form>
  );
}
