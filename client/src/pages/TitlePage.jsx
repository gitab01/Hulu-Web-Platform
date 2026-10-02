import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Play } from 'lucide-react';
import { catalog } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Row from '../components/Row';
import CoverArt from '../components/CoverArt';
import { PageLoading } from '../App';

function minutes(episodes) {
  return Math.round(episodes.reduce((sum, e) => sum + (e.durationSec || 0), 0) / 60);
}

export default function TitlePage() {
  const { slug } = useParams();
  const { entitled, user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTitle(null);
    setError(null);
    catalog
      .title(slug)
      .then((d) => setTitle(d.title))
      .catch((e) => setError(e.status === 404 ? 'no such title' : e.message));
  }, [slug]);

  if (error) {
    return (
      <div className="container">
        <div className="notice notice--error">
          <h2>We could not open this title</h2>
          <p>{error === 'no such title' ? 'No title matches this address. It may have left the catalogue.' : error}</p>
          <Link to="/" className="btn btn-primary">
            Back to the front page
          </Link>
        </div>
      </div>
    );
  }
  if (!title) return <PageLoading />;

  const flatEps = title.seasons?.flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.season }))) || [];
  const firstEp = flatEps[0];

  function goToEpisode(episodeId) {
    if (!user) return navigate('/signin', { state: { from: { pathname: `/watch/${title.id}/${episodeId}` } } });
    if (!entitled) return navigate('/subscribe', { state: { from: { pathname: `/watch/${title.id}/${episodeId}` } } });
    navigate(`/watch/${title.id}/${episodeId}`);
  }

  // Resume beats Play: if progress exists, the primary action resumes from it.
  const resumeTarget = title.resume?.episodeId || firstEp?._id;
  const resumeEp = title.resume ? flatEps.find((e) => e._id === title.resume.episodeId) : null;
  const primaryLabel = resumeEp
    ? `Resume S${resumeEp.season} E${resumeEp.number}`
    : title.resume
      ? 'Resume'
      : 'Play';

  const completed = flatEps.filter((e) => title.progressByEpisode?.[e._id]?.completed).length;
  let progressLabel = 'Not started';
  if (title.resume) progressLabel = 'Started';
  else if (flatEps.length && completed === flatEps.length) progressLabel = 'Finished';
  else if (completed) progressLabel = 'Partly watched';

  return (
    <article className="container">
      <div className="detail-head">
        <div>
          <span className="eyebrow">
            {title.type === 'series' ? 'Series' : 'Film'} · {title.year} · {title.maturity}
          </span>
          <h1>{title.name}</h1>
          {title.nameLocal && (
            <div className="detail-local">
              <span className="flagline" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="detail-local-am">{title.nameLocal}</span>
              <span className="detail-local-credit">Ethiopian Original</span>
            </div>
          )}
          <p className="synopsis">{title.synopsis}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => goToEpisode(resumeTarget)}>
              <Play aria-hidden="true" />
              {primaryLabel}
            </button>
            {!entitled && (
              <Link className="btn" to="/subscribe">
                <CreditCard aria-hidden="true" />
                Choose a plan to watch
              </Link>
            )}
          </div>
          <div style={{ marginTop: 18 }}>
            {title.genres?.map((g) => (
              <span className="tag" key={g}>
                {g}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-side">
          <CoverArt item={title} size="detail" />
          <dl className="detail-facts">
            <div>
              <dt>Seasons</dt>
              <dd>{title.seasons?.length || 0}</dd>
            </div>
            <div>
              <dt>Episodes</dt>
              <dd>{flatEps.length}</dd>
            </div>
            <div>
              <dt>Total runtime</dt>
              <dd>{minutes(flatEps)} min</dd>
            </div>
            <div>
              <dt>Your progress</dt>
              <dd>{progressLabel}</dd>
            </div>
          </dl>
        </div>
      </div>

      {title.seasons?.map((season) => {
        const mins = minutes(season.episodes);
        return (
          <section className="season-block" key={season._id}>
            <h2>Season {season.season}</h2>
            <div className="slate">
              {season.episodes.length} episodes · {mins} min
            </div>
            <ul className="episodes">
              {season.episodes.map((ep) => {
                const prog = title.progressByEpisode?.[ep._id];
                const resumable = prog && !prog.completed && prog.positionSec > 5;
                return (
                  <li className="episode" key={ep._id}>
                    <span className="ep-num">{String(ep.number).padStart(2, '0')}</span>
                    <div className="ep-thumb">
                      <CoverArt item={{ ...ep, name: ep.title, type: 'episode', year: null, genres: [], maturity: null }} size="ep" slate={`S${season.season} E${ep.number}`} />
                    </div>
                    <div className="ep-main">
                      <div className="ep-title">{ep.title}</div>
                      <div className="ep-syn">{ep.synopsis}</div>
                      <div className="ep-meta">
                        {Math.round((ep.durationSec || 0) / 60)} min
                        {prog?.completed && <span className="ep-watched"> · finished</span>}
                        {resumable && <span className="ep-watched"> · resume at {Math.floor(prog.positionSec / 60)}m</span>}
                      </div>
                    </div>
                    <button className="btn btn-sm" onClick={() => goToEpisode(ep._id)}>
                      <Play aria-hidden="true" />
                      {resumable ? 'Resume' : 'Play'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {title.similarTitles?.length > 0 && (
        <Row row={{ key: 'similar', title: 'More Like This', items: title.similarTitles }} />
      )}
    </article>
  );
}
