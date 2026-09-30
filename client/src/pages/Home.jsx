import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';
import RowSkeleton from '../components/RowSkeleton';
import CoverArt from '../components/CoverArt';

function Hero({ item }) {
  if (!item) return null;
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Featured title</span>
          <h1>{item.name}</h1>
          <dl className="hero-facts">
            <div>
              <dt>Type</dt>
              <dd>{item.type === 'series' ? 'Series' : 'Film'}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{item.year}</dd>
            </div>
            <div>
              <dt>Genres</dt>
              <dd>{(item.genres || []).slice(0, 3).join(', ')}</dd>
            </div>
            <div>
              <dt>Rating</dt>
              <dd>{item.maturity}</dd>
            </div>
          </dl>
          <p>{item.synopsis}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn--play" to={`/title/${item.slug}`}>
              Watch {item.name}
            </Link>
            <Link className="btn btn-ghost" to={`/title/${item.slug}`}>
              Episodes and details
            </Link>
          </div>
        </div>
        <CoverArt item={item} size="hero" />
      </div>
    </section>
  );
}

export default function Home() {
  const { ready, user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setError(null);
    catalog
      .rows()
      .then((data) => alive && setRows(data.rows))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [ready, attempt]);

  const trending = rows?.find((r) => r.key === 'trending');
  const heroItem = rows ? trending?.items?.[0] : null;
  const otherRows = rows?.filter((r) => !(r.key === 'trending' && r.items?.[0]?.id === heroItem?.id)) || [];

  if (error) {
    return (
      <div className="container">
        <div className="notice notice--error">
          <h2>The catalogue did not load</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>
            Load the catalogue again
          </button>
        </div>
      </div>
    );
  }

  if (!rows) {
    return (
      <>
        <div className="container" style={{ paddingTop: 'clamp(20px, 4vw, 36px)' }}>
          <div className="skel skel-hero" />
        </div>
        <RowSkeleton />
        <RowSkeleton />
      </>
    );
  }

  if (!rows.some((r) => r?.items?.length)) {
    return (
      <div className="container">
        <div className="notice">
          <h2>No titles on this deployment yet</h2>
          <p>
            The catalogue is empty, so there is nothing to recommend. Run <code>npm run seed</code> against this database to
            load the sample titles and watch history.
          </p>
          {!user && (
            <Link to="/signup" className="btn btn-primary">
              Create an account
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Hero item={heroItem} />
      {otherRows.map((row) => (
        <Row key={row.key} row={row} />
      ))}
      {heroItem && !user && (
        <div className="container">
          <div className="notice">
            <h2>Sign in to make these rows yours</h2>
            <p>
              Continue Watching, Because You Watched and Recommended For You are built from your own watch history. An account
              with no history still gets sensible picks from the genres you choose at signup.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/signin" className="btn btn-primary">
                Sign in
              </Link>
              <Link to="/signup" className="btn">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
