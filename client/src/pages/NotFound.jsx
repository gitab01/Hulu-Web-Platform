import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container center" style={{ padding: 60 }}>
      <h1>Page not found</h1>
      <p className="hint">That title or page doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </div>
  );
}
