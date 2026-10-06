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
 * inconsistent, though — a broadcast in progress can read as not live — so a true is
 * taken as confirmation and a false as no information at all.
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
    let reported;
    const timers = [];

    // The same live broadcast read isLive:true in one session and isLive:false for
    // ten seconds in another, so only a true is worth saying and a false proves nothing.
    const read = (source) => {
      if (!alive || reported === 'live' || reported === 'blocked') return;
      let data = {};
      try {
        data = (source.getVideoData && source.getVideoData()) || {};
      } catch {
        return;
      }
      const videoTitle = data.title || undefined;
      if (data.isLive) {
        reported = 'live';
        reportRef.current({ kind: 'live', videoTitle });
      } else if (!reported) {
        reported = 'vod';
        reportRef.current({ kind: 'vod', videoTitle });
      }
    };

    // The API takes the frame over and rewrites its address, which drops the autoplay
    // the server put there, so a cued stream can sit there looking like a dead one. The
    // click that opened this frame is the activation a browser asks for; ask once more.
    const nudge = (source) => {
      try {
        const state = source.getPlayerState();
        if (state === 5 || state === -1) source.playVideo();
      } catch {
        // The frame is not answering; its own play control still works for the viewer.
      }
    };

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
              read(e.target);
              [800, 2600].forEach((ms) => {
                timers.push(setTimeout(() => nudge(e.target), ms));
              });
              // A later message from the player can carry the flag the first one did not.
              [1500, 4000, 9000, 16000, 26000].forEach((ms) => {
                timers.push(setTimeout(() => read(e.target), ms));
              });
            },
            onStateChange: (e) => read(e.target),
            onError: (e) => {
              if (!alive) return;
              // 100: nothing there to play. 150/101: the broadcaster turned
              // embedding off. Either way the frame cannot be trusted.
              reported = 'blocked';
              reportRef.current({ kind: 'blocked', code: e.data });
            },
          },
        });
      })
      .catch(() => alive && reportRef.current({ kind: 'unknown' }));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
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
