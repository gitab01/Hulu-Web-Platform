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
      <div className="container">
        <div className="notice">
          <span className="eyebrow">Membership</span>
          <h2>Your plan is active</h2>
          <p>You can play any title in the catalogue. Nothing further to buy.</p>
          <Link to="/" className="btn btn-primary btn--play">
            Start watching
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="panel panel--wide">
        <span className="eyebrow">Step 02 of 02 — choose a plan</span>
        <h1>Choose a plan</h1>
        <p className="hint" style={{ marginTop: 0 }}>
          Both plans open the full catalogue. The difference is quality and how many streams run at once.
        </p>

        {location.pathname.endsWith('/cancel') && (
          <p className="error">Checkout cancelled — nothing was charged and no plan is active yet.</p>
        )}
        {error && <p className="error">{error}</p>}

        <div className="plan-grid">
          {plans?.map((p) => (
            <div className="plan" key={p.id}>
              <h3>{p.label}</h3>
              {p.priceUsd != null && (
                <div className="price">
                  ${p.priceUsd}
                  <small>/month</small>
                </div>
              )}
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className="btn btn-primary btn-block" disabled={busy === p.id} onClick={() => choose(p.id)}>
                {busy === p.id ? 'Setting up your plan…' : provider === 'mock' ? 'Activate plan' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        <p className="slate">
          Billing provider: {provider === 'mock' ? 'mock — entitlement granted instantly, no card involved' : 'Stripe test mode'}
        </p>
        {provider === 'mock' && (
          <p className="hint">
            Mock mode exists so the whole product is walkable without a Stripe account. Set <code>STRIPE_SECRET_KEY</code> on
            the API to switch to real checkout.
          </p>
        )}
      </div>
    </div>
  );
}
