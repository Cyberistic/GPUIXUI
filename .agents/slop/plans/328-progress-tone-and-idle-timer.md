# 328 — `Progress` ignores `tone` when indeterminate, and animates when it has nothing to animate

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the package), `041` (runtime verification), `053` (value controls reuse `progressFillStyle`), `097` (style order) |
| Status | done |
| Fixes | `Progress`'s indeterminate fill colour and its always-on animation timer |

---

## 1. The defects

Two independent defects in one component, both in the loading family.

### 1.1 `tone` reaches a determinate bar only

`Progress` documents `tone` as "the fill's colour role" and `Meter` passes it to
the same resolver. The determinate fill reads the tone map
(`progressFillStyle` → `progressTones`), but the indeterminate branch hard-codes
the brand role:

```tsx
// packages/primitives/src/components/Progress.tsx (before, line 60)
: indeterminateFillStyle(SEGMENT, theme.colors.primary, theme);
```

**Measured on this host, 2026-10-18**, real GPUix 0.10.0 `TestRenderer`, with
`<Progress tone="success" label="Saving" />`:

```
indeterminateFill: "#000007"   // the test theme's primary
success:           "#000011"   // what tone="success" must paint
```

A saving bar asked for `success` and painted the brand role. Same for
`destructive` and `muted`; only `primary` happened to look right.

### 1.2 A determinate bar runs the animation timer forever

`Progress` calls the shared step hook unconditionally:

```tsx
// before
renderProgress(props, useTheme(), useStep(SPINNER_SEGMENTS, 120));
```

`useStep` starts a 120 ms `setInterval` on mount and never stops it. A
determinate bar ignores `step` entirely, yet it re-renders 8 times a second for
as long as it is mounted — a settings form with one progress bar burns a timer
and a React render for no pixels.

**Measured on this host, 2026-10-18**, one `setInterval` spy around each mount
(fresh window per case):

```
determinate:   1   // no animation is needed
indeterminate: 1   // correct
```

Determinate must be `0`. The existing runtime suite only sampled the
indeterminate bar, so nothing caught this.

---

## 2. The rules

> **Tone means tone in both modes.** The indeterminate segment takes the same
> `ProgressTone` colour role a determinate fill does, resolved from one map.

> **An indicator animates only while it has something to animate.** A
> determinate `Progress`, a static `Skeleton` variant or any future static use
> schedules no interval; the hook's activity is explicit.

The step maths (`indeterminateOffset`, `pulseOpacity`, `spinnerDots`) is already
pure and unchanged.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | export `progressToneColor(tone, theme)`; `progressFillStyle` uses it, so determinate and indeterminate resolve the same map |
| `packages/primitives/src/components/internal.ts` | `useStep(steps, intervalMs, active = true)` — no interval while inactive, `active` in the effect deps |
| `packages/primitives/src/components/Progress.tsx` | resolve the indeterminate colour through `progressToneColor`; one local `isIndeterminate(value)` used by both the renderer and the hook |
| `packages/primitives/src/components/Progress.test.tsx` | the tone regression at the element-tree seam |
| `packages/primitives/src/components/testing/element.ts` | `elementChildren` treats a fragment as transparent — the indeterminate bar's spacer and segment sit in one, so the tone test could not reach the fill |
| `packages/primitives/runtime/loading.runtime.test.tsx` | the painted indeterminate tone, and the `setInterval` count for both modes |
| `packages/primitives/docs/progress.mdx` | say `tone` applies in both modes, and that a determinate bar schedules nothing |
| `packages/primitives/README.md` | refresh the measured test counts |
| `COMPONENTS.md` | the Progress row records both fixes |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

`Spinner` and `Skeleton` keep animating: their two-argument `useStep` call takes
the default `active = true`.

---

## 4. Exact implementation

### 4.1 `core/style.ts`

```ts
/** The colour role a progress tone paints, in both the determinate and indeterminate bar. */
export const progressToneColor = (
  tone: ProgressTone,
  theme: PrimitiveTheme,
): string => paint(progressTones[tone], theme);

export const progressFillStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  height: "100%",
  width: `${progressPercent(spec.value ?? 0)}%`,
  borderRadius: theme.radius.full,
  backgroundColor: progressToneColor(spec.tone, theme),
});
```

`progressTones` stays private; the one exported reader is the single source.

### 4.2 `components/internal.ts`

```ts
export const useStep = (
  steps: number,
  intervalMs: number,
  active = true,
): number => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    // A static indicator must schedule nothing; the dep re-runs the effect when
    // a bar turns indeterminate, and the cleanup clears the old interval.
    if (!active) return;
    const id = setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [steps, intervalMs, active]);
  return step;
};
```

The doc comment above the hook gains one sentence: "`active` is false for a
component that has nothing to animate (a determinate progress bar), so it holds
one render and no timer."

### 4.3 `components/Progress.tsx`

```tsx
import { progressToneColor } from "../core/style.js";

/** An absent value means the bar has no proportion to show. */
const isIndeterminate = (value: number | undefined): boolean =>
  value === undefined;

// in renderProgress:
const determinate = !isIndeterminate(value);

// the indeterminate fill:
: indeterminateFillStyle(SEGMENT, progressToneColor(tone, theme), theme)

// the component:
export const Progress = (props: ProgressProps): ReactElement =>
  renderProgress(
    props,
    useTheme(),
    useStep(SPINNER_SEGMENTS, 120, isIndeterminate(props.value)),
  );
```

### 4.4 Tests

`src/components/Progress.test.tsx` — append (uses the existing `elementChildren`
/ `hostStyleString` helpers):

