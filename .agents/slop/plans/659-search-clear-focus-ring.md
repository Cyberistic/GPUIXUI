# 659 — Search input: the clear control paints the focus ring, and the field's ring follows focus

**Phase:** F (interaction truth and focus visibility)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 110 (package and harness), plan 117 (verification gate),
plan 388 (`autoFocus` seeds the focus state), plan 514 (the Escape claim),
plan 522 (every focusable part paints a ring), plan 536/540 (this binding
delivers no React `focus`/`blur` for a native focus change), plan 613 (the
measured-sampler precedent), plan 649 §8 (the measurement that recorded this
defect).
**Status:** implemented — the clear control is a tab stop that painted no ring,
and the field surface kept its ring after focus left it. `SearchInput` now
samples the renderer's focused host while there is text to clear, so the ring
follows the input, the clear control or neither. 2 native cases (Search input
15); both fail on the old source. Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md`
and the inventory are synced.

## 1. The bug

`SearchInput`'s clear control is a real tab stop:

```tsx
<div role="button" aria-label="Clear search" tabIndex={0} ... />
```

It takes native focus, but it has no `focused` state and no `focusRing`, so a
keyboard user who tabs from the field to the clear control gets no visible cue
that the next Enter/Space will clear the query. Plan 522 fixed this on every
other button-shaped part; plan 649 §8 recorded the miss.

Measured on this host, 2026-10-19, in the real `TestRenderer`
(`SearchInput autoFocus defaultValue="abc"`):

| Step | Focused host | Field surface `boxShadow` | Clear `boxShadow` |
| ---- | ------------ | ------------------------- | ----------------- |
| after mount | input (`search`) | ring | — |
| `focusNext()` | clear (`search-clear`) | ring | — |

So two things are wrong:

1. the clear control never paints a ring;
2. the field surface keeps its ring after focus leaves the input, because the
   binding delivers no React `blur` for a native focus change (plans 536/540).
   A real window is state-dependent; the headless renderer is the reproducible
   case.

The same measurement shows `focusNext()` is a faithful stand-in for a native
focus move: the focused id changes and **no** React `focus`/`blur` runs, exactly
the state plan 613 had to handle for `InlineEdit`. A test for the ring is
therefore possible without a binding that delivers focus events, by reading
`renderer.getFocusedElementId()` on a short interval.

## 2. Scope

**In scope**

- `packages/components/src/search-input.tsx`: while the clear control exists
  (non-empty, enabled), sample the renderer's focused host every 50 ms. The
  field's ring paints only while the input holds focus; the clear control paints
  its own ring while it holds focus; both rings clear when focus leaves the
  field.
- Two native behaviour tests: the clear ring (the bug guard) and the ring
  leaving the field when focus moves outside (the stale-ring guard), plus the
  return path inside the second.
- Docs, `COMPONENTS.md`, the plan index, `PLAN.md` D30 and `TODO.md`.

**Out of scope — do not touch**

- No new public prop or exported type. `SearchInputState.focused` keeps its
  meaning: the field owns focus, including its clear control.
- No change to the Escape/Enter/clear contract, the controlled contract, the
  caller ref, or the disabled contract.
- No refactor of `InlineEdit`'s sampler. A shared native-focus tracker is
  already a pending `packages/primitives` interlock; this plan keeps the same
  local pattern until that exists.
- No playground edit (owned by the playground workstream).

## 3. Exact implementation

### 3.1 `packages/components/src/search-input.tsx`

1. Add the sampling interval beside the component, after the imports:

   ```ts
   /** How often the field asks the renderer which host holds focus, ms. */
   const FOCUS_SAMPLE_MS = 50;
   ```

2. Add the clear control's instance ref and the two focus states beside the
   existing `focused` state:

   ```ts
   const [focused, setFocused] = useState(autoFocus && !disabled);
   const [clearFocused, setClearFocused] = useState(false);
   const clearControl = useRef<PublicInstance | null>(null);
   ```

   The existing `input` ref already holds the input's instance. Add
   `useEffect` to the React import.

3. The sampler runs only while there is a clear control to focus — when there
   is no text the ring keeps the event-driven/`autoFocus` behaviour the rest of
   the library uses, and an interval would only burn ticks:

   ```tsx
   const hasText = value !== "" && !disabled;

   useEffect(() => {
     if (!hasText || disabled || renderer == null) {
       setClearFocused(false);
       return;
     }
     const read = (): void => {
       const focusedId = renderer.getFocusedElementId?.() ?? null;
       const clearId = clearControl.current?.id ?? null;
       const inputId = input.current?.id ?? null;
       const onClear = clearId !== null && focusedId === clearId;
       setClearFocused(onClear);
       // A native focus change delivers no React blur (plans 536/540), so the
       // sampler is the only signal that the field lost focus.
       setFocused(focusedId !== null && (focusedId === inputId || onClear));
     };
     read();
     const timer = setInterval(read, FOCUS_SAMPLE_MS);
     return () => clearInterval(timer);
   }, [disabled, hasText, renderer]);
   ```

   `setState` with the same value is a React no-op, so the steady state does not
   rerender.

4. Paint the surface ring only while the **input** holds focus, so the clear
   control's own ring is the one cue:

   ```tsx
   ...(focused && !clearFocused ? focusRing(theme) : {}),
   ```

   The public `state.focused` stays `focused` (the field owns focus either way).

5. Give the clear control its ref and ring, mirroring `TimePickerClear`:

   ```tsx
   ref={clearControl}
   ...
   ...(clearFocused ? focusRing(theme) : {}),
   ```

   The ref needs no merge: it is internal and the control is not a public ref
   target.

6. Update the module header: one sentence saying the ring follows the natively
   focused host, sampled because the binding delivers no focus/blur events.

### 3.2 What must not change

- `value`/`defaultValue` ownership, `onValueChange`, `onClear`, `onSubmit`,
  Enter/Escape handling and the plan-514 claim.
- The disabled field: no clear control, no ring, no sampling.
- `autoFocus` seeding the initial `focused` state.
- The caller's `style` callback still receives `{ disabled, focused }` and is
  applied to the surface last.

## 4. Test plan

Add two cases to `packages/components/src/behaviour/search-input.test.tsx`. Use
the shared `until` helper from `../internal/interaction.js` (already exported)
instead of a fixed sleep; both assertions remain after the wait.

### 4.1 The bug guard — the clear control paints the focus ring

```tsx
/**
 * Focus visibility (plan 522, recorded by plan 649 §8). The bug this guards:
 * the clear control was a tab stop that took native focus and painted no ring,
 * so a keyboard user could not see that the next Space would clear the query.
 */
