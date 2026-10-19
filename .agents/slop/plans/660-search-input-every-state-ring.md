# 660 — Search input: the focus ring follows the field in every state

**Phase:** F (interaction truth and focus visibility)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 110 (package and harness), plan 117 (verification gate),
plan 388 (`autoFocus` seeds the focus state), plan 394 (disabled is inert),
plan 536/540 (this binding delivers no React `focus`/`blur` for a native focus
change), plan 613 (the measured-sampler precedent), plan 608 (the focus-signal
claim on every focusable page), plan 659 (this field's first sampler).
**Status:** done 2026-10-19 — `SearchInput` sampled the renderer only while it
had text, so an empty field's ring was wrong in three measured ways (no ring on
a programmatic focus, a stale ring after a programmatic blur, a ring kept when
disabled). The sampler now runs in every enabled state, the disabled branch
clears both focus states, and the ring never paints while disabled. 3 native
cases (Search input 18), all red on the old source; docs, `COMPONENTS.md`,
`TODO.md`, `PLAN.md` D30 and the inventory synced.

## 1. The bug

Plan 659 scoped the 50 ms focus sample to `hasText`, on the reasoning that an
empty field has no clear control to focus and "an interval would only burn
ticks". That reasoning left the field's own ring wrong whenever the field is
empty, and it ignored the disabled hand-off.

Measured on this host, 2026-10-19, in the real `TestRenderer` with a throwaway
probe (deleted; the same fixtures are the regression tests below):

| Fixture / step | Focused host | Ringed surfaces | Expected |
| -------------- | ------------ | --------------- | -------- |
| `SearchInput autoFocus` (empty), after mount | `search` | `[undefined]` | `[undefined]` |
| same, `focusNext()` to the next field, after 200 ms | next field | `[undefined]` | `[]` |
| `SearchInput` (empty), `focusElement(search)`, after 200 ms | `search` | `[]` | `[undefined]` |
| `SearchInput autoFocus defaultValue="abc"`, rerendered `disabled` | `search` | `[undefined]` | `[]` |

Three user-visible consequences:

1. **A stale ring on an empty field.** A native focus move delivers no React
   `blur` (plans 536/540), so the seeded ring never clears. This is the same
   defect plan 659 fixed for a non-empty field, still present when the user
   empties the field or never typed.
2. **No ring on an empty field focused by code or a click.** A live click and
   `autoFocus` move native focus without running React's `onFocus` (plan 367
   §1), so `focusElement` on an empty field paints nothing — the field looks
   unfocused while it is the focused host.
3. **A disabled field keeps the ring.** The sampler's disabled branch clears
   only `clearFocused`; `focused` stays true, and the surface ring does not
   consult `disabled`. Plan 394's disabled contract is "no hover, no press, no
   ring, no tab stop".

The docs currently admit half of this: `docs/search-input.mdx` says the sampler
"does not exist for an empty field". That sentence stops being true with the
fix.

## 2. Scope

**In scope**

- `packages/components/src/search-input.tsx`: run the sampler while the field is
  enabled, independent of whether it has text; clear **both** focus states when
  the field is disabled; never paint the surface ring while disabled.
- Three native behaviour tests: the empty-field programmatic focus, the
  empty-field focus loss, and the disable hand-off (including the public
  `focused` state).
- Docs, `COMPONENTS.md`, the plan index, `PLAN.md` D30, `TODO.md` and the
  inventory test count.

**Out of scope — do not touch**

- No new public prop or exported type. `SearchInputState.focused` keeps its
  meaning: the field owns focus, including its clear control.
- No change to the value/clear/Escape/Enter contract, the controlled contract,
  the caller ref, or the clear control's own ring behaviour.
- No refactor of `InlineEdit`'s sampler; the shared native-focus tracker remains
  a pending `packages/primitives` interlock.
- No playground edit (owned by the playground workstream).

## 3. Exact implementation

### 3.1 `packages/components/src/search-input.tsx`

1. Delete the now-unused `hasText` local. The clear control is already gated by
   `value === "" || disabled` in the render.

2. Make the sampler run for every enabled field, and make the disabled branch
   clear both states:

   ```tsx
   useEffect(() => {
     if (disabled || renderer == null) {
       setClearFocused(false);
       setFocused(false);
       return;
     }
     const read = (): void => {
       const focusedId = renderer.getFocusedElementId?.() ?? null;
       const clearId = clearControl.current?.id ?? null;
       const inputId = input.current?.id ?? null;
       const onClear = clearId !== null && focusedId === clearId;
       setClearFocused(onClear);
       // No React focus/blur is delivered for a native focus change, so the
       // sample is the only signal in either direction (plans 536/540).
       setFocused(focusedId !== null && (focusedId === inputId || onClear));
     };
     read();
     const timer = setInterval(read, FOCUS_SAMPLE_MS);
     return () => clearInterval(timer);
   }, [disabled, renderer]);
   ```

   The old condition was `!hasText || disabled || renderer == null`; only the
   `hasText` term and the missing `setFocused(false)` change.

