# 811 — A `Surface` adapter is told when its host gains focus, never when it loses it

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `437`, `603`, `696`, `697`, `698`, `699`, `733` |
| Status | done |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

`Surface` is the library's only foreign-view seam. Its adapter contract
(`src/surface/adapter.ts`) has six lifecycle operations — `create`, `resize`,
`focus`, `setVisible`, `setTheme`, `destroy` — and the component drives **one
direction of focus**: when the host becomes the tracker's focused element the
adapter's `focus()` runs.

There is no `blur`. An adapter that paints a caret, keeps an IME session, starts
a repaint loop or forwards keys to an embedded view is never told that the host
lost focus, so it cannot release it.

Measured on this host (release-tag binding, probe window 1280 × 800) with a
recording adapter, a focusable `Surface` and an `Input` after it:

```text
probe: focusNext() → "surface"   calls: create, resize:120x80, visible:true, theme:light, focus
probe: focusNext() → "after"     calls: create, resize:120x80, visible:true, theme:light, focus
                                 ring: none
```

The tracker did report the loss — the surface's painted `boxShadow` is gone, so
`focus.focused` flipped to `false` — and the adapter's last recorded operation is
still `focus`. The session is left believing it is focused.

### 0.2 Why it matters

- The seam exists so something else owns the inside of the box (plan `437` §2.3;
  the raster path is the only published-0.10.0 implementation). Every such
  inside has focus state: a chart's crosshair, a media scrubber, a terminal
  cursor, a webview's caret.
- The component already promises the opposite shape: `focus()` is documented as
  "route host focus into the surface" and the focus effect is edge-driven. A
  one-way edge is not a focus contract; it is an event.
- `destroy` is the only way out today. An adapter that waits for `blur` before
  it releases a resource would hold it until the whole surface unmounts.
- No test could have caught it: the contract has no `blur` to assert, and the
  existing focus case ends while the host is still focused.

### 0.3 What must not change

- A non-focusable surface (`tabIndex` absent) records exactly
  `create, resize, visible:true, theme` and nothing else — no spurious `blur`
  and no `focus`.
- A focusable surface that never takes focus records no `blur` either.
- Focus **entering** still runs `adapter.focus()` exactly as today, including
  focus that arrives while the session is still being created (`focusRef`).
- Unmount stays `setVisible(false) → destroy`; `destroy` is the terminal state
  and does not get a `blur` before it.
- The adapter-swap gate (plan `699`) and the raster path are untouched.

## 1. The decision

**`SurfaceAdapter` gains a required `blur()` operation, and the component calls
it whenever the host loses the native focus it had routed in.** The pair is
edge-driven and level-consistent: the adapter hears `focus` when the host gains
focus and `blur` when it loses it; it never hears a `blur` it did not earn.

`blur` is **required**, not optional. The type is the contract: an adapter author
must decide what losing focus means, and the compiler is the only guard that
reaches every implementation. The published `rasterSurface` has no focus state,
so its `blur` is `Effect.void`.

`SurfaceOperation` gains `"blur"`, so a failing `blur` is reported through the
existing `onError`/log path with the failing edge named — the same typed route as
the other five operations.

## 2. The rule

`src/components/Surface.tsx`, inside the component:

```ts
const adapterFocused = useRef(false);
```

- **Session start / end** — the create effect resets it (`adapterFocused.current
  = false`) and its cleanup resets it again after the session is torn down.
- **Create sequence** — the focus step records that the adapter was told:

```ts
Effect.andThen(
  Effect.suspend(() =>
    focusRef.current
      ? adapter.focus().pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              adapterFocused.current = true;
            }),
          ),
        )
      : Effect.void,
  ),
),
```

- **Focus effect** — one edge, both directions, and no call when the adapter is
  already in that state (which is also why mounting an unfocused surface emits
  no `blur`):

```ts
useEffect(() => {
  if (!live.current) return;
  if (focus.focused === adapterFocused.current) return;
  adapterFocused.current = focus.focused;
  run(focus.focused ? adapter.focus() : adapter.blur());
}, [adapter, focus.focused]);
```

