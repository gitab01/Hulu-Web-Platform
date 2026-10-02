import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Play } from 'lucide-react';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';
import RowSkeleton from '../components/RowSkeleton';
import CoverArt from '../components/CoverArt';
import EthiopiaSpots from '../components/EthiopiaSpots';
import LiveStrip from '../components/LiveStrip';
import EthiopiaBanner from '../components/EthiopiaBanner';

function Hero({ item }) {
  if (!item) return null;
  const local = item.origin === 'Ethiopia';
  return (
    <section className={`hero${local ? ' hero--local' : ''}`}>
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">
            {local && (
              <span className="flagline" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            )}
            {local ? 'Ethiopian Original' : 'Featured title'}
          </span>
          {local && <div className="hero-local">{item.nameLocal}</div>}
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
            <Link className="btn btn-primary" to={`/title/${item.slug}`}>
              <Play aria-hidden="true" />
              Watch {item.name}
            </Link>
            <Link className="btn btn-ghost" to={`/title/${item.slug}`}>
              <Info aria-hidden="true" />
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
  const local = rows?.find((r) => r.key === 'ethiopian_originals');
  const heroItem = rows ? (local?.items?.[0] || trending?.items?.[0]) || null : null;
  // A row gives up its seat only when the hero came out of it; the local slate
  // keeps its row, because seeing the whole slate is the point of featuring one.
  const heroSource = trending?.items?.[0]?.id === heroItem?.id ? trending : null;
  const otherRows = rows?.filter((r) => r !== heroSource) || [];

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
      <EthiopiaSpots />
      <EthiopiaBanner />
      {otherRows.map((row, i) => (
        <Fragment key={row.key}>
          <Row row={row} />
          {i === 0 && <LiveStrip />}
        </Fragment>
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
