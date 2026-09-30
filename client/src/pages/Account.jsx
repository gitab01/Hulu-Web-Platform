import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, subscription, entitled } = useAuth();
  const [row, setRow] = useState(null);

  useEffect(() => {
    catalog.rows().then((d) => setRow(d.rows.find((r) => r.key === 'continue_watching') || null)).catch(() => {});
  }, []);

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 720 }}>
      <h1>Account</h1>
      <div className="plan" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{user?.displayName || user?.email}</div>
            <div className="hint">{user?.email}</div>
            <div className="hint" style={{ marginTop: 6 }}>
              Genres: {user?.genres?.length ? user.genres.join(', ') : 'none selected'}
            </div>
          </div>
          <div className="center">
            {subscription ? (
              <>
                <div className={`badge ${entitled ? 'badge--live' : ''}`}>{subscription.status}</div>
                <div className="hint" style={{ marginTop: 6 }}>
                  Plan: {subscription.plan}
                </div>
                <div className="hint">Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</div>
              </>
            ) : (
              <div className="hint">No subscription</div>
            )}
            {!entitled && (
              <Link to="/subscribe" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                Subscribe
              </Link>
            )}
          </div>
        </div>
      </div>

      {row?.items?.length > 0 && (
        <section>
          <h2>Continue watching</h2>
          <div className="row-track">
            {row.items.map((i) => (
              <Link className="card" key={i.id} to={i.progress?.episodeId ? `/watch/${i.id}/${i.progress.episodeId}` : `/title/${i.slug}`}>
                <div className="card-poster" style={{ display: 'grid', placeItems: 'center', background: 'var(--surface)', color: 'var(--muted)' }}>
                  {i.name}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
