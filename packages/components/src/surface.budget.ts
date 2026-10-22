/**
 * The recorded surface of `@gpuixui/components`, held as a budget.
 *
 * The module count is exact: the entry's graph is the package's import cost, and
 * a new family, a moved module or a deleted one must be a deliberate change to
 * this record rather than an accident of a commit. The byte ceiling carries a
 * little headroom over the measured size (722 KiB on 2026-10-22) so prose
 * edits do not need a bump while a bulk addition does.
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
  // plan 600 Phase 0). 91 → 93 when TypingText landed (`typing-text.tsx` and the
  // timing rule beside it), 93 → 95 when CountingNumber did
  // (`counting-number.tsx` and its formatting rule), 95 → 96 for AutoHeight
  // (`auto-height.tsx`, plan 600's measured reveal), 96 → 98 for RotatingText
  // (`rotating-text.tsx` and its index rule), 98 → 100 for SplittingText
  // (`splitting-text.tsx` and the split rule beside it), 100 → 102 for
  // HighlightText (`highlight-text.tsx` and the mark rule beside it), 102 → 104
  // for RollingText (`rolling-text.tsx` and the roll rule beside it), 104 → 106
  // for Reveal (`reveal.tsx` and the direction rule beside it). 106 → 110 for
  // the scroll readings (`scroll-fade.tsx`, `scroll-progress.tsx`, the shared
  // scroll/metrics.ts rule and internal/scroll-surface.tsx, plan 600).
  // 110 → 112 for RippleButton (`ripple-button.tsx` and its geometry rule).
  // 112 → 115 for ShineButton (`shine-button.tsx` and its sheen rule) and the
  // shared `internal/measure.ts` both button layers read their box from.
  // 115 → 117 for Magnetic (`magnetic.tsx` and the lean rule beside it), and
  // 117 → 119 for LiquidButton (`liquid-button.tsx` and its flood rule).
  // 119 → 121 for AvatarGroup (`avatar-group.tsx` and its facepile rule).
  // 121 → 123 for PinnedList (`pinned-list.tsx` and its header-position rule);
  // 123 → 125 for Particles (`particles.tsx` and its field rule); 125 → 128 for
  // Stars (`stars.tsx` and its twinkle rule) and the fields' shared scatter
  // arithmetic (`internal/scatter.ts`). 128 → 130 for CodeBlock
  // (`code-block.tsx` and its header/row rule); 130 → 132 for ThemeToggler
  // (`theme-toggler.tsx` and its press/glyph/label rule) and 132 → 134 for
  // CopyButton (`copy-button.tsx` and its label/window rule), the action
  // CodeBlock's header now composes instead of holding its own acknowledgement.
  // 134 → 136 for PageTransition (`page-transition.tsx` and the view-swap state
  // machine beside it), the region that swaps two views with the house exit and
  // entrance.
  modules: 136,
  /** Bytes those modules cost to read and parse; a ceiling, not the measurement. */
  // 722 KiB measured on 2026-10-22 with RippleButton and ShineButton; 732 KiB
  // with Magnetic, 743 KiB with LiquidButton, 759 KiB with AvatarGroup, 788 KiB
  // with Particles and 803 KiB with Stars; 820 KiB with CodeBlock (840 055
  // bytes), 827 KiB with ThemeToggler, 835 KiB with CopyButton and 848 KiB with
  // PageTransition. The ceiling keeps the headroom a prose edit needs while a
  // bulk addition still has to state itself; it moved 850 → 860 KiB with
  // PageTransition because 848 KiB left the next family only two.
  bytes: 860 * 1024,
  /** Packages the entry's own modules import. */
  packages: ["@gpuix/react", "effect", "react"],
} as const;
