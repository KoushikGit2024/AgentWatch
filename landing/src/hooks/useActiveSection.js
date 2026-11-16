import { useEffect, useState } from 'react';

/** Returns the id of the section currently crossing the upper-middle of the viewport. */
export default function useActiveSection(ids) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const els = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!els.length || !('IntersectionObserver' in window)) return undefined;

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-35% 0px -60% 0px' }
    );
    els.forEach(el => io.observe(el));

    // Clear the highlight once the visitor is back above the first section.
    const onScroll = () => {
      if (window.scrollY < els[0].offsetTop - window.innerHeight * 0.6) setActive(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids]);

  return active;
}
