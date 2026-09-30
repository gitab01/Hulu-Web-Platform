import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, entitled, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  async function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          Streamline
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          {entitled && <NavLink to="/?row=continue">Watch</NavLink>}
          <NavLink to="/account">Account</NavLink>
        </nav>
        <div className="nav-spacer" />
        <form className="nav-search" onSubmit={onSearch}>
          <input
            className="input"
            style={{ width: 160 }}
            placeholder="Search titles"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search titles"
          />
        </form>
        {user ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="hint">{user.displayName || user.email}</span>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/signin" className="btn btn-sm">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
