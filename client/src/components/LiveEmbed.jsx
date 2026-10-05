import { useEffect, useRef, useState } from 'react';

/**
 * The broadcaster's video in a frame that can tell us what it is.
 *
 * YouTube's channel-wide `embed/live_stream?channel=…` address no longer resolves —
 * it answers "This video is unavailable" whether the channel is streaming or not —
 * so a stream can only be opened by video id, and the question "is this live?" has
 * to be asked of the player. The IFrame API answers it from the viewer's own
 * connection, which is the only connection that matters: a server in another country
 * asking on the viewer's behalf gets a bot shell instead of a page.
 *
 * If the API itself never arrives, the plain iframe is already in the document and
 * still plays; the status then stays unknown, which the page renders as silence
 * rather than as a wrong label.
 */
let apiPromise;

function iframeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previous) previous();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => reject(new Error('iframe api unavailable'));
    document.head.appendChild(tag);
  });
  return apiPromise;
}

function withJsApi(src) {
  if (!src || src.indexOf('enablejsapi') > -1) return src;
  const join = src.indexOf('?') > -1 ? '&' : '?';
  return `${src}${join}enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
}

export default function LiveEmbed({ src, title, onStatus }) {
  const hostRef = useRef(null);
  const reportRef = useRef(onStatus);
  reportRef.current = onStatus;
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let alive = true;
    let player;
    setBlocked(false);

    const frame = document.createElement('iframe');
    frame.className = 'live-embed';
    frame.src = withJsApi(src);
    frame.title = title;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    hostRef.current.appendChild(frame);

    iframeApi()
      .then((YT) => {
        if (!alive) return;
        player = new YT.Player(frame, {
          events: {
            onReady: (e) => {
              if (!alive) return;
              const data = (e.target.getVideoData && e.target.getVideoData()) || {};
              reportRef.current({
                kind: data.isLive ? 'live' : 'vod',
                videoTitle: data.title || null,
              });
            },
            onError: (e) => {
              if (!alive) return;
              // 100: nothing there to play. 150/101: the broadcaster turned
              // embedding off. Either way the frame cannot be trusted.
              setBlocked(true);
              reportRef.current({ kind: 'blocked', code: e.data });
            },
          },
        });
      })
      .catch(() => alive && reportRef.current({ kind: 'unknown' }));

    return () => {
      alive = false;
      if (player && player.destroy) player.destroy();
      else frame.remove();
    };
  }, [src, title]);

  if (!src) return null;

  return (
    <div className="live-player">
      <div ref={hostRef} className="live-player-frame" />
      {blocked && (
        <p className="live-player-note" role="status">
          This broadcaster has not allowed its video to play inside other sites. Open it on the channel to watch.
        </p>
      )}
    </div>
  );
}
