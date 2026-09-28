'use client';

// ============================================================
// FILE: src/components/marketing/useLandingEffects.js
//
// The effect every marketing page shares: scroll reveal (.reveal
// elements fade up as they enter the viewport). The system cursor is
// used as-is.
// ============================================================

import { useEffect } from 'react';

export default function useLandingEffects() {
  useEffect(() => {
    const revObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 },
    );
    document.querySelectorAll('.reveal').forEach((r) => revObs.observe(r));
    return () => revObs.disconnect();
  }, []);
}
