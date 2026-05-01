"use client";

import { useEffect, useState } from "react";

export function useScrollParallax(screenRef) {
  const [values, setValues] = useState({
    breadcrumbOpacity: 1,
    titleOpacity: 1,
    compactTitleOpacity: 0,
    topMaskOpacity: 0,
  });

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return undefined;
    let rafId = null;

    const update = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const progress = Math.min(
          el.scrollTop / Math.max(window.innerHeight * 0.32, 1),
          1,
        );
        const titleProgress = Math.min(
          el.scrollTop / Math.max(window.innerHeight * 0.14, 1),
          1,
        );
        const compactProgress = Math.max(
          0,
          Math.min((titleProgress - 0.08) / 0.34, 1),
        );
        setValues({
          breadcrumbOpacity:
            Math.round(Math.max(1 - compactProgress, 0) * 1000) / 1000,
          titleOpacity:
            Math.round(Math.max(1 - titleProgress, 0) * 1000) / 1000,
          compactTitleOpacity: Math.round(compactProgress * 1000) / 1000,
          topMaskOpacity: Math.round(Math.min(0.22 + progress * 0.78, 1) * 1000) / 1000,
        });
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [screenRef]);

  return values;
}