it("paints the focus ring on the clear control", async () => {
  const search = renderComponent(
    <div style={{ width: 360, padding: 40 }}>
      <SearchInput testId="search" autoFocus defaultValue="abc" />
    </div>,
  );
  const clear = search.renderer.findByTestId("search-clear");
  expect(clear).toBeDefined();

  search.renderer.focusNext(); // input -> clear; no React focus event

  await until(
    () =>
      search.renderer.findByTestId("search-clear")?.style.boxShadow !==
      undefined,
  );

  expect(focusedTestId(search)).toEqual(Option.some("search-clear"));
  expect(
    search.renderer.findByTestId("search-clear")?.style.boxShadow,
  ).toBeDefined();
  // The field surface no longer owns focus, so only the clear control rings.
  expect(
    search.renderer
      .findByType("div")
      .filter((div) => div.style?.boxShadow !== undefined)
      .map((div) => div.testId),
  ).toEqual(["search-clear"]);

  search.unmount();
});
```

At `HEAD`: no ring on the clear control, and the surface div still rings, so
both the ring assertion and the "only the clear control" assertion fail.

### 4.2 The stale-ring guard — leaving the field clears both rings and returning restores the field's

```tsx
/**
 * The bug this guards (plans 536/540): a native focus change delivers no React
 * blur, so the field surface kept its ring after focus left it.
 */
