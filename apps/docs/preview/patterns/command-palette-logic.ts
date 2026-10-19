/**
 * The naming rule behind the command palette's duplicate action (plan 522).
 *
 * Kept pure so the composition's visible result can be proved without a GPUix
 * window: the first copy is `atlas copy`, the next is `atlas copy 2`, and a
 * taken name is never reused.
 */
export const uniqueProjectName = (
  base: string,
  taken: ReadonlyArray<string>,
): string => {
  const candidate = (index: number): string =>
    index === 1 ? `${base} copy` : `${base} copy ${index}`;
  const next = (index: number): string =>
    taken.includes(candidate(index)) ? next(index + 1) : candidate(index);
  return next(1);
};
