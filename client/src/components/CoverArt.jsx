/**
 * The catalogue ships no artwork, so covers are typeset from the title's own
 * metadata: a black slab, the name in stretched display type, a mono slate line.
 * A real posterUrl replaces the slab the moment one exists.
 */
function initialsOf(name = '') {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(' ').filter(Boolean);
  if (!words.length) return '--';
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CoverArt({ item, size = 'card', slate }) {
  const url = size === 'hero' || size === 'detail' ? item.backdropUrl || item.posterUrl : item.posterUrl;
  const genres = (item.genres || []).slice(0, 2).join(' · ');
  const slateLine = slate || `${item.type === 'series' ? 'Series' : 'Film'} — ${item.year || '—'}`;

  return (
    <div className={`cover cover--${size}`} role={url ? undefined : 'img'} aria-label={url ? undefined : `${item.name} cover`}>
      {url ? <img className="cover-img" src={url} alt={item.name} loading="lazy" /> : null}
      {!url && (
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
