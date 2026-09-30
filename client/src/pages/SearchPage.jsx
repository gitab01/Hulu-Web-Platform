import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalog } from '../api/client';
import TitleCard from '../components/TitleCard';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResults(null);
    if (!q) return;
    catalog
      .search(q)
      .then((d) => setResults(d.results))
      .catch((e) => setError(e.message));
  }, [q]);

  return (
    <div className="container" style={{ padding: '28px 16px' }}>
      <h1>Results for “{q}”</h1>
      {error && <p className="error">{error}</p>}
      {!results && !error && <p className="hint">Searching…</p>}
      {results && results.length === 0 && <p className="hint">No titles matched.</p>}
      {results?.length > 0 && (
        <div className="row-track" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
          {results.map((item) => (
            <TitleCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
