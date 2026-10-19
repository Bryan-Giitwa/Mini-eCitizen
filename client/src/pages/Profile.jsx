import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PasswordInput from '../components/PasswordInput';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const updatedUser = await updateProfile(form);
      setForm({
        name: updatedUser.name,
        phone: updatedUser.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccess('Your profile has been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="narrow profile-page">
      <Link to="/" className="btn btn--ghost btn--sm profile-back">
        ← Back to dashboard
      </Link>
      <header className="profile-heading">
        <span className="profile-heading__mark" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <h1>Your profile</h1>
          <p className="muted">Manage your account details and password.</p>
        </div>
      </header>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Full name</span>
          <input name="name" required minLength="2" maxLength="100" autoComplete="name"
            value={form.name} onChange={update} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="profile-email-input" type="email" value={user.email} readOnly disabled />
          <small className="muted">Email addresses cannot be changed here.</small>
        </label>
        <label className="field">
          <span>Phone number</span>
          <input type="tel" name="phone" required autoComplete="tel" maxLength="20"
            placeholder="+254 712 345 678" value={form.phone} onChange={update} />
        </label>

        <div className="profile-passwords">
          <h2>Password</h2>
          <p className="muted small">Enter your current password to save profile changes. Leave the new password fields blank to keep your password unchanged.</p>
          <label className="field">
            <span>Current password</span>
            <PasswordInput id="profile-current-password" name="currentPassword" required
              autoComplete="current-password" value={form.currentPassword} onChange={update} />
          </label>
          <label className="field">
            <span>New password (optional)</span>
            <PasswordInput id="profile-new-password" name="newPassword" minLength="8"
              autoComplete="new-password" value={form.newPassword} onChange={update} />
            <small className="muted">At least 8 characters if you choose to change it.</small>
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <PasswordInput id="profile-confirm-password" name="confirmPassword"
              autoComplete="new-password" value={form.confirmPassword} onChange={update} />
          </label>
        </div>

        {error && <p className="alert alert--error" role="alert">{error}</p>}
        {success && <p className="alert alert--success" role="status">{success}</p>}
        <button className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving changes…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
