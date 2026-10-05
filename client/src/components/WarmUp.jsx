import { useEffect, useState } from 'react';

// The API sleeps when nobody is calling it, and the first request after that can
// take half a minute. An endless skeleton reads as a broken app, so once the wait
// stops being ordinary the wait itself gets named.
export default function WarmUp({ after = 4500 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), after);
    return () => clearTimeout(t);
  }, [after]);

  if (!show) return null;

  return (
    <p className="warmup" role="status">
      Still waking up — the first request after the service has been idle can take half a minute. Keep this page open.
    </p>
  );
}
