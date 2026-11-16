import { useEffect } from 'react';

/** Adds `.is-in` to [data-reveal] elements the first time they scroll into view. */
export default function useReveal() {
  useEffect(() => {
    // Required: CSS selector is `html.js-reveal [data-reveal]`
    document.documentElement.classList.add('js-reveal');

    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
            // Once revealed, remove data-reveal after animation finishes
            // so dynamic React re-renders can never inadvertently hide it.
            setTimeout(() => {
              e.target.removeAttribute('data-reveal');
            }, 650);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}