`src/surface/adapter.ts`:

```ts
const SurfaceOperation = Schema.Literals([
  "create",
  "resize",
  "focus",
  "blur",
  "setVisible",
  "setTheme",
  "destroy",
])…
```

and on `SurfaceAdapter`, beside `focus`:

```ts
readonly focus: () => Effect.Effect<void, SurfaceError>;
/** The host lost the native focus that `focus` reported. */
readonly blur: () => Effect.Effect<void, SurfaceError>;
```

`src/surface/raster.ts` adds `blur: () => Effect.void` — a frame has no focus
state; the operation exists so a raster adapter is a complete implementation of
the contract, not a special case.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/surface/adapter.ts` | `"blur"` in `SurfaceOperation`; a documented `blur` on `SurfaceAdapter` |
| `packages/primitives/src/surface/raster.ts` | `blur: () => Effect.void` |
| `packages/primitives/src/components/Surface.tsx` | the `adapterFocused` ref, the session-start/cleanup reset, the create-sequence tap and the two-way focus effect; the header comment's lifecycle sentence |
| `packages/primitives/runtime/surface.runtime.test.tsx` | the recorder gains `blur`; one new case (§5.2); the four other inline adapters gain `blur: () => Effect.sync(…)`/`Effect.void` |
| `packages/primitives/runtime/surface-trigger.runtime.test.tsx` | the test adapter gains `blur` |
| `packages/primitives/runtime/theme-matrix.runtime.test.tsx` | `NO_PIXELS` gains `blur` |
| `packages/primitives/docs/surface.mdx` | the adapter table, the mount-order sentence and the focus section state the two-way edge |
| `COMPONENTS.md` | a `Blur edge (811)` note on the Surface row |
| `TODO.md` | a ticked task under the primitives workstream; the progress bar |
| `.agents/slop/plans/README.md` | the plan row |

No file outside `packages/primitives`, `COMPONENTS.md`, `TODO.md` and the plan
index is touched.

## 4. Commands and expected results

Run from `packages/primitives` unless the command names a filter:

| Command | Expected |
| ------- | -------- |
| `nub run test:runtime runtime/surface.runtime.test.tsx` | **before** the fix: the new case times out waiting for "the adapter blur"; **after**: 1 file / 11 tests green |
| `nub run test:runtime runtime/surface-trigger.runtime.test.tsx runtime/theme-matrix.runtime.test.tsx` | green after the adapters gain `blur` |
| `nub run test` | 75 files / 1110 tests (no offline test changes) |
| `nub run check-types` | exit 0 — every `SurfaceAdapter` implementation implements `blur` |
| `nub run --filter @gpuixui/primitives lint` / `fmt` | exit 0 for the touched files |

## 5. Test plan and the two-direction proof

### 5.1 Guards that must keep passing

- `creates, sizes, shows and themes one session, then destroys it` asserts the
  **exact** call list of a non-focusable surface. It fails if a `blur` is emitted
  on mount, so no separate "no spurious blur" case is needed for that shape.
- `routes native focus into the adapter when the host is a tab stop` fails if
  the `adapterFocused` bookkeeping swallows the first `focus`.
- `finishes the old adapter's teardown before creating the next session` proves
  the swap gate is unchanged.

### 5.2 New native case (`surface.runtime.test.tsx`)

**"tells the adapter when the host loses the focus it was given"**

1. Mount a `Frame` with a focusable `Surface` (`tabIndex={0}`) followed by an
   `Input`.
2. `focusNext()` → tracker reports `surface`; wait for `calls` to include
   `focus`; assert the focus ring is painted.
3. `focusNext()` → tracker reports `after`; wait for `calls` to include `blur`;
   assert the ring is gone and that `blur` is the last recorded operation.
4. `focusNext()` (wraps back) → tracker reports `surface`; wait for a `focus`
   recorded **after** the `blur`, proving the edge is repeatable.
5. Assert a non-focusable surface in the same render sequence never records
   `blur` (mount a second recording surface without `tabIndex` and check its own
   list is exactly `create, resize, visible:true, theme:…`).

