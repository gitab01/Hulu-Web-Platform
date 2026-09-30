import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { billing } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Subscribe() {
  const { entitled, refreshEntitlement } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [provider, setProvider] = useState('mock');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const isSuccess = location.pathname.endsWith('/success');

  // After a Stripe checkout redirects back, entitlement state may already be set by
  // the webhook; re-read it and drop the user into what they came for.
  useEffect(() => {
    if (isSuccess) {
      refreshEntitlement().then(() => {
        const from = location.state?.from?.pathname;
        navigate(from || '/', { replace: true });
      });
    }
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    billing
      .plans()
      .then((d) => {
        setPlans(d.plans);
        setProvider(d.provider);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function choose(planId) {
    setBusy(planId);
    setError(null);
    try {
      if (provider === 'mock') {
        await billing.mockConfirm(planId);
        await refreshEntitlement();
        navigate(location.state?.from?.pathname || '/', { replace: true });
      } else {
        const { checkoutUrl } = await billing.checkout(planId);
        window.location.href = checkoutUrl;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (entitled) {
    return (
      <div className="container center" style={{ padding: 40 }}>
        <h1>You’re subscribed</h1>
        <p className="hint">Your membership is active.</p>
        <Link to="/" className="btn btn-primary">
          Start watching
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 16px', maxWidth: 760 }}>
      <h1>Choose a plan</h1>
      <p className="hint">
        Billing provider:{' '}
        <span className="badge badge--live">{provider === 'mock' ? 'Mock (no Stripe keys configured)' : 'Stripe (test mode)'}</span>
      </p>
      {location.pathname.endsWith('/cancel') && <p className="error">Checkout was cancelled.</p>}
      {error && <p className="error">{error}</p>}

      <div className="plan-grid">
        {plans?.map((p) => (
          <div className="plan" key={p.id}>
            <h3 style={{ marginTop: 0 }}>{p.label}</h3>
            {p.priceUsd != null && <div style={{ fontSize: 24, fontWeight: 800 }}>${p.priceUsd}/mo</div>}
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className="btn btn-primary btn-block" disabled={busy === p.id} onClick={() => choose(p.id)}>
              {busy === p.id ? 'Working…' : provider === 'mock' ? 'Activate' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>

      {provider === 'mock' && (
        <p className="hint">
          Mock mode activates entitlement instantly so the full experience is usable without a Stripe account. Set
          <code> STRIPE_SECRET_KEY</code> on the API to switch to real checkout.
        </p>
      )}
    </div>
  );
}
