/**
 * The recorded surface of `@gpuixui/components`, held as a budget.
 *
 * The module count is exact: the entry's graph is the package's import cost, and
 * a new family, a moved module or a deleted one must be a deliberate change to
 * this record rather than an accident of a commit. The byte ceiling carries a
 * little headroom over the measured size (999 KiB on 2026-10-22) so prose
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
 * `@gpuixui/motion` joins the graph through its own entries, and which one a
 * module takes is a cost decision. `./timing` is the level table and the
 * reduced-motion policy, `./presence` the frames and the window conversion, and
 * `./react/presence` the preference provider and the two presence hooks. The
 * components seam composes the last one rather than `./react`, whose physics
 * hooks reach the spring, inertia and timeline samplers a fade never samples: a
 * family that imports only the seam measured **13 modules / 101 KiB** through
 * `./react` and **4 modules / 29 KiB** through `./react/presence`. The entry's
 * own graph still carries the physics — `CountingNumber` counts with
 * `./react`'s `useTransition` — while the primitives read the light entry too
 * (their `Spinner` prefers `./react/presence`), so `familyMotion` below is the
 * budget that holds the seam's route.
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
  // 119 → 121 for AvatarGroup (`avatar-group.tsx` and its facepile rule).  // 121 → 123 for PinnedList (`pinned-list.tsx` and its header-position rule);
  // 123 → 125 for Particles (`particles.tsx` and its field rule); 125 → 128 for
  // Stars (`stars.tsx` and its twinkle rule) and the fields' shared scatter
  // arithmetic (`internal/scatter.ts`). 128 → 130 for CodeBlock
  // (`code-block.tsx` and its header/row rule); 130 → 132 for ThemeToggler
  // (`theme-toggler.tsx` and its press/glyph/label rule) and 132 → 134 for
  // CopyButton (`copy-button.tsx` and its label/window rule), the action
  // CodeBlock's header now composes instead of holding its own acknowledgement.
  // 134 → 136 for PageTransition (`page-transition.tsx` and the view-swap state
  // 160 → 159 when the painted hint's local copy was deleted and the eight
  // hinted hosts started importing `@gpuixui/primitives/hint` (`TODO.md` →
  // Interlocks): the rule has one implementation now. The graph does not get
  // cheaper — the primitives' seam joins it at 5 modules / 49 KiB beside
  // `@gpuixui/primitives`, which is the subpath's cost rather than the barrel's
  // (that route measured 52 modules / 416 KiB) — but the duplicate rule is gone.
  // machine beside it), the region that swaps two views with the house exit and
  // entrance. 136 → 138 for Bubbles (`bubbles.tsx` and its rise rule); 138 → 140
  // for Fireworks (`fireworks.tsx` and its burst rule); 140 → 142 for Gradient
  // (`gradient.tsx` and its two-stop ramp rule); 142 → 144 for GravityStars
  // (`gravity-stars.tsx` and its fall rule); 144 → 145 for the painted field
  // hint (`internal/hint.tsx`), because a GPUix host's own placeholder is a
  // fixed grey no theme reaches and every text field paints its hint instead.
  // 145 → 147 for SlidingNumber (`sliding-number.tsx` and the decimal-place rule
  // beside it), the odometer whose columns a value can grow. 147 → 153 for the
  // generated line-art fields (`hexagon.tsx`/`hexagon/logic.ts`,
  // `topography.tsx`/`topography/logic.ts`, and the two modules they share:
  // `internal/pattern-field.tsx` and `internal/svg-pattern.ts`), whose view boxes
  // are generated from their measured boxes. 153 → 155 for ImageZoom
  // (`image-zoom.tsx` and the frame/pan rule beside it). 155 → 157 for MotionGrid
  // (`motion-grid.tsx` and the slot/frame rule beside it), the grid whose cells
  // retarget their insets on a reorder. 157 → 160 for SlidingText
  // (`sliding-text.tsx`, the slide rule beside it, and `internal/text-swap.ts`,
  // the half RollingText now reads its state machine and timing from too).
  // 159 → 161 for GradientText (`gradient-text.tsx` and the ramp rule beside it).
  // 161 → 163 for Glyph (`glyph.tsx` and the wall rule beside it): the one
  // background pattern the runtime paints as text rather than as one mask, so
  // its cells are hosts rather than a path. 163 → 164 for CodeBlock's tokenizer
  // (`code-block/tokenize.ts`) and 164 → 165 for Form's validator seam
  // (`form/validator.ts`, the Effect/Schema ↔ `@tanstack/form-core` adapter), so
  // each adoption adds exactly the module it names. 165 → 166 for
  // `internal/surface-box.tsx`, the origin probe `Magnetic` and `ImageZoom` read
  // a pointer against: `onLayout` reports a size change, not a move, so the box
  // a surface last reported is stale after a pane opens or a scroll.
  // 166 → 167 for HighlightText's wash seam (`highlight-text/wash.ts`): the
  // theme's measured find pair, its corner and the active-mark rule live beside
  // the ranges, so the component paints a find wash instead of `selection`.
  // 167 → 168 for the stepper's status rule (`stepper/logic.ts`): the current
  // step a caller cannot name (`NaN`/infinity) resolves to the first step in one
  // place, so the paint and the announcement cannot disagree.
  // 168 → 170 for MultiStepForm (`multi-step-form.tsx` and `wizard/logic.ts`):
  // the wizard's step arithmetic and gate live in a rule beside the shell, the
  // same split Stepper took.
  // 170 → 171 for `internal/text.ts`: the chat composer's stored draft is read
  // once at the boundary (`textOf`), the rule the editor's `draftOf` already
  // holds, so a record's `null` cannot throw out of the render.
  // 171 → 173 for the toast rebuild's two pure rules: `toast/stack.ts` (the
  // three-card peek geometry the runtime's missing `transform` forced into
  // flow + height) and `toast/swipe.ts` (the one-axis dismissal threshold and
  // flick speed). Both are renderer-free, which is what lets their suites hold
  // the stack and the gesture without a window.
  // 173 → 177 for the five pointer-and-tween surfaces that moved their state
  // into Effect (`magnetic/store.ts`, `liquid-button/store.ts`,
  // `shine-button/store.ts`, `stars/store.ts`, `gravity-stars/store.ts`) and the
  // seam they share (`internal/local-state.ts`): a `SubscriptionRef` is the
  // state, the store owns the one timer a surface can run, and React subscribes
  // through `useSyncExternalStore` instead of holding it in `useState`.
  // 177 → 181 for the four that followed on the same seam: `rolling-text/store.ts`
  // (the swap and its exit window), `image-zoom/store.ts` (the pointer),
  // `pattern-field/store.ts` (the measured box and the breath's phase, shared by
  // Hexagon and Glyph) and `splitting-text/store.ts` (the phrase and its units).
  modules: 181,
  /** Bytes those modules cost to read and parse; a ceiling, not the measurement. */
  // 722 KiB measured on 2026-10-22 with RippleButton and ShineButton; 732 KiB
  // with Magnetic, 743 KiB with LiquidButton, 759 KiB with AvatarGroup, 788 KiB
  // with Particles and 803 KiB with Stars; 820 KiB with CodeBlock (840 055
  // bytes), 827 KiB with ThemeToggler, 835 KiB with CopyButton, 848 KiB with
  // PageTransition, 863 KiB with Bubbles, 881 KiB with Fireworks, 893 KiB with
  // Gradient and 910 KiB with GravityStars (932 327 bytes). The ceiling keeps the
  // headroom a prose edit needs while a bulk addition still has to state itself;
  // it moved 850 → 860 KiB with PageTransition (848 KiB left the next family only
  // two), 860 → 875 KiB with Bubbles, 875 → 890 KiB with Fireworks, 890 → 900 KiB
  // with Gradient and 900 → 940 KiB with GravityStars. 940 → 990 KiB with the
  // generated Hexagon and Topography fields (962 KiB measured, the shared
  // pattern frame included); 976 KiB measured with ImageZoom, under the ceiling.
  // 988 KiB measured with MotionGrid: the ceiling moved 990 → 1030 KiB then,
  // because the next family would otherwise have had two kilobytes to fit in.
  // 173 → 171 for removing Topography (`topography.tsx` and its logic), which
  // the library no longer ships.
  // 1 029 KiB measured with Glyph (the wall's logic and its text hosts, the
  // marked figures above), so the ceiling moved 1030 → 1070 KiB for the next
  // family's headroom. 1 072 KiB measured with the leaving surface guard on
  // every overlay and wrapper (the seam's `PresenceShield` adopted by the eight
  // surfaces and the two wrappers); the ceiling moved 1070 → 1090 KiB.
  // 1 091 KiB measured with the scroll seam composing the primitives'
  // `ScrollArea` (the reading, fade and pinned list now carry its prop surface
  // instead of a private viewport), so the ceiling moved 1090 → 1120 KiB for the
  // next family's headroom.
  // 1 122 KiB measured at `HEAD` before the chat boundary read — the earlier
  // seam growth had passed the 1120 KiB ceiling with nothing to record it — and
  // 1 125 KiB with `internal/text.ts`, so the ceiling moved 1120 → 1140 KiB for
  // the next family's headroom. 1 141 KiB measured 2026-10-24 with the badge's
  // stored-name guard (`badge.tsx` reads `variant`/`size` through their own
  // `Schema.is` guards, the seam `internal/button.tsx`'s `lookOf` already takes),
  // which is the family the 1140 ceiling no longer held: 1140 → 1160 KiB.
  // 1 161 KiB measured with the wizard's stored step list (`wizard/logic.ts`'s
  // `stepsOf` reads a saved definition's list and drops an entry that names no
  // step), so the ceiling moved 1160 → 1170 KiB for the next family's headroom.
  // 1 171 KiB measured 2026-10-24 with the saved-state boundary reads in the
  // combobox, accordion, tag input and command palette (`combobox/logic.ts`,
  // `accordion/logic.ts`, `tag-input/logic.ts`, `menu/fuzzy.ts`) beside the
  // motion seam's own rework in the same tree, so 1170 → 1180 KiB keeps the
  // next family the headroom a prose edit needs. 1 182 KiB measured 2026-10-24
  // with the pinned list's stored-section read and the avatar group's
  // stored-member read (`pinned-list/logic.ts`'s `sectionsOf`,
  // `avatar-group/logic.ts`'s `membersOf`), the two boundary readers the saved
  // layouts this wave restored were missing: 1180 → 1190 KiB.
  // 1 207 KiB measured 2026-10-25 with the toast rebuild: the stack's clipped
  // surface + measured body, the shared hold, the promise phase and the swipe
  // gesture (two pure rules, `toast/stack.ts` and `toast/swipe.ts`). The
  // ceiling moved 1190 → 1230 KiB for the next family's headroom.
