const KEY = 'theme';

/**
 * The stored choice wins. With none, the device's own preference is the answer, so
 * a phone in dark mode opens dark the first time and never has to be told.
 */
export function preferredTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* private mode: the session is still usable, it just will not remember */
  }
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * The theme is nothing but a data attribute on <html>: index.html sets it before
 * first paint and every colour in the sheet reads it from there, so no component
 * needs to know which theme is showing.
 */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#000000' : '#ffffff';
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* as above */
  }
}
