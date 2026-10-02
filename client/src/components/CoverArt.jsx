/**
 * Renders a title's artwork, or the typeset slab when it has none: a black field,
 * the name in stretched display type and a mono slate line. Real artwork comes from
 * TMDB on seed; landscape art is chosen for the wide slots (an episode still for
 * episodes, a backdrop for cards, hero and detail) and falls back to the poster.
 *
 * A title with no art but an Amharic name is one of the local originals, and gets
 * its own drawn key art rather than the generic slab.
 */
import EthiopianCover, { hasLocalArt } from './EthiopianCover';

function initialsOf(name = '') {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(' ').filter(Boolean);
  if (!words.length) return '--';
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function artFor(item, size) {
  if (size === 'ep') return item.stillUrl || item.backdropUrl || item.posterUrl;
  return item.backdropUrl || item.posterUrl;
}

export default function CoverArt({ item, size = 'card', slate }) {
  const url = artFor(item, size);
  const genres = (item.genres || []).slice(0, 2).join(' · ');
  const slateLine = slate || `${item.type === 'series' ? 'Series' : 'Film'} — ${item.year || '—'}`;

  if (hasLocalArt(item)) return <EthiopianCover item={item} size={size} />;

  return (
    <div className={`cover cover--${size}`} role={url ? undefined : 'img'} aria-label={url ? undefined : `${item.name} cover`}>
      {url ? (
        <>
          <img className="cover-img" src={url} alt={item.name} loading="lazy" />
          {size === 'ep' && slate ? <span className="cover-tag">{slate}</span> : null}
        </>
      ) : (
        <>
          <span className="cover-mono" aria-hidden="true">
            {initialsOf(item.name)}
          </span>
          <div>
            <div className="cover-name">{item.name}</div>
            <div className="cover-foot" style={{ marginTop: 10 }}>
              <span className="cover-slate">{genres || slateLine}</span>
              <span className="cover-slate">{item.maturity}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
