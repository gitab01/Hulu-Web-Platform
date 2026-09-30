import { Link } from 'react-router-dom';

/**
 * Card links to the title detail page. Poster uses a fixed 16:9 aspect-ratio box
 * (see CSS) so slow image loads never shift the layout.
 */
export default function TitleCard({ item }) {
  const pct =
    item.progress && item.progress.durationSec
      ? Math.min(100, Math.round((item.progress.positionSec / item.progress.durationSec) * 100))
      : null;

  // A "continue watching" card links straight back to where the viewer left off.
  const to =
    item.progress && item.progress.episodeId
      ? `/watch/${item.id}/${item.progress.episodeId}`
      : `/title/${item.slug}`;

  return (
    <Link className="card" to={to}>
      <div className="card-progress-holder">
        {item.posterUrl ? (
          <img className="card-poster" src={item.posterUrl} alt={item.name} loading="lazy" />
        ) : (
          <div className="card-poster" role="img" aria-label={item.name} style={{ display: 'grid', placeItems: 'center', background: 'var(--surface)', color: 'var(--muted)' }}>
            {item.name}
          </div>
        )}
      </div>
      {pct !== null && (
        <div className="card-progress">
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="card-meta">
        <div className="card-title">{item.name}</div>
        <div className="card-sub">
          {item.year} · {item.genres?.slice(0, 2).join(', ')}
        </div>
      </div>
    </Link>
  );
}
