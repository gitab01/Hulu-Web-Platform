import { brand } from '../brand';

/** The wordmark. `size` picks the type scale used by the top bar, the footer and the static pages. */
export default function Brand({ size = 'nav' }) {
  return (
    <span className={`brand brand--${size}`}>
      {brand.name}
      <sup>{brand.suffix}</sup>
    </span>
  );
}
