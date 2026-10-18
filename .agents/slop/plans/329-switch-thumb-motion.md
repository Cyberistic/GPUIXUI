# 329 — The switch thumb slides (and native `motion` is usable)

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the package), `041` (runtime verification), `049` (the switch's `invalid`/focus paint), `328` (the loading family's timer discipline) |
| Status | done |
| Fixes | `Switch`'s thumb jumps between its two ends, and three docs claim the runtime's `motion` is unusable |

---

## 1. What is wrong

`Switch` positions its thumb with the track's `justifyContent`. The moment
`checked` flips, layout moves the thumb from one end to the other in a single
frame — there is no transition, because layout has none. `docs/switch.mdx` says
so ("No slide animation: the thumb jumps between the two `justifyContent`
values") and `COMPONENTS.md` repeats it.

The same reason is given for **not using the runtime's own motion API**:

- `core/loading.ts` — "`motion` itself is only reachable through the
  `@gpuix/react` root, which this repository cannot import (plan 020 §3)";
- `docs/progress.mdx` — "cannot interpolate position beyond the motion API this
  package does not import";
- `docs/meter.mdx` — "`motion` is not used here".

That first claim is **false on 0.10.0**, and the other two rest on it.

### 1.1 Measured: `motion` is published, importable and animates

On this host, 2026-10-18, the locally built `@gpuix/native@0.10.0` binding
(ADR 0003), `packages/primitives`:

```
import { motion } from "@gpuix/react"     → { div: ForwardRefExoticComponent }
```

`motion.div` takes `initial` / `animate` / `transition` (`MotionStyle` =
`width`, `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`;
`MotionTransition` = `duration` seconds + optional `delay`, `ease`). A probe
rendered one band with `initial {left: 0}`, `animate {left: 200}`,
`transition {duration: 1, ease: "linear"}`, then read
`renderer.getElementBounds(id)`:

```
t0     x 0.5
t250   x 50.5      (the motion clock advanced by clockFastForward(250))
t500   x 100.5
t1000  x 200
```

Two further facts the same probe established:

- `TestRenderer.advanceTime(ms)` does **not** move an animation; the motion clock
  is `clockFastForward(ms)` followed by `flush()`. The adapter's `advance` is
  `advanceTime`, so a motion test needs its own verb.
- Retargeting `animate` on a mounted element animates from the **current**
  painted value (2 → 9 at +100 ms → 12 at +300 ms for a 200 ms transition), and
  re-rendering with the same target does not restart it.
- `MotionTransition` has **no `repeat`**, so a looping animation is not honest:
  the second cycle would have to rewind visibly or remount the element. That is
  why the loading indicators keep their discrete steps (this plan only corrects
  their prose), and why the switch — whose animation is one-way per toggle — is
  the right first user.

### 1.2 The thumb's resting geometry, measured

`Switch` at `size="md"` in the runtime test theme:

```
track  x12  y12  28×16
thumb  x15  y14  12×12      unchecked → dx 3, dy 2
thumb  x25  y14  12×12      checked   → dx 13
```

`position: "absolute"` inside a bordered box is measured from the **padding-box
edge** (inside the border): `left: 3` in a 1px-bordered box painted `dx 4`.
So the two targets are `left 2` and `left 12` from the track's border box, and
`top 1` (dy = border + top). A separate probe confirmed the clip/containing-block
behaviour: an absolute child moved with its parent (`marginLeft 50` + `left -40`
painted 22 for a parent at 62) and animated across it.

---

## 2. The rules

> **A state change that moves something paints the movement.** The switch thumb
> slides between its two ends over 200 ms with the runtime's own motion, and
> rests **exactly** where the layout painter put it before (dx 3 / 13, dy 2 at
> `md`).

> **Native motion is used only where its shape matches the contract.** One
> target change per user action, a numeric target, and a resting value the
> resolver already knows. No loops (no `repeat`), no percentage targets, no
> animation the runtime cannot report (opacity has no observable truth in the
> `TestRenderer`).

> **Only the position animates.** The track's colours, radius, hover/active
> rules, focus ring, `pointerEvents: "none"` and the thumb's size are unchanged;
> a disabled switch still refuses activation.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/selection.ts` | one `SWITCH_TRACK_RATIO`; export `switchTrackWidth(spec, theme)` and `switchThumbOffset(spec, theme)`; `switchTrackStyle` becomes `position: "relative"` with no padding/justify; `switchThumbStyle` becomes absolute and carries the offset |
| `packages/primitives/src/components/Switch.tsx` | the thumb is `motion.div` from `@gpuix/react`, `initial`/`animate` from the resolver's `left`, `transition` 0.2 s `easeOut`; one module constant `SWITCH_THUMB_SLIDE_MS = 200` |
| `packages/primitives/src/testing/runtime.ts` | `Runtime.advanceMotion(ms)` — `clockFastForward` + `flush`, beside `advance` (timers) |
| `packages/primitives/src/core/selection.test.ts` | `switchThumbOffset` at `sm`/`md`/`lg`, both ends |
| `packages/primitives/src/components/selection.test.tsx` | the element tree: an absolute thumb, `left` 2 → 12, `top` 1, `animate` target equals the resting `left`, the track no longer centres with `justifyContent` |
| `packages/primitives/runtime/controls.runtime.test.tsx` | the slide itself, and a controlled mount at the far end |
| `packages/primitives/docs/switch.mdx` | the slide replaces the jump limitation; theming/verification rows |
| `packages/primitives/docs/skeleton.mdx`, `docs/progress.mdx`, `docs/meter.mdx` | the accurate reason a loop is not used (no `repeat`), not "motion is unavailable" |
| `packages/primitives/src/core/loading.ts` | delete the false "cannot import `motion`" claim; state the real constraint |
| `packages/primitives/README.md` | the motion row in the capability table, and the measured test counts |
| `docs/gpuix-capabilities.md` | the motion row gains the measured verdict, the `clockFastForward` rule and the missing `repeat` |
| `COMPONENTS.md` | the Switch row records the slide and the measured travel |
| `PLAN.md` | decision `D34` |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

---

## 4. Exact implementation

### 4.1 `core/selection.ts`

```ts
/** The pill's width as a multiple of its height (measured: 28×16 at `md`). */
const SWITCH_TRACK_RATIO = 1.75;

/** The thumb's side: the track height less one `2xs` inset on each edge. */
const switchThumbSide = (spec: SelectionSpec, theme: PrimitiveTheme): number =>
  theme.iconSize[spec.size] - theme.spacing["2xs"] * 2;

/** The track's painted width. */
export const switchTrackWidth = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): number => Math.round(theme.iconSize[spec.size] * SWITCH_TRACK_RATIO);

