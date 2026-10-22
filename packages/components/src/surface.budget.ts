/**
 * The recorded surface of `@gpuixui/components`, held as a budget.
 *
 * The module count is exact: the entry's graph is the package's import cost, and
 * a new family, a moved module or a deleted one must be a deliberate change to
 * this record rather than an accident of a commit. The byte ceiling carries
 * ~9% over the measured 596,751 bytes so prose edits do not need a bump while a
 * bulk addition does.
 *
 * `packages` is every package the package's **own** modules import. A new name
 * here is a new thing every consumer of the entry loads, so it needs the same
 * deliberate change.
 *
 * Measured 2026-10-22 on `master` with `nub scripts/surface.ts` (and
 * `--import` for the cold load, recorded in the package README). Regenerate with
 * the same command and state what moved in the commit.
 *
 * `@gpuixui/motion` is reached through its `./timing` subpath, not its barrel:
 * the surfaces need the level table and the reduced-motion policy, and the
 * physics modules (spring, timeline, inertia) are not part of an overlay's cost.
 */
export const surfaceBudget = {
  /** Modules in the entry's own package — `src/index.ts` and everything it reaches. */
  // 85 → 88 when Chat and Message landed (plan 207): `chat.tsx`,
  // `chat/logic.ts` and `message.tsx`. 88 → 89 when the list's key origin became
  // a pure rule (`list/origin.ts`), because the row a key came from is a rule
  // worth testing on its own rather than through a renderer. 89 → 91 when the
  // motion seam landed (`internal/presence.tsx` and the public `motion.tsx`,
  // plan 600 Phase 0).
  modules: 91,
  /** Bytes those modules cost to read and parse; a ceiling, not the measurement. */
  bytes: 640 * 1024,
  /** Packages the entry's own modules import. */
  packages: ["@gpuix/react", "effect", "react"],
} as const;
