import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalog } from '../api/client';
import TitleCard from '../components/TitleCard';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResults(null);
    setError(null);
    if (!q) return;
    catalog
      .search(q)
      .then((d) => setResults(d.results))
      .catch((e) => setError(e.message));
  }, [q]);

  return (
    <div className="container" style={{ paddingTop: 'clamp(20px, 4vw, 36px)', paddingBottom: 40 }}>
      {!q ? (
        <div className="notice">
          <h2>Search the catalogue</h2>
          <p>Type a title, genre or synopsis word in the bar above. Nothing you type leaves this app.</p>
          <Link to="/" className="btn btn-primary">
            Back to the front page
          </Link>
        </div>
      ) : (
        <>
          <span className="eyebrow">
            {results ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}` : 'Searching'}
          </span>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', margin: '6px 0 22px' }}>“{q}”</h1>

          {error && <p className="error">Search failed: {error}</p>}
          {!results && !error && (
            <div className="skel-row">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="skel-card" key={i}>
                  <div className="skel skel-poster" />
                  <div className="skel skel-line" style={{ width: '70%' }} />
                </div>
              ))}
            </div>
          )}
          {results?.length === 0 && (
            <div className="notice">
              <h2>Nothing matched “{q}”</h2>
              <p>Try a shorter word, or browse the front page rows instead.</p>
              <Link to="/" className="btn btn-primary">
                Front page
              </Link>
            </div>
          )}
          {results?.length > 0 && (
            <div className="grid">
              {results.map((item) => (
                <TitleCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
