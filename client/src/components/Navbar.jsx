import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Menu, Moon, Search, Sun, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applyTheme, preferredTheme } from '../theme';
import Brand from './Brand';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/live', label: 'Live TV' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { user, entitled, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  // index.html has already decided before the first paint, so the bar starts on it.
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || preferredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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

  // One letter beats an icon in a bar this quiet, and it is the member's own initial.
  const initial = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase();

  const account = user ? (
    <Link to="/account" className="nav-account" onClick={() => setOpen(false)}>
      <span className="nav-avatar" aria-hidden="true">
        {initial}
      </span>
      <span className="nav-account-copy">
        <span className="nav-account-name">{user.displayName || user.email}</span>
        <span className={`plan-tag${entitled ? ' plan-tag--live' : ''}`}>{entitled ? user.plan || 'Member' : 'No plan'}</span>
      </span>
    </Link>
  ) : (
    <Link to="/signin" className="btn btn-sm nav-signin" onClick={() => setOpen(false)}>
      <User aria-hidden="true" />
      Sign in
    </Link>
  );

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand-link" onClick={() => setOpen(false)}>
          <Brand />
        </Link>

        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
          {!entitled && <NavLink to="/subscribe">Plans</NavLink>}
        </nav>

        <div className="nav-spacer" />
        {search}

        <div className="nav-actions">
          {account}
          {user && (
            <button className="icon-btn nav-signout" onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut aria-hidden="true" />
            </button>
          )}
          <button
            className="icon-btn theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            title={theme === 'dark' ? 'Light' : 'Dark'}
          >
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
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
        <div className="nav-sheet-user">
          {user ? (
            <>
              <span className="nav-avatar" aria-hidden="true">
                {initial}
              </span>
              <span>
                <b>{user.displayName || user.email}</b>
                <span className="slate">{entitled ? `${user.plan || 'Member'} plan` : 'No active plan'}</span>
              </span>
            </>
          ) : (
            <span className="slate">Watching as a guest — sign in to keep your place</span>
          )}
        </div>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
            {l.label}
            <ChevronRight aria-hidden="true" />
          </NavLink>
        ))}
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
          <>
            <NavLink to="/signin" onClick={() => setOpen(false)}>
              Sign in
              <ChevronRight aria-hidden="true" />
            </NavLink>
            <NavLink to="/signup" onClick={() => setOpen(false)}>
              Create an account
              <ChevronRight aria-hidden="true" />
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