/**
 * Where the thumb rests, relative to the track's padding box (inside its border).
 *
 * `position: "absolute"` measures `left`/`top` from the padding-box edge, so the
 * `2xs` inset the layout painter used is the resting `left`, and the checked
 * position is the content width less the inset and the thumb.
 */
export const switchThumbOffset = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): { readonly left: number; readonly top: number } => {
  const height = theme.iconSize[spec.size];
  const side = switchThumbSide(spec, theme);
  const border = theme.borderWidth.thin;
  const edge = theme.spacing["2xs"];
  const contentWidth = switchTrackWidth(spec, theme) - border * 2;
  return {
    left: filled(spec) ? contentWidth - edge - side : edge,
    top: Math.round((height - border * 2 - side) / 2),
  };
};
```

`switchTrackStyle`: remove `display`, `flexDirection`, `alignItems`, `padding`
and `justifyContent`; add `position: "relative"`; width becomes
`switchTrackWidth(spec, theme)`.

`switchThumbStyle`: keep size/radius/colour/`pointerEvents`; add
`position: "absolute"` and spread `switchThumbOffset(spec, theme)`.

### 4.2 `components/Switch.tsx`

```tsx
import { motion } from "@gpuix/react";

/** How long the thumb takes to cross the track. */
const SWITCH_THUMB_SLIDE_MS = 200;

// in renderSwitch:
const thumb = switchThumbStyle(spec, theme);
...
      <motion.div
        initial={{ left: thumb.left }}
        animate={{ left: thumb.left }}
        transition={{
          duration: SWITCH_THUMB_SLIDE_MS / 1000,
          ease: "easeOut",
        }}
        style={thumb}
      />
