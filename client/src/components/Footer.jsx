import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="container foot-grid">
        <div>
          <span className="brand" style={{ fontSize: 15 }}>
            Streamline<sup>TV</sup>
          </span>
          <p className="slate">
            A full-stack streaming platform: JWT sessions with rotating refresh tokens, entitlement checked at token issue and
            again on every segment, signed playback URLs, and hybrid recommendations computed from watch history.
          </p>
        </div>
        <div>
          <span className="eyebrow">Stack</span>
          <p className="slate">
            React · Vite · React Router · Node · Express · Mongoose · MongoDB Atlas · Stripe · TMDB
          </p>
        </div>
        <div>
          <span className="eyebrow">Pages</span>
          <p className="slate">
            <Link to="/">Front page</Link> · <Link to="/search">Search</Link> · <Link to="/subscribe">Plans</Link> ·{' '}
            <Link to="/signin">Sign in</Link>
          </p>
        </div>
        <div>
          <span className="eyebrow">Content</span>
          <p className="slate">
            Titles, artwork and synopses are real metadata imported from The Movie Database at seed time; the video itself is
            public-domain stand-in footage, because the catalogue carries no licensed streams. This product uses the TMDB API
            but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
