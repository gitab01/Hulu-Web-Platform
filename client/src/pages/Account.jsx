import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';

export default function Account() {
  const { user, subscription, entitled } = useAuth();
  const [contRow, setContRow] = useState(null);

  useEffect(() => {
    catalog
      .rows()
      .then((d) => setContRow(d.rows.find((r) => r.key === 'continue_watching') || null))
      .catch(() => {});
  }, []);

  const renew = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;

  return (
    <div className="container">
      <div className="panel panel--wide">
        <span className="eyebrow">Membership</span>
        <h1>{user?.displayName || user?.email}</h1>

        <div className="stat-grid">
          <div className="stat">
            <b>{subscription ? subscription.plan : '—'}</b>
            <span>Plan</span>
          </div>
          <div className="stat">
            <b>{subscription ? subscription.status : 'not subscribed'}</b>
            <span>Status</span>
          </div>
          <div className="stat">
            <b>{renew ? renew.toLocaleDateString() : '—'}</b>
            <span>{entitled ? 'Renews on' : 'Period end'}</span>
          </div>
          <div className="stat">
            <b>{contRow?.items?.length || 0}</b>
            <span>Started, unfinished</span>
          </div>
        </div>

        <dl className="detail-facts">
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Your genres</dt>
            <dd>{user?.genres?.length ? user.genres.join(', ') : 'None selected'}</dd>
          </div>
          <div>
            <dt>Billing provider</dt>
            <dd>{subscription?.stripeCustomerId ? 'Stripe' : 'Mock'}</dd>
          </div>
        </dl>

        {!entitled && (
          <div style={{ marginTop: 22 }}>
            <Link to="/subscribe" className="btn btn-primary">
              Choose a plan
            </Link>
            <span className="hint" style={{ marginLeft: 12 }}>
              Without a plan you can browse, but playback stays locked.
            </span>
          </div>
        )}
      </div>

      {contRow?.items?.length > 0 && <Row row={contRow} />}
    </div>
  );
}
