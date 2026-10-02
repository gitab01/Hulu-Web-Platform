import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Menu, Search, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Brand from './Brand';

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
      <Search className="nav-search-icon" aria-hidden="true" />
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
        <Link to="/" className="brand-link" onClick={() => setOpen(false)}>
          <Brand />
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/live">Live TV</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/account">Account</NavLink>
          {!entitled && <NavLink to="/subscribe">Plans</NavLink>}
        </nav>

        <div className="nav-spacer" />
        {search}

        <div className="nav-actions">
          {user ? (
            <>
              <span className="name">
                <User className="name-icon" aria-hidden="true" />
                <span className="name-text">{user.displayName || user.email}</span>
              </span>
              <span className={`plan-tag${entitled ? ' plan-tag--live' : ''}`}>
                {entitled ? user.plan || 'Member' : 'No plan'}
              </span>
              <button className="btn btn-ghost btn-sm nav-signout" onClick={signOut}>
                <LogOut aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <Link to="/signin" className="btn btn-sm">
              Sign in
            </Link>
          )}
          <button
            className="menu-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="nav-sheet" hidden={!open}>
        {search}
        <NavLink to="/" end onClick={() => setOpen(false)}>
          Home
          <ChevronRight aria-hidden="true" />
        </NavLink>
        <NavLink to="/live" onClick={() => setOpen(false)}>
          Live TV
          <ChevronRight aria-hidden="true" />
        </NavLink>
        <NavLink to="/about" onClick={() => setOpen(false)}>
          About
          <ChevronRight aria-hidden="true" />
        </NavLink>
        <NavLink to="/contact" onClick={() => setOpen(false)}>
          Contact
          <ChevronRight aria-hidden="true" />
        </NavLink>
        <NavLink to="/account" onClick={() => setOpen(false)}>
          Account
          <ChevronRight aria-hidden="true" />
        </NavLink>
        {!entitled && (
          <NavLink to="/subscribe" onClick={() => setOpen(false)}>
            Plans
            <ChevronRight aria-hidden="true" />
          </NavLink>
        )}
        {user ? (
          <button onClick={signOut}>
            Sign out
            <ChevronRight aria-hidden="true" />
          </button>
        ) : (
          <NavLink to="/signup" onClick={() => setOpen(false)}>
            Create an account
            <ChevronRight aria-hidden="true" />
          </NavLink>
        )}
      </div>
    </header>
  );
}
