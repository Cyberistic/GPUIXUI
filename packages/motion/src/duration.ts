const SCHEDULABLE_SECONDS = Number.MAX_SAFE_INTEGER;

export const schedulableSeconds = (
  value: number | null | undefined,
): number | undefined =>
  value !== null &&
  value !== undefined &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= SCHEDULABLE_SECONDS
    ? value
    : undefined;
