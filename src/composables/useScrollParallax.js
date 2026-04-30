import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Reactive scroll-driven parallax values for the airport caption screen.
 *
 * Watches scroll position on a given container element and updates
 * CSS custom property refs used by the mobile header animations.
 */
export function useScrollParallax(screenRef) {
  const mapDim = ref(0);
  const breadcrumbOpacity = ref(1);
  const titleOpacity = ref(1);
  const compactTitleOpacity = ref(0);
  const topMaskOpacity = ref(0);

  let rafId = null;

  const update = () => {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const el = screenRef.value;
      if (!el) return;

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

      mapDim.value = Math.round(progress * 0.78 * 1000) / 1000;
      breadcrumbOpacity.value =
        Math.round(Math.max(1 - compactProgress, 0) * 1000) / 1000;
      titleOpacity.value =
        Math.round(Math.max(1 - titleProgress, 0) * 1000) / 1000;
      compactTitleOpacity.value = Math.round(compactProgress * 1000) / 1000;
      topMaskOpacity.value =
        Math.round(Math.min(0.22 + progress * 0.78, 1) * 1000) / 1000;
    });
  };

  onMounted(() => {
    const el = screenRef.value;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  });

  onBeforeUnmount(() => {
    const el = screenRef.value;
    el?.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    if (rafId != null) cancelAnimationFrame(rafId);
  });

  return {
    mapDim,
    breadcrumbOpacity,
    titleOpacity,
    compactTitleOpacity,
    topMaskOpacity,
  };
}
