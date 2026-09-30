import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';
import RowSkeleton from '../components/RowSkeleton';

function Hero({ item }) {
  if (!item) return null;
  return (
    <div className="hero">
      {item.backdropUrl ? (
        <img className="hero-media" src={item.backdropUrl} alt={item.name} />
      ) : (
        <div className="hero-media" style={{ display: 'grid', placeItems: 'center', background: 'var(--surface)' }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Preview art</span>
        </div>
      )}
      <div className="hero-body">
        <h1>{item.name}</h1>
        <p>{item.synopsis}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to={`/title/${item.slug}`}>
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { ready } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    catalog
      .rows()
      .then((data) => alive && setRows(data.rows))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [ready]);

  // Rows render independently; the hero is derived from the first trending item.
  const trending = rows?.find((r) => r.key === 'trending');
  const heroItem = rows ? trending?.items?.[0] : null;
  // Only show the hero from a signed-in state, or for everyone as a marketing billboard.
  const orderedRows = rows?.filter((r) => !(r.key === 'trending' && r.items?.[0]?.id === heroItem?.id)) || null;

  return (
    <>
      {!rows && !error && (
        <>
          <div className="container" style={{ paddingTop: 24 }}>
            <div className="skel" style={{ height: 'clamp(280px, 40vh, 420px)' }} />
          </div>
          <RowSkeleton />
          <RowSkeleton />
        </>
      )}

      {error && (
        <div className="container center" style={{ padding: 40 }}>
          <p className="error">Could not load the catalogue: {error}</p>
          <p className="hint">Is the API running? Try signing in with a seeded account.</p>
        </div>
      )}

      {rows && (
        <>
          <Hero item={heroItem} />
          {orderedRows?.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </>
      )}
    </>
  );
}
