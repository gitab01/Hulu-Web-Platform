import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container">
      <div className="notice notice--error">
        <span className="eyebrow">Error 404</span>
        <h2>No such page</h2>
        <p>The address you followed does not match a title or a page here. It may have been mistyped or removed.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary">
            Front page
          </Link>
          <Link to="/search" className="btn">
            Search titles
          </Link>
        </div>
      </div>
    </div>
  );
}
