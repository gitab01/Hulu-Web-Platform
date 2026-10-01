import { Link } from 'react-router-dom';
import CoverArt from './CoverArt';

function clock(sec = 0) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Fixed 16:9 cover box so a slow image never shifts the row. Cards that carry
 * progress link straight back into the player at the saved second.
 */
export default function TitleCard({ item }) {
  const pct =
    item.progress && item.progress.durationSec
      ? Math.min(100, Math.round((item.progress.positionSec / item.progress.durationSec) * 100))
      : null;

  const to =
    item.progress && item.progress.episodeId
      ? `/watch/${item.id}/${item.progress.episodeId}`
      : `/title/${item.slug}`;

  return (
    <Link className="card" to={to}>
      <CoverArt item={item} size="card" />
      {pct !== null && (
        <>
          <div className="card-progress">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="card-meta">
            <div className="card-sub">
              <span className="resume">Resume at {clock(item.progress.positionSec)}</span>
            </div>
          </div>
        </>
      )}
    </Link>
  );
}
