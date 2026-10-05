import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';
import RowSkeleton from '../components/RowSkeleton';
import WarmUp from '../components/WarmUp';
import EthiopiaSpots from '../components/EthiopiaSpots';
import LiveStrip from '../components/LiveStrip';
import EthiopiaBanner from '../components/EthiopiaBanner';

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

  const hasTitles = Boolean(rows?.some((r) => r?.items?.length));

  return (
    <>
      <h1 className="sr-only">Internet television: Ethiopian originals, films, series and live channels</h1>
      <EthiopiaSpots />

      {error && (
        <div className="container">
          <div className="notice notice--error">
            <h2>The catalogue did not load</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>
              Load the catalogue again
            </button>
          </div>
        </div>
      )}

      {!error && !rows && (
        <>
          <div className="container">
            <WarmUp />
          </div>
          <RowSkeleton />
          <RowSkeleton />
        </>
      )}

      {!error && rows && (
        <>
          <EthiopiaBanner />
          <LiveStrip />
          {hasTitles && rows.map((row) => <Row key={row.key} row={row} />)}
          {!hasTitles && (
            <div className="container">
              <div className="notice">
                <h2>No titles on this deployment yet</h2>
                <p>
                  The catalogue is empty, so there is nothing to recommend. Run <code>npm run seed</code> against this database
                  to load the sample titles and watch history. The live line-up above needs the same pass.
                </p>
                {!user && (
                  <Link to="/signup" className="btn btn-primary">
                    Create an account
                  </Link>
                )}
              </div>
            </div>
          )}
          {hasTitles && !user && (
            <div className="container">
              <div className="notice">
                <h2>Sign in to make these rows yours</h2>
                <p>
                  Continue Watching, Because You Watched and Recommended For You are built from your own watch history. An
                  account with no history still gets sensible picks from the genres you choose at signup.
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
      )}
    </>
  );
}
