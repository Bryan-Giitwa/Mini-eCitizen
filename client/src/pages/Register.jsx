import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthShell from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form.name, form.email, form.phone, form.password);
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
          <span>Phone number</span>
          <input type="tel" name="phone" required autoComplete="tel" maxLength="20"
            placeholder="+254 712 345 678" value={form.phone} onChange={update} />
          <small className="muted">Include your country code, e.g. +254 712 345 678</small>
        </label>
        <label className="field">
          <span id="register-password-label">Password</span>
          <PasswordInput id="register-password" name="password" required minLength="8" autoComplete="new-password"
            value={form.password} onChange={update} aria-labelledby="register-password-label" />
          <small className="muted">At least 8 characters</small>
        </label>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
