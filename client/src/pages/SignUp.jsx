import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GenrePicker from '../components/GenrePicker';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', displayName: '', password: '' });
  const [genres, setGenres] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, genres });
      // Land on a personalized front page: route through checkout to activate entitlement.
      navigate('/subscribe', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <span className="eyebrow">Step 01 of 02 — your details</span>
      <h1>Create your account</h1>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Display name</label>
          <input id="name" className="input" value={form.displayName} onChange={set('displayName')} placeholder="Optional" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} />
          <span className="hint">At least 8 characters.</span>
        </div>
        <GenrePicker value={genres} onChange={setGenres} />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating your account…' : 'Continue to plans'}
        </button>
      </form>
      <p className="hint center" style={{ marginTop: 16 }}>
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </div>
  );
}