### 5.3 Two directions (each mutation was run, then reverted)

| Direction | Observed failure |
| --------- | ---------------- |
| Old code (the one-way focus effect: `if (!focus.focused) return;`) | `tells the adapter when the host loses the focus it was given` timed out after 2 000 ms waiting for "the adapter blur"; the other 9 cases passed |
| `blur` omitted from `rasterSurface` | `check-types` exit `1`: `src/surface/raster.ts(128,3): error TS2741: Property 'blur' is missing in type … but required in type 'SurfaceAdapter'` |

A third mutation — dropping the `adapterFocused` gate — was **not** claimed as a
direction: the `live` guard already suppresses a mount-time call, so no existing
case distinguishes it. The gate stays as the structural rule ("a blur must be
earned") and not as a tested mutation.

## 6. STOP conditions

Stop and report rather than improvise if:

- the tracker does not flip `focus.focused` to `false` on this runtime (the whole
  edge depends on it; `603` proves it for controls — record the dump and plan
  the tracker gap instead);
- a second `blur`/`focus` pair is emitted for one Tab (the effect is not
  edge-driven; do not paper over it with a debounce);
- `rasterSurface` or another adapter needs real focus state to implement `blur`
  honestly (then the adapter, not the component, owns that plan);
- the change would alter the non-focusable call list or the swap ordering;
- any edit would land outside the files listed in §3 (record it instead).

## 7. Outcome

Implemented and measured in this worktree 2026-10-21 (release-tag binding):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check-types` (all workspaces) | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1110 tests** green (unchanged; no offline rule moved) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/surface.runtime.test.tsx` | 1 file / **10 tests** green (was 9) |
| `… test:runtime runtime/surface.runtime.test.tsx runtime/surface-trigger.runtime.test.tsx runtime/theme-matrix.runtime.test.tsx` | 3 files / **46 tests** green |
| `nub run lint` | exit 0 |
| `nub run fmt` | only `apps/docs/src/components/docs/demos.tsx` (outside this workstream; already recorded in `TODO.md`) |
| `nub run test` (all workspaces) | exit 0 — primitives 75 files / 1110, components 32 / 308, the rest green |

### 7.1 The measured edge

Recording adapter, focusable `Surface` + a text `Input` in one window; the
surface's painted `boxShadow` is the tracker's focus state:

| Moment | Tracker | `calls` (before) | `calls` (after) |
| ------ | ------- | ---------------- | --------------- |
| mounted, unfocused | none | `create, resize:120x80, visible:true, theme:light` | same |
| `Tab` onto the surface | `surface`, ring painted | `…, focus` | `…, focus` |
| `Tab` onto the input | `after`, ring gone | `…, focus` — **no release** | `…, focus, blur` (last op) |
| `Tab` back onto the surface | `surface`, ring painted | `…, focus` | `…, blur, focus` |
| static surface beside it | never focused | `create, resize:40x20, visible:true, theme:light` | same (no `blur`, no `focus`) |

### 7.2 Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| The old one-way focus effect restored | the new native case timed out waiting for "the adapter blur" (1 failed / 9 passed) |
| `blur` removed from `rasterSurface` | `check-types` exit 1, `TS2741: Property 'blur' is missing … but required in type 'SurfaceAdapter'` |

Dropping the `adapterFocused` gate was measured to change nothing in these
cases (the `live` guard already suppresses a mount-time call), so it is recorded
as the structural "earned blur" rule rather than as a claimed mutation.

## 8. Acceptance

- `SurfaceAdapter` declares `blur`, `SurfaceOperation` names it, and
  `rasterSurface` implements it.
- A focusable surface records `focus` when the host gains focus and `blur` when
  it loses it, in that order, repeatably; an unfocused or non-focusable surface
  records neither.
- The new native case fails against the one-way implementation; the exact-list
  cases fail against a gate-less implementation.
- `surface.mdx`, the inventory row, `TODO.md` and this index record the edge;
  `check-types`, the offline suite, the scoped runtime files, `lint` and `fmt`
  are green with exact totals recorded in §7.