3. Paint the surface ring only while enabled:

   ```tsx
   ...(focused && !clearFocused && !disabled ? focusRing(theme) : {}),
   ```

   The effect clears `focused` in a later commit, so the `!disabled` guard is
   what makes the first render after the prop flips truthful.

4. Update the module header: the sampler runs while the field is enabled, so the
   ring is truthful for an empty field and after a focus move, and a disabled
   field paints none.

### 3.2 What must not change

- `value`/`defaultValue` ownership, `onValueChange`, `onClear`, `onSubmit`,
  Enter/Escape handling and the plan-514 claim.
- The clear control: shown only for non-empty enabled text, Space on release,
  its own ring and its focus return to the input.
- `autoFocus` seeding the initial `focused` state; the caller's `style` callback
  still receives `{ disabled, focused }` and is applied last.
- `SearchInputState.focused` remains true while either the input or the clear
  control holds focus.

### 3.3 Cost note

An enabled `SearchInput` now always runs one 50 ms interval. That is the same
per-component cost `InlineEdit` pays only while an edit is open and the search
field already paid whenever it had text; it is the honest local stand-in until
`packages/primitives` exports the shared native-focus tracker (recorded in
`TODO.md` → Interlocks). The interval is cancelled on unmount and while
disabled.

## 4. Test plan

Add three cases to `packages/components/src/behaviour/search-input.test.tsx`
(after the existing plan-659 pair). Use the shared `until` helper from
`../internal/interaction.js`; every suite needs the locally built `darwin-x64`
binding (plan 140).

### 4.1 The empty field paints its ring on a programmatic focus

```tsx
/**
 * The bug this guards (plan 660): the sampler only ran while the field had
 * text, so `focusElement` on an empty field moved native focus without
 * painting the ring, because the binding delivers no React `onFocus`.
 */
it("paints the ring on an empty field focused by code", async () => {
  const search = renderComponent(
    <div style={{ width: 360, padding: 40, gap: 8 }}>
      <SearchInput testId="search" />
      <SearchInput testId="other" />
    </div>,
  );
  const ringed = (): ReadonlyArray<string | undefined> =>
    search.renderer
      .findByType("div")
      .filter((div) => div.style?.boxShadow !== undefined)
      .map((div) => div.testId);

  search.renderer.focusElement(search.renderer.findByTestId("search")?.id ?? -1);

  await until(() => ringed().length === 1);

  expect(ringed()).toEqual([undefined]);
  expect(focusedTestId(search)).toEqual(Option.some("search"));

  search.unmount();
});
```

At `HEAD`: `ringed()` stays `[]`, so the `until` budget expires and the
assertion fails.

### 4.2 The empty field loses its ring when focus leaves

```tsx
/**
 * The bug this guards (plan 660): the seeded ring on an empty field never
 * cleared after a native focus move, because no React `blur` is delivered
 * (plans 536/540) and the sampler did not run without text.
 */
it("clears the ring when an empty field loses focus", async () => {
  const search = renderComponent(
    <div style={{ width: 360, padding: 40, gap: 8 }}>
      <SearchInput testId="search" autoFocus />
      <SearchInput testId="other" />
    </div>,
  );
  const ringed = (): ReadonlyArray<string | undefined> =>
    search.renderer
      .findByType("div")
      .filter((div) => div.style?.boxShadow !== undefined)
      .map((div) => div.testId);

  expect(ringed()).toEqual([undefined]);

  search.renderer.focusNext();

  await until(() => ringed().length === 0);

  expect(ringed()).toEqual([]);
  expect(focusedTestId(search)).toEqual(Option.some("other"));

  search.unmount();
});
```

At `HEAD`: `ringed()` stays `[undefined]`.

### 4.3 A field that becomes disabled drops the ring and the focus state

