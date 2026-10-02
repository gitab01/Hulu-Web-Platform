/**
 * Typeset key art for the Ethiopian slate.
 *
 * The originals have no photography behind them — a poster would need an image
 * host or a TMDB key, and the local slate is exactly the part we produce
 * ourselves — so the art is drawn here instead: a black field, the broadcaster's
 * own line motif for that title, the Amharic name set in Ethiopic type over the
 * Latin one, and a woven tibeb band along the bottom. It is the same ink-on-paper
 * system the rest of the site uses, and it renders identically at 390px and 1440px
 * because it is vectors and type, not a bitmap.
 */

const MOTIFS = {
  drum: (
    <>
      <path d="M98 38h44l-7 46h-30Z" />
      <path d="M98 38c7-6 35-6 44 0" />
      <path d="M102 52l36 9M102 66l36-9" />
      <path d="M62 42c-9-9-9-21 0-30M178 42c9-9 9-21 0-30" />
      <path d="M46 76c10 7 10 19 0 26M194 76c-10 7-10 19 0 26" />
    </>
  ),
  lake: (
    <>
      <path d="M6 84c26-6 40 6 66 0s40-12 78-6 46 6 84 0" />
      <path d="M6 100c30-5 46 5 72 0s48-8 88-3" opacity="0.55" />
      <path d="M40 84c-2-15 4-25 12-31M54 84c0-10 4-16 10-20" />
      <path d="M104 42c6-7 13-7 19 0M128 32c6-7 13-7 19 0" />
      <circle cx="188" cy="30" r="11" />
    </>
  ),
  light: (
    <>
      <path d="M120 96V62m-9 34h18" />
      <path d="M120 54c-7-9 0-16 0-23 0 7 7 14 0 23Z" />
      <path d="M78 96V72m-8 24h16" />
      <path d="M78 66c-5-7 0-12 0-17 0 5 5 10 0 17Z" />
      <path d="M166 96V72m-8 24h16" />
      <path d="M166 66c-5-7 0-12 0-17 0 5 5 10 0 17Z" />
      <path d="M92 34c10-9 46-9 56 0" opacity="0.55" />
    </>
  ),
  coffee: (
    <>
      <path d="M96 96c-14 0-22-9-22-20 0-13 10-20 22-20 14 0 24 7 24 20 0 11-9 20-24 20Z" />
      <path d="M118 62c10 0 16 4 16 10s-6 10-14 10" />
      <path d="M96 56V40m-8 0h16" />
      <path d="M74 96h44" />
      <path d="M150 90a7 7 0 0 1 14 0Zm28 0a7 7 0 0 1 14 0Zm28 0a7 7 0 0 1 14 0Z" />
      <path d="M157 78c0-6 4-6 4-12m15 12c0-6 4-6 4-12m15 12c0-6 4-6 4-12" />
    </>
  ),
  sound: (
    <>
      <path d="M30 96V74m18 22V52m18 44V64m18 32V36m18 60V58m18 38V44m18 52V70m18 26V56m18 40V78" />
      <path d="M186 44V22h-14" />
      <circle cx="167" cy="20" r="7" />
    </>
  ),
  mountains: (
    <>
      <path d="M6 96 46 52l24 26 30-40 32 42 26-24 40 40" />
      <path d="M6 74c14-4 22 4 34 0" />
      <circle cx="196" cy="30" r="11" />
      <path d="M6 108c40 0 52-10 84-10s56 10 104 6" />
    </>
  ),
  bonfire: (
    <>
      <path d="M120 96c-16 0-26-10-26-22 0-16 16-20 16-38 12 10 14 18 12 26 8-4 10-12 10-18 12 12 14 22 14 30 0 12-10 22-26 22Z" />
      <path d="M84 100l72-14M84 86l72 14" />
      <circle cx="150" cy="34" r="2.5" />
      <circle cx="164" cy="52" r="2" />
      <circle cx="96" cy="26" r="2" />
      <circle cx="132" cy="14" r="2.5" />
    </>
  ),
  river: (
    <>
      <path d="M10 26c34 0 44 22 78 22s44-22 78-22" />
      <path d="M10 50c34 0 44 22 78 22s44-22 78-22" />
      <path d="M10 74c34 0 44 22 78 22s44-22 78-22" />
      <path d="M10 98c34 0 44 22 78 22" opacity="0.5" />
    </>
  ),
};

export function hasLocalArt(item) {
  return Boolean(item && item.nameLocal && !item.backdropUrl && !item.posterUrl);
}

export default function EthiopianCover({ item, size = 'card' }) {
  const motif = MOTIFS[item.motif] || MOTIFS.mountains;
  const genres = (item.genres || []).slice(0, 2).join(' · ');

  return (
    <div className={`cover cover--${size} cover--local`} role="img" aria-label={`${item.name} — ${item.nameLocal}`}>
      <svg className="cover-motif" viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g>{motif}</g>
      </svg>
      <div className="cover-local-body">
        <div className="cover-local-am">{item.nameLocal}</div>
        <div className="cover-name">{item.name}</div>
        <div className="cover-foot" style={{ marginTop: 8 }}>
          <span className="cover-slate">{genres || item.year}</span>
          <span className="cover-slate">{item.maturity}</span>
        </div>
      </div>
      <div className="cover-tibeb" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