```tsx
it("paints an indeterminate bar in the requested tone", () => {
  // The bug guarded (plan 328): the indeterminate branch hard-coded the brand
  // role, so tone="success" painted primary.
  const element = renderProgress(
    { tone: "success", label: "Saving" },
    testTheme,
    0,
  );
  const fill = expectSome(Arr.get(elementChildren(element), 1));
  expect(expectSome(hostStyleString(fill, "backgroundColor"))).toBe(
    testTheme.colors.success,
  );
});
```

`runtime/loading.runtime.test.tsx` — two cases:

```tsx
it("paints an indeterminate Progress in its requested tone", async () => {
  // Plan 328 §1.1, measured: the fill was #000007 (primary) where the theme's
  // success is #000011.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Progress testId="pg" tone="success" label="Saving" />
    </Surface>,
  );
  const fill = Option.getOrElse(Arr.get(childrenOf(runtime, "pg"), 1), () =>
    expect.fail("the indeterminate bar painted no fill"),
  );
  expect(styleOf(runtime, fill)["backgroundColor"]).toBe(
    testTheme.colors.success,
  );
});

it("animates an indeterminate bar and leaves a determinate one still", async () => {
  // Plan 328 §1.2: the step hook ran for every mount, so a determinate bar
  // re-rendered every 120 ms with nothing to move.
  const timersFor = async (progress: ReactElement): Promise<number> => {
    const runtime = await openWindow();
    const spy = vi.spyOn(globalThis, "setInterval");
    try {
      runtime.render(<Surface>{progress}</Surface>);
      runtime.flush();
      return spy.mock.calls.length;
    } finally {
      spy.mockRestore();
    }
  };
  expect(await timersFor(<Progress testId="d" value={42} />)).toBe(0);
  expect(await timersFor(<Progress testId="i" />)).toBe(1);
});
```

Do not use `vi.useFakeTimers()`: measured on this host it throws
`TypeError: Cannot redefine property: Now` — the native renderer already owns
that global. Spying on `setInterval` proves the same fact without replacing it.

### 4.5 Docs

- `progress.mdx` API row: `tone` — "the fill's colour role, in both the
  determinate and the indeterminate bar".
- Under the value paragraph: "A determinate bar is static: it schedules no
  timer. The 120 ms step runs only while the bar is indeterminate."
- Verification list gains the two runtime cases and the element-tree tone case.
- `COMPONENTS.md` Progress row appends: `**Tone (328):**` and `**Static (328):**`
  sentences with the measured numbers.
- `README.md`: replace the measured counts with the post-change numbers (§8).

---

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `cd packages/primitives && nub run test -- Progress` before the fix | the new tone test fails: `expected '#000007' to be '#000011'` |
| 2 | `nub exec vitest run --config vitest.runtime.config.ts runtime/loading.runtime.test.tsx` before the fix | the tone case fails on the fill colour; the timer case fails `expected 1 to be 0` |
| 3 | apply §4.1–§4.3 | — |
| 4 | `nub run test` | 40 files, 519 tests green |
| 5 | `nub run test:runtime` | 21 files, 313 tests green |
| 6 | from the repo root: `nub run check` | `check:tests`, `oxlint`, `oxfmt` and every `check-types` green |
| 7 | `git diff --stat` | only §3's files |

---

## 6. STOP conditions

- **STOP** if a determinate bar's painted width stops following `value`
  (`filled to its value` and the clamp cases must stay green).
- **STOP** if `Spinner` or `Skeleton` stops animating — the default `active`
  must be `true`.
- **STOP** if the interval outlives the component (the effect must return its
  cleanup).
- **STOP** if the fix requires a new public prop or a new dependency.
- **STOP** outside §3's files. `Meter` needs no change: it is always
  determinate and already reads the tone map.

---

## 7. Acceptance

- [x] `<Progress tone="success" />` (indeterminate) paints `colors.success`,
      and `destructive`/`muted` follow their roles; `primary` is unchanged.
- [x] A determinate `Progress` schedules **no** interval; an indeterminate one
      schedules exactly one, and unmounting clears it.
- [x] Element-tree, runtime, `nub run test`, `nub run test:runtime` and
      `nub run check` are green, and §8 records the measured before/after.
- [x] Docs, `COMPONENTS.md`, `TODO.md` and the plan index updated.

---

## 8. Measured results

All runs on this host, 2026-10-18, real GPUix 0.10.0 `TestRenderer`.

### 8.1 Both failing directions

Each mutation was applied, the named test run, and the file restored.

| Mutation | Result |
| -------- | ------ |
| indeterminate fill back to `theme.colors.primary` | `Progress > paints an indeterminate bar in the requested tone` fails: `expected '#000007' to be '#000011'` (offline; 1 failed / 4 passed), and the runtime case fails identically (1 failed / 7 skipped) |
| `useStep` called with two arguments (old, always active) | `animates an indeterminate Progress and leaves a determinate one still` fails on the first half: `expected 1 to be +0` — a determinate bar scheduled one interval |
| `useStep(..., false)` (the other wrong direction) | the same test fails on the second half: `expected +0 to be 1` — the indeterminate bar scheduled nothing |

`vi.useFakeTimers()` was tried first and is unusable here: it throws
`TypeError: Cannot redefine property: Now` because the native renderer already
owns that global. The `setInterval` spy proves the same fact without replacing
the timer implementation. One further fact the probe established: three renders
of the same `Progress` at the same tree position reuse one instance, so the test
opens a fresh window per case.

The tone test also needed the element tree to reach through a fragment — the
indeterminate bar's spacer and segment are one — so `elementChildren` now treats
a fragment as transparent (its children are the element's children; a fragment
paints nothing). No other suite changed.

### 8.2 After the fix

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  519 passed (519)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  313 passed (313)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done

nub run lint    no findings
nub run test    tokens 196, testing 19, icons 19, playground 11,
                components 308, primitives 519 — all green
```
