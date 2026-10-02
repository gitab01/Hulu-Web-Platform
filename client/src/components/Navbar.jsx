import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, entitled, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  async function signOut() {
    setOpen(false);
    await logout();
    navigate('/');
  }

  const search = (
    <form className="nav-search" onSubmit={onSearch} role="search">
      <input
        className="input"
        placeholder="Search titles"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search titles"
      />
    </form>
  );

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          Streamline<sup>TV</sup>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/live">Live TV</NavLink>
          <NavLink to="/account">Account</NavLink>
          {!entitled && <NavLink to="/subscribe">Plans</NavLink>}
        </nav>

        <div className="nav-spacer" />
        {search}

        <div className="nav-actions">
          {user ? (
            <>
              <span className="name">{user.displayName || user.email}</span>
              <span className={`plan-tag${entitled ? ' plan-tag--live' : ''}`}>
                {entitled ? user.plan || 'Member' : 'No plan'}
              </span>
              <button className="btn btn-ghost btn-sm nav-signout" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/signin" className="btn btn-sm">
              Sign in
            </Link>
          )}
          <button className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      <div className="nav-sheet" hidden={!open}>
        {search}
        <NavLink to="/" end onClick={() => setOpen(false)}>
          Home
        </NavLink>
        <NavLink to="/live" onClick={() => setOpen(false)}>
          Live TV
        </NavLink>
        <NavLink to="/account" onClick={() => setOpen(false)}>
          Account
        </NavLink>
        {!entitled && (
          <NavLink to="/subscribe" onClick={() => setOpen(false)}>
            Plans
          </NavLink>
        )}
        {user ? (
          <button onClick={signOut}>Sign out</button>
        ) : (
          <NavLink to="/signup" onClick={() => setOpen(false)}>
            Create an account
          </NavLink>
        )}
      </div>
    </header>
  );
}
