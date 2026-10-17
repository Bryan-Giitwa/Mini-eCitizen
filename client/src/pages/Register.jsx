import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Report problems in your area and follow their progress.">
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Full name</span>
          <input name="name" required minLength="2" autoComplete="name" value={form.name} onChange={update} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" name="email" required autoComplete="email" value={form.email} onChange={update} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" name="password" required minLength="8" autoComplete="new-password"
            value={form.password} onChange={update} />
          <small className="muted">At least 8 characters</small>
        </label>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
