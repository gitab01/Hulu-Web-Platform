import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_PASSWORD = 'password123';
const DEMOS = [
  { email: 'demo@hulu.test', label: 'Premium viewer', note: 'Watch history — personal rows' },
  { email: 'maya@hulu.test', label: 'Basic viewer', note: 'Watch history — smaller plan' },
  { email: 'sam@hulu.test', label: 'New member', note: 'No plan, no history — cold start' },
];

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(d) {
    setEmail(d.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="panel">
      <span className="eyebrow">Members</span>
      <h1>Sign in</h1>
      <p className="hint" style={{ marginTop: 0 }}>
        Same email on any device, same place in every episode.
      </p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="hint center" style={{ marginTop: 16 }}>
        New here? <Link to="/signup">Create an account</Link>
      </p>

      <div className="creds">
        <span className="eyebrow">Seeded demo accounts</span>
        {DEMOS.map((d) => (
          <button type="button" key={d.email} onClick={() => fillDemo(d)}>
            <b>{d.label}</b>
            <span className="slate">{d.email}</span>
            <em>{d.note}</em>
          </button>
        ))}
      </div>
    </div>
  );
}
