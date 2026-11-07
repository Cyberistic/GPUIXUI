const measurement = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const DEFAULT_MAX = 100;

export const progressShare = (
  value: unknown,
  max: unknown,
): number | undefined => {
  const share = measurement(value);
  if (share === undefined) return undefined;
  const stated = measurement(max);
  const top = stated !== undefined && stated > 0 ? stated : DEFAULT_MAX;
  return Math.min(100, Math.max(0, (share / top) * 100));
};