<<<<<<< HEAD
  // 1 231 KiB measured 2026-10-27 with the five Effect stores and the seam they
  // share (`internal/local-state.ts`): a `SubscriptionRef` of the surface's
  // state, a synchronous signal for `useSyncExternalStore` and the one timer a
  // drain or a sweep holds, which is 24 KiB over the five `useState`/`useEffect`
  // seams they replace. The ceiling moved 1230 → 1260 KiB so the next family
  // keeps the same headroom.
  bytes: 1260 * 1024,
=======
  // 1 222 KiB measured 2026-10-27 with the Effect state seam and the four
  // stores it holds (`internal/effect-store.ts`, the rolling, zoom, field and
  // splitting stores): 5 modules, and the ceiling keeps its 1230 KiB.
  bytes: 1230 * 1024,
>>>>>>> fcdad776f (refactor(components): hold four effect components' state in Effect)
  /**
   * The motion share of a **family** consumer's graph, in modules and bytes.
   *
   * A consumer imports `@gpuixui/components/<family>`, not the barrel, so a
   * family is where a shared seam's cost is paid. `src/motion-grid.tsx` walks
   * the entrance half with the physics-free entry: the presence frames, the
   * per-phase timing, the mount window and the provider, and nothing else. The
   * `./react` route measured 13 modules / 101 KiB before the split.
   */
  /**
   * The seam's own motion graph: the presence half's modules and bytes.
   *
   * 32 KiB → 34 KiB when the easing grammar moved into `@gpuixui/motion`'s
   * `timing.ts` (`motionEasingNames`, `isMotionEasing`) — the module the
   * presence half already loads — so a stored transition is read against the
   * renderer's grammar before it is handed over. 34 KiB → 35 KiB when
   * `presenceTabStop` joined `internal/presence.tsx`: the one rule a surface's
   * own control reads to leave the Tab order while its ghost paints, beside the
   * shield that takes the press. 35 KiB → 37 KiB when a **frame** is read
   * through that same grammar (`readOpacity`/`readSize`/`readInset`): the
   * renderer rejects a whole description for one field outside its range, so a
   * stored frame field the runtime refuses is dropped where it used to take the
   * readable fields beside it. 37 KiB → 38 KiB when `delayedTiming` reads a
   * wait through the same range (`waitSeconds`): a stored pace that converts
   * past the renderer's `Duration` range rejects the whole description, so the
   * staggering arrival would paint no frame at all. 38 KiB → 39 KiB when the
   * clock's bound moved to `duration.ts` (`schedulableSeconds`), which the
   * timing entry point reads as well as the presence table: a duration past the
   * renderer's range is no journey at either door, not a description refused
   * whole. 39 512 → 40 243 bytes when a **hold window** past the scheduler's
   * range reads as no window (`SCHEDULABLE_WINDOW_MS`): the number the seam
   * publishes is the delay the timer actually holds, so a box unmounts in the
   * close commit rather than ghosting for a wait no timer can take. Measured
   * 40 243 bytes with `nub scripts/surface.ts --entry src/motion-grid.tsx`
   * (5 modules, 40 KiB) after the motion package's `d31ad7500`; the module count
   * did not move, so only the ceiling follows. 41 984 → 42 179 bytes measured
   * 2026-10-24 on the tree that lands the motion package's shared preference
   * read, still 5 modules, so 42 KiB keeps a family's headroom. 42 179 → 43 707
   * bytes measured 2026-10-26 with `nub scripts/surface.ts --entry
   * src/motion-grid.tsx` (5 modules): the timing seam takes an `ease` a surface
   * can name, which is the stack's re-slot curve — one entry point for a
   * duration's curve, so the presence route is unchanged and still 5 modules.
   */
  familyMotion: { modules: 5, bytes: 43 * 1024 },
  /** Packages the entry's own modules import. */
  // `@tanstack/form-core` joined with Form's validator seam and
  // `@tanstack/highlight` with CodeBlock's tokenizer.
  packages: [
    "@gpuix/react",
    "@tanstack/form-core",
    "@tanstack/highlight",
    "effect",
    "react",
  ],
} as const;
