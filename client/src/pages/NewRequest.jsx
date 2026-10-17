import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useMeta } from '../hooks/useMeta';

const MAX_IMAGE_MB = 5;

export default function NewRequest() {
  const navigate = useNavigate();
  const { categories } = useMeta();
  const [form, setForm] = useState({ category: '', location: '', description: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Build (and clean up) a local preview URL for the chosen image.
  useEffect(() => {
    if (!image) return setPreview('');
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickImage = (e) => {
    const file = e.target.files[0];
    if (file && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_IMAGE_MB}MB or smaller`);
      e.target.value = '';
      return;
    }
    setError('');
    setImage(file || null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (image) formData.append('image', image);
      const created = await api('/requests', { method: 'POST', formData });
      navigate(`/requests/${created.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="narrow">
      <h1>Submit a request</h1>
      <p className="muted">Tell us what needs attention and where. We’ll keep you updated.</p>

      <form className="card stack" onSubmit={submit}>
        <label className="field">
          <span>Category</span>
          <select name="category" required value={form.category} onChange={update}>
            <option value="" disabled>Select a category…</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Location</span>
          <input name="location" required minLength="3" placeholder="Street, estate or landmark"
            value={form.location} onChange={update} />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea name="description" rows="5" required minLength="10" maxLength="1000"
            placeholder="Describe the problem and how long it has been happening"
            value={form.description} onChange={update} />
          <small className="muted">{form.description.length}/1000</small>
        </label>

        <label className="field">
          <span>Photo (optional)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} />
        </label>
        {preview && <img className="preview" src={preview} alt="Selected upload preview" />}

        {error && <p className="alert alert--error" role="alert">{error}</p>}
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
      </form>
    </div>
  );
}