it("moves the focus ring with the natively focused host", async () => {
  const search = renderComponent(
    <div style={{ width: 360, padding: 40, gap: 8 }}>
      <SearchInput testId="search" autoFocus defaultValue="abc" />
      <SearchInput testId="other" />
    </div>,
  );
  // `findByTestId("search")` is the inner input; the ring is painted by the
  // field surface, the anonymous div that carries a `boxShadow`.
  const ringed = (): ReadonlyArray<string | undefined> =>
    search.renderer
      .findByType("div")
      .filter((div) => div.style?.boxShadow !== undefined)
      .map((div) => div.testId);

  expect(ringed()).toEqual([undefined]);

  search.renderer.focusNext(); // input -> clear
  search.renderer.focusNext(); // clear -> the other field's input

  await until(() => ringed().length === 0);

  expect(ringed()).toEqual([]);

  search.renderer.focusElement(
    search.renderer.findByTestId("search")?.id ?? -1,
  );

  await until(() => ringed().length === 1);

  expect(ringed()).toEqual([undefined]);

  search.unmount();
});
```

Why the `div` filter: `findByTestId("search")` is the `<input>`, whose `style`
never carries the ring; the ring belongs to the surrounding surface `div`, which
has no `testId` because `testId` is documented as the input's. The only ringed
`div` before the move is that surface, so `[undefined]` is the expected shape.

At `HEAD`: after the two `focusNext()` calls the surface still rings, so
`ringed().length` never reaches `0`, the `until` budget expires, and the
assertion fails. Without the `setFocused` line in the sampler (a mutation), the
same case fails; without `setClearFocused(false)` the clear control keeps its
ring on the return path.

Commands and expected results:

```sh
cd packages/components

# Before the source fix: the two new cases fail (red) for the reasons above.
nub run test:behaviour src/behaviour/search-input.test.tsx

# After the fix: 15 passed.
nub run test:behaviour src/behaviour/search-input.test.tsx

# The unit suite and types are unaffected but must stay green.
nub run test
nub run check-types
```

Both-direction proof after the fix:

- delete the `...(clearFocused ? focusRing(theme) : {})` line → case 1 fails;
- delete `setFocused(...)` from `read` → case 2 fails (the surface never
  clears);
- delete `setClearFocused(false)`/the `onClear` branch → case 1 or 2 fails
  (the clear ring never appears, or never clears).

The behaviour suite needs a host with a GPUix native binding; on this Intel Mac
plan 140's locally built `darwin-x64` binding is installed. If the binding is
missing, **STOP** and report `unsupported-host` — never claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/search-input.mdx`
  - "Theming": add that the ring follows the natively focused host: the field
    surface while the input holds focus, the clear control while it holds focus,
    and neither when focus leaves. Name the 50 ms sample and the plan number.
  - "Accessibility and limitations": replace the blanket "a ring may not paint
    when focus moves by code" sentence with the measured two-state claim: the
    sampler keeps this field's ring truthful, while other components still rely
    on `autoFocus` seeding and React focus events (plans 536/540).
  - "Verification": `(13 tests)` → `(15 tests)` and name the two new cases.
- `COMPONENTS.md`, Search inputs row: add "the focus ring follows the input and
  the clear control through a measured focus sample (plan 659)" and
  "13 native behaviour tests" → "15 native behaviour tests".
- `.agents/slop/plans/README.md`: index this plan after 657.
- `PLAN.md` D30: append that the components workstream took `659` (658 is the
  tokens workstream's recipe plan; 659–699 were free when this branch claimed
  it, checked across every worktree).
- `TODO.md`: tick "The search field's clear control paints no focus ring" and
  record what closed the block (the measured sampler, not a focus-event
  binding); keep the interlock about a shared tracker from `primitives`.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the new case 1 passes **before** the source fix — the measurement or the
  assertion is wrong, so the bug is not proven;
- `focusNext()` does not move focus from the input to the clear control in the
  fixture (record the focused ids and the tree, then stop);
- the sampler's interval makes the suite flaky under load (the `until` budget is
  ~2 s; a 50 ms tick must land well inside it) — record the timing and stop
  rather than raising the interval blindly;
- the behaviour suite reports `unsupported-host`;
- another worktree has claimed `659` (re-check
  `find /Users/cyberistic/GPUIXUI/workspaces -path '*/.agents/slop/plans/659-*'`);
  take the next free number and record it in `PLAN.md` D30;
- `check-types` or `check-tests` fails for a reason outside these files.

## 7. Acceptance

- [x] Case 1 fails at `HEAD` and passes with the fix; the clear control paints
      the token ring and the surface does not.
- [x] Case 2 fails at `HEAD` (stale surface ring) and passes with the fix;
      leaving the field clears both rings, returning restores the surface's.
- [x] The existing 13 SearchInput cases stay green (clear/refocus, Escape,
      Enter, disabled, controlled, `autoFocus`).
- [x] Docs, `COMPONENTS.md`, the plan index, `PLAN.md`, `TODO.md` and the
      inventory state the shipped behaviour and the 15-test count.
- [x] `nub run --filter @gpuixui/components test`,
      `nub run --filter @gpuixui/components check-types` and the targeted
      behaviour file pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
