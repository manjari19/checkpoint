/** True when the user asked their system for less motion. Animations check this before running. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Ease-out cubic: fast start, gentle stop. */
export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Calls step(progress) on every animation frame for `duration` ms, progress eased from 0 to 1.
 * Runs the last step straight away when motion is reduced or the browser has no animation frames
 * (as in unit tests). Returns a function that stops it.
 */
export function animateValue(duration: number, step: (progress: number) => void): () => void {
  if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
    step(1);
    return () => undefined;
  }
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    step(easeOut(t));
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
