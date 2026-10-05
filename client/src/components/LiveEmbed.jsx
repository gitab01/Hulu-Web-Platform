import { useEffect, useRef } from 'react';

/**
 * The broadcaster's video in a frame that can tell us what it is.
 *
 * YouTube's channel-wide `embed/live_stream?channel=…` address no longer resolves —
 * it answers "This video is unavailable" whether the channel is streaming or not —
 * so a stream can only be opened by video id, and the question "is this live?" has
 * to be asked of the player. The IFrame API answers it from the viewer's own
 * connection, which is the only connection that matters: a server in another country
 * asking on the viewer's behalf gets a bot shell instead of a page. The answer is
 * only there once the video is running — a broadcast that is on air still reads as
 * not live while the frame is loading — so it is read from the state changes, not
 * from the ready event.
 *
 * If the API itself never arrives, the plain iframe is already in the document and
 * still plays; the status is then unknown, and the page says only that the video is
 * the broadcaster's, without claiming anything about whether it is live.
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

  useEffect(() => {
    let alive = true;
    let player;
    let last;

    const frame = document.createElement('iframe');
    frame.className = 'live-embed';
    frame.src = withJsApi(src);
    frame.title = title;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    hostRef.current.appendChild(frame);

    // ended, playing, paused — the states where the video is in front of the viewer.
    const WATCHING = [0, 1, 2];
    const read = (target) => {
      if (!alive || !target.getPlayerState || WATCHING.indexOf(target.getPlayerState()) < 0) return;
      const data = (target.getVideoData && target.getVideoData()) || {};
      const kind = data.isLive ? 'live' : 'vod';
      if (kind === last) return;
      last = kind;
      reportRef.current({ kind });
    };

    iframeApi()
      .then((YT) => {
        if (!alive) return;
        player = new YT.Player(frame, {
          events: {
            onReady: (e) => read(e.target),
            onStateChange: (e) => read(e.target),
            onError: () => {
              if (!alive) return;
              // 100: nothing there to play. 150/101: the broadcaster turned
              // embedding off. Either way the frame cannot be trusted.
              reportRef.current({ kind: 'blocked' });
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
    </div>
  );
}
