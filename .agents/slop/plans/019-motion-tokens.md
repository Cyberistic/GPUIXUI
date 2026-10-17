# 019 — Motion tokens (durations and easings)

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), extending plan 011
**Depends on:** plan 011 (implemented `@gpuixui/tokens`), plan 016 (source exports)
**Files owned:** `packages/tokens/src/motion.ts` (new),
`packages/tokens/src/motion.test.ts` (new),
`packages/tokens/src/motion.example.ts` (new),
`packages/tokens/src/theme.ts`, `packages/tokens/src/index.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md` (design-system section only), `TODO.md` (this workstream only),
this plan, `.agents/slop/plans/README.md` (index row only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`TODO.md` carries the last tokens-that-are-missing item: *"Add motion tokens
(durations/easings) once a component consumes them."* A component now does — and
the durations are scattered literals in component source, which the design-system
rule forbids ("tokens are the single source … no scattered literals"):

| File | Literal | Use |
| ---- | ------- | --- |
| `primitives/src/components/Spinner.tsx` | `useStep(SPINNER_SEGMENTS, 120)` | step tick |
| `primitives/src/components/Progress.tsx` | `useStep(SPINNER_SEGMENTS, 120)` | step tick |
| `primitives/src/components/Skeleton.tsx` | `useStep(PULSE_STEPS, 700)` | skeleton pulse |

Three call sites in one package, with no token to reach for, is exactly the
"a second consumer appeared" condition AGENTS §1 uses to justify hoisting. The
Tier 2 overlay components being built beside them (`Tooltip`, `Popover`, `Menu`,
`Dialog`, `Accordion`) need the same timings.

### The runtime's motion API (installed 0.10.0, re-verified)

```sh
V=/private/tmp/opencode/gpuix-verify/node_modules/@gpuix/native
sed -n '1,31p' "$V"/dist/host.d.ts
```

```ts
export interface MotionStyle {
  width?; height?; opacity?; top?; right?; bottom?; left?; borderRadius?;
}
export type MotionEase = "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut"
  | [number, number, number, number];
export interface MotionTransition {
  /** Duration in seconds. */
  duration?: number;
  /** Delay in seconds. */
  delay?: number;
  ease?: MotionEase;
}
export interface MotionProps {
  initial?: MotionStyle | false;
  animate: MotionStyle;
  exit?: MotionStyle;          // applied while leaving <AnimatePresence>
  transition?: MotionTransition;
}
// StyleDesc gains: motion?: MotionProps
```

Facts that shape the tokens:

1. **Durations are seconds** in `MotionTransition`, but `setInterval` (the step
   indicators) takes **milliseconds**. Two units, one API. The token stores
   milliseconds — the unit a designer reads and a component's timer wants — and
   a helper converts to the runtime's seconds.
2. **Only seven properties animate** (`width`, `height`, `opacity`, `top`,
   `right`, `bottom`, `left`, `borderRadius`). No transform, no colour.
3. **Easings are the five CSS names or a cubic-bezier tuple.** Tokens name the
   five; a brand that needs a bezier passes the tuple itself, which the runtime
   already accepts (the token type is the runtime's union, so no cast is needed).
4. There is **no `transition` CSS property** and no `animation` keyframes; motion
   exists only through `motion` props.

## 2. Design decisions (do not re-litigate)

1. **Milliseconds in the tokens, seconds through the helper.** `theme.motion.*`
   is a number of milliseconds; `motionTransition(theme, level, phase)` returns
   `{ duration, ease }` with `duration` in seconds.
2. **Named levels follow the surface classes `elevation` already names**, so the
   two scales stay legible against each other.

   | Level | ms | Aligns with | Justified by |
   | ----- | -- | ----------- | ------------ |
   | `none` | 0 | — | a theme that removes motion |
   | `step` | 120 | — | Spinner and Progress step tick (today's literal) |
   | `fast` | 160 | `elevation.sm` (tooltip) | Tooltip |
   | `normal` | 200 | `elevation.md` (menus, popovers) | Menu, Popover |
   | `slow` | 320 | `elevation.lg` (dialogs, panels) | Dialog, Accordion |
   | `pulse` | 700 | — | Skeleton half cycle (today's literal) |

3. **Four easings, named by phase**, all values the runtime already accepts:
   `standard` `"easeInOut"`, `enter` `"easeOut"`, `exit` `"easeIn"`,
   `linear` `"linear"`.
4. **`motion` is a theme group**, like `spacing` and `typography`: shared by
   light, dark and both high-contrast themes, overridable per level through
   `extendTheme({ motion: { … } })`. High contrast is a colour concern; a
   reduced-motion theme is expressed by overriding the levels to `0`, and that is
   documented, not guessed at runtime (GPUix exposes no reduced-motion query).
5. **No `delay` token.** Nothing needs it; the runtime's optional `delay` stays a
   component decision. Adding it now would be scaffolding.
6. **No cubic-bezier token.** The runtime takes the tuple directly; a token would
   only rename a number.

## 3. Exact changes

### 3.1 `packages/tokens/src/motion.ts` (new)

```ts
/** Motion timings in milliseconds. The runtime's transitions take seconds. */
export interface Motion {
  /** 0ms — a theme that removes motion. */
  readonly none: number;
  /** 120ms — one frame of a step indicator (spinner, indeterminate bar). */
  readonly step: number;
  /** 160ms — a small surface: tooltip, badge. */
  readonly fast: number;
  /** 200ms — menus, dropdowns, combobox lists. */
  readonly normal: number;
  /** 320ms — dialogs, panel expansion, accordions. */
  readonly slow: number;
  /** 700ms — a skeleton's half cycle. */
  readonly pulse: number;
}

/** An easing the runtime accepts, named verbatim. */
export type MotionEasing =
  | "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut"
  | readonly [number, number, number, number];

/** Easings by phase. */
export interface MotionEasings {
  /** Symmetric: size and opacity changes at rest. */
  readonly standard: MotionEasing;
  /** Decelerating: a surface arriving. */
  readonly enter: MotionEasing;
  /** Accelerating: a surface leaving. */
  readonly exit: MotionEasing;
  /** Constant: an indeterminate loop. */
  readonly linear: MotionEasing;
}

/** Default motion timings. */
export const motion: Motion = { none: 0, step: 120, fast: 160, normal: 200, slow: 320, pulse: 700 };

/** Default easings. */
export const motionEasings: MotionEasings = {
  standard: "easeInOut", enter: "easeOut", exit: "easeIn", linear: "linear",
};

/** A duration level, or an easing phase. */
export type MotionLevel = keyof Motion;
export type MotionPhase = keyof MotionEasings;

/** A transition for GPUix's `MotionProps.transition`. */
export interface MotionTransition {
  /** Seconds, the unit the runtime takes. */
  readonly duration: number;
  readonly ease: MotionEasing;
}

/**
 * Resolve a motion level and phase to the runtime's transition shape.
 * `null` when the easing is a bezier array, which needs no conversion.
 *
 * @example
 * ```tsx
 * motionTransition(themeFor("dark"), "normal", "enter"); // { duration: 0.2, ease: "easeOut" }
 * ```
 */
export function motionTransition(
  theme: Theme,
  level: MotionLevel,
  phase: MotionPhase = "standard",
): MotionTransition {
  return { duration: theme.motion[level] / 1000, ease: theme.motionEase[phase] };
}
```

**Where do easings live?** `theme.motionEase` (a second group) or inside
`theme.motion.ease`? Put easings **inside** `Motion` as a nested `ease` field so
one override group covers both:

```ts
export interface Motion {
  none; step; fast; normal; slow; pulse: number;
  readonly ease: MotionEasings;
}
```

Then `theme.motion.ease.enter`, and `ThemeOverrides.motion` accepts
`Partial<Omit<Motion, "ease">> & { readonly ease?: Partial<MotionEasings> }` —
the same shape `Typography` uses for its roles. Delete the separate
`motionEasings` export or keep it for documentation; prefer keeping `motion.ease`
as the single source. Record whichever is chosen in the commit.

### 3.2 `packages/tokens/src/theme.ts`

- `Theme` gains `readonly motion: Motion;` after `elevation`.
- `ThemeOverrides` gains:

```ts
  /** Override motion timings or easings. */
  readonly motion?: Partial<Omit<Motion, "ease">> & {
    readonly ease?: Partial<MotionEasings>;
  };
```

- `extendTheme` merges: `motion: mergeMotion(base.motion, overrides.motion)` where
  `mergeMotion` shallow-merges the timings and the nested `ease` group (write it
  beside `mergeTypography`).
- All four themes (`lightTheme`, `darkTheme`, `highContrastLightTheme`,
  `highContrastDarkTheme`) carry `motion`.

### 3.3 `packages/tokens/src/index.ts`

Add `export * from "./motion.js";` (keep the alphabetical order the file uses).

### 3.4 Tests

`packages/tokens/src/motion.test.ts` — header states the bug: motion timings were
literals in component source and the runtime takes seconds, so a token without
the conversion would run 1000× too slow. Assertions:

- every level is a non-negative integer, `none` is `0`, and the levels are
  strictly increasing in the documented order except `pulse` (state the gap);
- `motionTransition(theme, "step").duration` is `0.12`;
- the default phase is `standard`; `enter`/`exit`/`linear` map to their named
  easings;
- `extendTheme` overrides one timing and keeps the others, and overrides one
  easing and keeps the others (proves the nested merge);
- the four shipped themes share the same motion values;
- a bezier easing array survives the round trip.

`packages/tokens/src/motion.example.ts` — an executed example: a step interval
from `theme.motion.step` and a `motionTransition` for a sliding panel, asserted
by the test.

### 3.5 Docs

- `docs/tokens.md`: a `## Motion` section after `## Elevation` — the level table,
  the ms/seconds rule, `motionTransition`, the seven animatable properties, the
  absence of `transition`/`animation`, and the reduced-motion recipe
  (`extendTheme(base, { motion: { step: 0, pulse: 0 } })`). Add the new exports to
  the `## Import` block. Add a limitation bullet.
- `docs/design-system.md`: §7 gains a sentence on motion levels aligning with
  elevation; §12's non-goal "No motion tokens yet" is **deleted** and replaced by
  the rule (durations are tokens; motion exists only through `motion` props).
- `packages/tokens/README.md`: a short `## Motion` section.
- `COMPONENTS.md`: a design-system row `Motion tokens` (`done`, "yes (motion props
  only: width, height, opacity, top/right/bottom/left, borderRadius)").
- `TODO.md`: tick `Add motion tokens (durations/easings) once a component
  consumes them` (rewritten to name the consumers), plus a cross-team bullet:
  `primitives` replaces the `120`/`700` literals with `theme.motion.step` /
  `theme.motion.pulse`; overlay components use `motionTransition`.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

# Failing first: motion.test.ts before §3.1 exists.
nub run --filter @gpuixui/tokens test      # expect failure (no motion module)

nub run --filter @gpuixui/tokens check-types   # expect exit 0
nub run --filter @gpuixui/tokens test          # expect all pass
nub run check && nub run lint && nub run test  # expect exit 0
```

Two-direction proof for the ms→seconds rule: change `duration` to
`theme.motion[level]` and watch `motionTransition` fail with `120` against
`0.12`; restore.

## 5. Test plan

- `motion.test.ts` fails before the module exists, and fails if the conversion is
  dropped (120 vs 0.12).
- The nested-ease merge is proven by overriding one easing and asserting the
  others keep their base value.
- `motion.example.ts` is executed by the test, so the documented example cannot
  rot.
- No existing assertion is weakened; the `theme.test.ts` merge assertions must
  still pass with the extra group.

## 6. STOP conditions

- STOP if the installed runtime's `MotionTransition` does **not** take seconds,
  or `MotionProps` does not exist (re-check §1). The conversion is the whole
  point.
- STOP if adding `motion` to `Theme` breaks a consumer outside `packages/tokens/**`
  (their port declares the groups it reads; an extra group must not break it).
  Record it in `TODO.md` instead of editing their paths.
- STOP if `theme.test.ts`'s existing "every group merges" style assertion needs a
  weakening to accommodate the new group.
- STOP if any gate is red for a reason outside this plan.

## 7. Acceptance criteria

- [ ] `motion.ts` exists with the six levels and four phasings; every value is
      justified by a real or imminent consumer named in §2.
- [ ] `theme.motion` is part of `Theme`, merges through `extendTheme`, and is
      present in all four shipped themes.
- [ ] `motionTransition` converts milliseconds to the runtime's seconds and is
      tested in both directions.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
      `COMPONENTS.md` document the tokens; the design-system non-goal is gone.
- [ ] `TODO.md` ticks the motion item and records the consumer interlock.
- [ ] `nub run check`, `nub run lint`, `nub run test` exit 0.
- [ ] Committed on `agent/tokens-theme` and pushed.
