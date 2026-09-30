import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { catalog, player } from '../api/client';
import { useAuth } from '../context/AuthContext';

const FLUSH_INTERVAL_MS = 10000;

export default function Player() {
  const { titleId, episodeId } = useParams();
  const { refreshEntitlement } = useAuth();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const pendingRef = useRef(0); // furthest position seen since last flush
  const titleRef = useRef(titleId);
  const epRef = useRef(episodeId);
  titleRef.current = titleId;
  epRef.current = episodeId;

  const [detail, setDetail] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [error, setError] = useState(null);
  const [nextIn, setNextIn] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Flatten episodes with their parent title id so "next" can cross seasons.
  const flatEps = detail
    ? detail.seasons.flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.season })))
    : [];
  const idx = flatEps.findIndex((e) => e._id === episodeId);
  const nextEp = idx >= 0 ? flatEps[idx + 1] : null;

  // 1. Load title metadata (episode list, resume position) by id.
  useEffect(() => {
    let alive = true;
    catalog
      .byId(titleId)
      .then((d) => alive && setDetail(d.title))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [titleId]);

  // 2. Request a short-lived signed playback URL (entitlement is re-checked server-side).
  const requestPlayback = useCallback(async () => {
    const res = await player.playback(titleId, episodeId);
    setPlayback(res);
    return res;
  }, [titleId, episodeId]);

  // Mint the playback URL on mount and whenever the episode changes.
  useEffect(() => {
    let alive = true;
    retries.current = 0;
    setPlayback(null);
    player
      .playback(titleId, episodeId)
      .then((res) => alive && setPlayback(res))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [titleId, episodeId]);

  // 3. Buffer progress locally and flush on the interval + pause/seek/visibility/beforeunload.
  const flush = useCallback(async () => {
    const pos = pendingRef.current;
    if (!pos) return;
    pendingRef.current = 0;
    try {
      const dur = videoRef.current?.duration || 0;
      const completed = dur > 0 && pos >= dur - 5;
      await player.progress({ titleId: titleRef.current, episodeId: epRef.current, positionSec: Math.floor(pos), durationSec: Math.floor(dur), completed });
    } catch {
      // Silent — a lost flush is recovered from the next buffered tick; the server keeps furthest.
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      pendingRef.current = Math.max(pendingRef.current, v.currentTime);
      const remaining = v.duration - v.currentTime;
      if (nextEp && v.duration && remaining <= 12 && remaining > 0) setNextIn(Math.ceil(remaining));
    };
    const onPause = () => flush();
    const onSeeked = () => flush();

    const timer = setInterval(flush, FLUSH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const onBeforeUnload = () => flush();

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('pause', onPause);
    v.addEventListener('seeked', onSeeked);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(timer);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('seeked', onSeeked);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flush();
    };
  }, [flush, nextEp]);

  // 4. Resume from the furthest saved position once metadata is ready.
  const handleLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    const saved = detail?.progressByEpisode?.[episodeId]?.positionSec;
    if (saved && saved > 5 && saved < v.duration - 5) v.currentTime = saved;
    v.play().catch(() => {});
  };

  // 5. Player falls back: on repeated media errors, re-mint a fresh signed URL once
  //    before surfacing a message (a lapsed subscription re-checks at the NEXT title,
  //    so mid-stream we only refresh the URL, never hard-stop an entitled viewer).
  const retries = useRef(0);
  const handleError = async () => {
    if (retries.current < 1) {
      retries.current += 1;
      try {
        const res = await requestPlayback();
        if (videoRef.current) {
          videoRef.current.src = res.playbackUrl;
          videoRef.current.load();
        }
        return;
      } catch {
        /* fall through */
      }
    }
    setError('Playback is unavailable right now.');
  };

  const gotoNext = () => {
    if (!nextEp) return;
    navigate(`/watch/${titleId}/${nextEp._id}`);
  };

  // Auto-hide controls.
  let hideTimer;
  const bumpControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => setControlsVisible(false), 3000);
  };

  if (error && !playback)
    return (
      <div className="player-wrap">
        <div className="player-note">
          <h2 style={{ color: '#fff', fontSize: 24 }}>This episode will not open</h2>
          <p>{error}</p>
          <Link to={`/title/${detail?.slug || ''}`} className="btn btn-sm">
            Back to the title
          </Link>
        </div>
      </div>
    );
  if (!detail || !playback)
    return (
      <div className="player-wrap">
        <div className="player-note">
          <span className="ep">Opening playback link…</span>
        </div>
      </div>
    );

  return (
    <div className="player-wrap" onMouseMove={bumpControls}>
      <div className="player-bar">
        <div>
          <div className="title">{detail.name}</div>
          <div className="ep">
            S{flatEps[idx]?.season} · E{flatEps[idx]?.number} — {flatEps[idx]?.title}
          </div>
        </div>
        <Link to={`/title/${detail.slug}`} className="btn btn-sm">
          Title details
        </Link>
      </div>

      <div className="player-stage">
        <video
          ref={videoRef}
          className="player-video"
          src={playback.playbackUrl}
          controls={controlsVisible}
          onLoadedMetadata={handleLoaded}
          onError={handleError}
          playsInline
        />
        {nextIn !== null && nextEp && (
          <button className="player-next" onClick={gotoNext}>
            <small>Up next in {nextIn}s</small>
            {nextEp.title}
          </button>
        )}
      </div>

      <div className="player-note">
        {error && <p className="error">{error}</p>}
        <p>
          Progress saves every 10 seconds and whenever you pause, seek or leave the page. Playback stays available while this
          signed link is valid; your plan is checked again when you open the next title.
        </p>
        <button className="btn btn-sm" onClick={() => refreshEntitlement()}>
          Re-check my plan
        </button>
      </div>
    </div>
  );
}
