/** The welcome window's rule: Continue advances one step and stops at the last. */

export const stepAfter = (step: number, count: number): number =>
  Math.min(step + 1, count - 1);
