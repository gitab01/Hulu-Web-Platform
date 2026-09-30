import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';
import { PageLoading } from '../App';

export default function TitlePage() {
  const { slug } = useParams();
  const { entitled, user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTitle(null);
    catalog
      .title(slug)
      .then((d) => setTitle(d.title))
      .catch((e) => setError(e.status === 404 ? 'Title not found' : e.message));
  }, [slug]);

  if (error) {
    return (
      <div className="container center" style={{ padding: 40 }}>
        <p className="error">{error}</p>
        <Link to="/" className="btn">
          Back home
        </Link>
      </div>
    );
  }
  if (!title) return <PageLoading />;

  const firstEp = title.seasons?.[0]?.episodes?.[0];

  function goToEpisode(episodeId) {
    if (!user) return navigate('/signin', { state: { from: { pathname: `/watch/${title.id}/${episodeId}` } } });
    if (!entitled) return navigate('/subscribe', { state: { from: { pathname: `/watch/${title.id}/${episodeId}` } } });
    navigate(`/watch/${title.id}/${episodeId}`);
  }

  // Resume beats Play: if progress exists, the primary action resumes from it.
  const resumeTarget = title.resume?.episodeId || firstEp?._id;
  const primaryLabel = title.resume ? 'Resume' : 'Play';

  return (
    <article>
      {title.backdropUrl ? (
        <img className="detail-backdrop" src={title.backdropUrl} alt={title.name} />
      ) : (
        <div className="detail-backdrop" style={{ height: 260, display: 'grid', placeItems: 'center', background: 'var(--surface)', color: 'var(--muted)' }}>
          Preview art
        </div>
      )}

      <div className="container">
        <div className="detail-head">
          <h1 style={{ marginTop: 0 }}>{title.name}</h1>
          <div>
            {title.genres?.map((g) => (
              <span className="tag" key={g}>
                {g}
              </span>
            ))}
            <span className="badge">{title.maturity}</span>
            <span className="badge" style={{ marginLeft: 6 }}>
              {title.year}
            </span>
          </div>
          <p style={{ color: 'var(--muted)', maxWidth: '70ch' }}>{title.synopsis}</p>
          <button className="btn btn-primary" onClick={() => goToEpisode(resumeTarget)}>
            {primaryLabel}
          </button>
        </div>

        {title.seasons?.map((season) => (
          <section key={season._id} style={{ padding: '18px 0' }}>
            <h2>Season {season.season}</h2>
            <ul className="episodes">
              {season.episodes.map((ep) => {
                const prog = title.progressByEpisode?.[ep._id];
                return (
                  <li className="episode" key={ep._id}>
                    <span className="ep-idx">{ep.number}</span>
                    <div className="ep-main">
                      <div style={{ fontWeight: 600 }}>{ep.title}</div>
                      <div className="hint">
                        {Math.round(ep.durationSec / 60)} min{prog?.completed ? ' · watched' : ''}
                      </div>
                      <div className="hint">{ep.synopsis}</div>
                    </div>
                    <button className="btn btn-sm" onClick={() => goToEpisode(ep._id)}>
                      {prog && !prog.completed && prog.positionSec > 5 ? 'Resume' : 'Play'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {title.similarTitles?.length > 0 && (
          <Row row={{ key: 'similar', title: 'More Like This', items: title.similarTitles }} />
        )}
      </div>
    </article>
  );
}