```

`motion.div`'s prop type (`MotionDivProps`) has no `testId` and no `role`, which
is correct here: the thumb is decoration and the track owns the switch semantics.

### 4.3 `src/testing/runtime.ts`

```ts
/** Move the **motion clock** (animations), as opposed to `advance`'s timers. */
readonly advanceMotion: (milliseconds: number) => void;
...
advanceMotion: (milliseconds) => {
  renderer.clockFastForward(milliseconds);
  renderer.flush();
},
```

### 4.4 Tests

`src/core/selection.test.ts` — pure geometry at all three sizes, both ends:

```ts
it("rests the switch thumb on the inset at each end", () => {
  const off = switchThumbOffset(spec("md", "unchecked"), testTheme);
  const on = switchThumbOffset(spec("md", "checked"), testTheme);
  expect(off).toEqual({ left: 2, top: 1 });
  expect(on).toEqual({ left: 12, top: 1 });
  // sm/lg derive from the theme, so a changed icon size moves them too
  expect(switchThumbOffset(spec("lg", "checked"), testTheme).left).toBe(15);
});
```

`src/components/selection.test.tsx`:

```tsx
it("rests its thumb at the end it reports, and animates only that position", () => {
  // The bug guarded (plan 329): the thumb was laid out with justifyContent, so
  // it jumped and there was no transition to assert on.
  const thumbOf = (element: ReactElement): ReactElement =>
    expectSome(Arr.head(elementChildren(element)));
  const off = renderSwitch({}, testTheme, checked(false), idle, vi.fn());
  const on = renderSwitch({}, testTheme, checked(true), idle, vi.fn());
  const offThumb = thumbOf(off);
  const onThumb = thumbOf(on);
  expect(expectSome(elementProp(offThumb, "animate"))).toEqual({ left: 2 });
  expect(expectSome(elementProp(onThumb, "animate"))).toEqual({ left: 12 });
  expect(expectSome(elementProp(offThumb, "style"))).toMatchObject({
    position: "absolute",
    left: 2,
    top: 1,
  });
  expect(Option.isNone(hostStyle(off, "justifyContent"))).toBe(true);
});
```

A `motion.div` is not a host tag, so its props are read with `elementProp`, not
`hostStyle` (the executor must not "fix" this by adding a tag).

`runtime/controls.runtime.test.tsx`:

```tsx
/** The switch's thumb box, which is the switch's only child. */
const switchThumb = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
        runtime.boundsOfId(id),
      ),
    ),
    () => expect.fail(`the ${testId} switch painted no thumb`),
  );

it("slides the switch thumb to its new end instead of jumping", async () => {
  // Plan 329 §1.2: the thumb used justifyContent, so it teleported. Measured
  // travel at md: dx 3 → 13, dy 2.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="sw" label="Wifi" />
    </Surface>,
  );
  const track = boundsOf(runtime, "sw");
  const rest = switchThumb(runtime, "sw");
  expect(rest.x - track.x).toBe(3);
  expect(rest.y - track.y).toBe(2);

  runtime.click("sw");
  runtime.advanceMotion(0);
  const atClick = switchThumb(runtime, "sw");
  runtime.advanceMotion(100);
  const midway = switchThumb(runtime, "sw");
  runtime.advanceMotion(200);
  const end = switchThumb(runtime, "sw");

  expect(atClick.x).toBe(rest.x); // no jump on the click
  expect(midway.x).toBeGreaterThan(rest.x);
  expect(midway.x).toBeLessThan(end.x);
  expect(end.x - track.x).toBe(13); // the resting place the layout painter had
  expect(end.y).toBe(rest.y);
});