```tsx
/**
 * The bug this guards (plan 660, plan 394): disabling a focused field cleared
 * only the clear control's state, so the surface kept the ring and the public
 * `focused` state stayed true on a control the user cannot edit.
 */
it("drops the ring when a focused field becomes disabled", async () => {
  const states: Array<boolean> = [];
  const search = renderComponent(
    <div style={{ width: 360, padding: 40 }}>
      <SearchInput
        testId="search"
        autoFocus
        defaultValue="abc"
        style={(state) => {
          states.push(state.focused);
          return {};
        }}
      />
    </div>,
  );
  const ringed = (): ReadonlyArray<string | undefined> =>
    search.renderer
      .findByType("div")
      .filter((div) => div.style?.boxShadow !== undefined)
      .map((div) => div.testId);

  expect(ringed()).toEqual([undefined]);

  search.rerender(
    <div style={{ width: 360, padding: 40 }}>
      <SearchInput
        testId="search"
        autoFocus
        defaultValue="abc"
        disabled
        style={(state) => {
          states.push(state.focused);
          return {};
        }}
      />
    </div>,
  );

  await until(() => ringed().length === 0);

  expect(ringed()).toEqual([]);
  expect(states.at(-1)).toBe(false);

  search.unmount();
});
```

At `HEAD`: the ring stays and `states.at(-1)` is `true`. The ring assertion also
fails if only the `!disabled` style guard is added without the state fix, and
the state assertion fails if only the style guard is added.

### 4.4 Commands and expected results

```sh
cd packages/components

# Before the source fix: the three new cases are red for the reasons above.
nub run test:behaviour src/behaviour/search-input.test.tsx

# After the fix: 18 passed.
nub run test:behaviour src/behaviour/search-input.test.tsx

# The unit suite, the type gate and the package checks stay green.
nub run test
nub run check-types
```

Both-direction proof after the fix:

- restore the `hasText` term in the effect condition → 4.1 and 4.2 fail;
- delete `setFocused(false)` from the disabled branch → 4.3's state assertion
  fails;
- delete `!disabled` from the ring condition → 4.3's ring assertion fails;
- delete `setFocused(...)` from `read` entirely → 4.1 fails (and plan 659's
  case 2 fails).

If the behaviour suite reports `unsupported-host`, **STOP** and report; never
claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/search-input.mdx`
  - Theming: say the sample runs while the field is enabled, so an empty field
    and the clear control both ring truthfully.
  - Style by state: say `focused` follows the natively focused host in every
    enabled state and is false while disabled.
  - Accessibility and limitations: keep the "Focus cues are seeded by
    `autoFocus`" claim (the inventory requires it), replace the
    "sampler does not exist for an empty field" sentence with the shipped rule
    (the sampler runs while enabled; a disabled field paints none), and name
    plan 660.
  - Verification: `(15 tests)` → `(18 tests)` and name the three new cases.
- `COMPONENTS.md`, Search inputs row: `15 native behaviour tests` → `18`; extend
  the ring sentence to "in every enabled state, including an empty field and
  after a focus move; a disabled field paints none (plans 659/660)".
- `packages/components/src/search-input.tsx`: `searchInputMeta.limitations` gains
  one line recording the 50 ms sample as the local stand-in for a shared
  tracker.
- `.agents/slop/plans/README.md`: index this plan and mark it done when shipped.
- `PLAN.md` D30: append that the components workstream took `660` (checked
  across every worktree: no `660` plan exists).
- `TODO.md`: add and tick the hardening task under the Tier 2 rows.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- any of the three new cases passes **before** the source fix — the measurement
  or the assertion is wrong, so the bug is not proven;
- `testId="other"` is not the second field's input in the fixture (record the
  focused ids and the tree, then stop);
- the always-on sampler makes the suite flaky under load (the `until` budget is
  ~2 s; a 50 ms tick must land well inside it) — record the timing and stop
  rather than raising the interval blindly;
- the behaviour suite reports `unsupported-host`;
- another worktree has claimed `660` (re-check
  `find /Users/cyberistic/GPUIXUI/workspaces -path '*/.agents/slop/plans/660-*'`);
  take the next free number and record it in `PLAN.md` D30;
- `check-types`, `check-tests`, `check` or `lint` fails for a reason outside
  these files.

## 7. Acceptance

- [x] All three new cases fail at `HEAD` and pass with the fix; the existing 15
      SearchInput cases stay green.
- [x] The sampler runs for every enabled field and is cancelled on unmount and
      while disabled; no interval runs for a disabled field.
- [x] A disabled field paints no ring and reports `focused: false` even if it
      becomes disabled while natively focused.
- [x] Docs, `COMPONENTS.md`, the plan index, `PLAN.md`, `TODO.md` and the
      inventory state the shipped behaviour and the 18-test count.
- [x] `nub run --filter @gpuixui/components test`,
      `nub run --filter @gpuixui/components check-types` and the targeted
      behaviour file pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
