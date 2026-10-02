import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import TitlePage from './pages/TitlePage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Subscribe from './pages/Subscribe';
import Account from './pages/Account';
import SearchPage from './pages/SearchPage';
import LiveTV from './pages/LiveTV';
import ChannelPage from './pages/ChannelPage';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

// The player is route-split so its bundle never lands in the browse experience.
const Player = lazy(() => import('./pages/Player'));

/** Client-side routing leaves the scroll offset alone, so each navigation resets to the top. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Requires an authenticated user; preserves the intended destination in state. */
function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoading />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;
  return children;
}

/** Requires an active subscription; otherwise sends the user to checkout. */
function RequireEntitlement() {
  const { user, entitled, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoading />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (!entitled) return <Navigate to="/subscribe" state={{ from: location }} replace />;
  return (
    <Suspense fallback={<PageLoading />}>
      <Player />
    </Suspense>
  );
}

export function PageLoading() {
  return (
    <div className="container" style={{ paddingTop: 'clamp(20px, 4vw, 36px)' }} role="status" aria-live="polite">
      <div className="skel skel-head" style={{ width: 220 }} />
      <div className="skel-row">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="skel-card" key={i}>
            <div className="skel skel-poster" />
            <div className="skel skel-line" style={{ width: '65%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main" style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/title/:slug" element={<TitlePage />} />
          <Route path="/live" element={<LiveTV />} />
          <Route path="/live/:slug" element={<ChannelPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/subscribe" element={<RequireAuth><Subscribe /></RequireAuth>} />
          <Route path="/subscribe/success" element={<RequireAuth><Subscribe /></RequireAuth>} />
          <Route path="/subscribe/cancel" element={<RequireAuth><Subscribe /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/watch/:titleId/:episodeId" element={<RequireEntitlement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