it("rests a controlled switch at the end it mounted with", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Switch testId="sw" label="Wifi" checked />
    </Surface>,
  );
  // Mount applies `initial`, so a switch that starts on paints no slide.
  const track = boundsOf(runtime, "sw");
  expect(switchThumb(runtime, "sw").x - track.x).toBe(13);
});
```

### 4.5 Docs truth

- `switch.mdx`: the limitation becomes "the thumb slides 200 ms; it is a `left`
  inset because there is no `transform`; a reduced-motion preference is the
  app's (no OS API)".
- `skeleton.mdx`: "**No looping shimmer.** A swept highlight band is
  expressible (position motion inside `overflow: hidden`), but `MotionTransition`
  has no `repeat`: the second cycle would rewind or remount. The pulse stays a
  discrete interval."
- `progress.mdx` / `meter.mdx`: the discrete step is because `MotionStyle`
  targets are numbers (the bar is a percentage) and a loop has no `repeat` —
  **not** because motion is unavailable.
- `core/loading.ts`: replace the "cannot import" paragraph with the measured
  constraint; the stepping behaviour is unchanged.
- `README.md`: the capability row gains "motion: position/size/opacity/radius,
  no transform, no repeat; the switch thumb uses it"; the measured counts are
  refreshed in §8.
- `docs/gpuix-capabilities.md`: the motion line gains "verified in the
  `TestRenderer` via `clockFastForward` + `flush`; `advanceTime` does not move
  it; no `repeat`".

---

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `cd packages/primitives && nub run test -- selection` **before** the change | the new element-tree case fails: the thumb is a host `div` with no `animate` prop and no `position` |
| 2 | `nub exec vitest run --config vitest.runtime.config.ts runtime/controls.runtime.test.tsx` **before** the change | the slide case fails: `midway` equals `end` (the jump) |
| 3 | apply §4.1–§4.3 | — |
| 4 | `nub run test` | 40 files, 522 tests green |
| 5 | `nub run test:runtime` | 21 files, 315 tests green |
| 6 | from the repo root: `nub run check` | `check:tests`, `oxlint`, `oxfmt` and every `check-types` green |
| 7 | `git diff --stat` | only §3's files |

---

## 6. STOP conditions

- **STOP** if the thumb's resting position changes at any size (`dx` 3/13 and
  `dy` 2 at `md`; the runtime `geometry` probe is the reference).
- **STOP** if the thumb paints outside the track, or if the track stops being the
  hit area (a click must still toggle).
- **STOP** if a focus ring, `invalid` border, hover or active rule changes.
- **STOP** if the animation runs on mount of an already-checked switch (mount
  must apply `initial`, not slide).
- **STOP** if the change needs a new public prop, a new dependency, or an edit
  outside §3's files. In particular: do **not** convert any loading indicator to
  motion — they loop, and `MotionTransition` has no `repeat`.
- **STOP** if `advanceMotion` is folded into `advance`: they drive different
  clocks and the existing loading tests rely on the timer one.

---

## 7. Acceptance

- [x] A click or key toggle moves the thumb through an intermediate position
      (200 ms, `easeOut`) and lands exactly on dx 3 / 13, dy 2 at `md`.
- [x] A controlled switch that mounts at the far end rests there with no slide.
- [x] The track stays the hit area; focus, invalid, hover, active and disabled
      behaviour are unchanged.
- [x] The element tree, the pure geometry, `nub run test`, `nub run test:runtime`
      and `nub run check` are green; §8 records both failing directions.
- [x] The motion claims in `core/loading.ts`, `switch.mdx`, `skeleton.mdx`,
      `progress.mdx`, `meter.mdx`, `README.md`, `docs/gpuix-capabilities.md`,
      `COMPONENTS.md` and `TODO.md` agree with the measurement.

---

## 8. Measured results

All runs on this host, 2026-10-18, real GPUix 0.10.0 `TestRenderer`
(locally built `darwin-x64`, ADR 0003).

### 8.1 Before the fix

Measured with the published `motion` probe (a band, `initial {left: 0}`,
`animate {left: 200}`, 1 s linear):

```
t0     x 0.5
t250   x 50.5
t500   x 100.5
t1000  x 200
```

and the switch's resting boxes: track `x12 y12 28×16`, thumb `x15 y14 12×12`
unchecked (dx 3, dy 2) and `x25 y14 12×12` checked (dx 13). The thumb was a
host `div` positioned by `justifyContent`, so a toggle moved it in one frame.

### 8.2 Both failing directions

Each mutation was applied, the named test run, and the file restored.

| Mutation | Result |
| -------- | ------ |
| the thumb back to a plain host `div` (no motion) | `src/components/selection.test.tsx > Switch > rests its thumb at the end it reports…` fails: "the element tree did not carry what this test asserts on" (no `animate` prop, 1 failed / 521 passed); `runtime/controls.runtime.test.tsx > slides the switch thumb…` fails at the click: `expected 25 to be 15` — the thumb teleported to the far end |
| the slide's duration set to `0` | the runtime slide case fails identically: `expected 25 to be 15` — the intermediate sample is already the target, which is exactly a jump |

### 8.3 After the fix

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  522 passed (522)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  315 passed (315)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done

nub run test
  tokens 196, testing 19, icons 19, playground 11, components 308,
  primitives 522 — all green
```

The slide test measured the resting places the layout painter produced before
the change (dx 3 / 13, dy 2) and then, after a click and
`advanceMotion(100)` of the 200 ms transition, an intermediate x strictly
between them — with `advanceMotion(0)` unchanged from the resting x, proving the
click itself does not jump. A controlled `<Switch checked />` mounted at dx 13,
proving `initial` suppresses the mount slide.

