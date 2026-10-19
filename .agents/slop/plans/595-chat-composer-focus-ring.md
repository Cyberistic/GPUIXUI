# 595 — Chat composer: a focusable field that paints no focus ring

**Workstream:** components (Tier 2 composition and feedback; package `packages/components`)
**Phase:** C/F — focus-state hardening after the inventory closed
**Depends on:** 207 (Chat), 332 (activation contract), 388 (`autoFocus` state),
514 (Escape claim), 522 (every focusable part paints the ring), 523 (overlay
fields), 592 (last components plan; `593`/`594` are the playground's, so `595` is
the next free number after checking every worktree — `PLAN.md` D30)

**Files owned:** `packages/components/src/chat.tsx`,
`packages/components/src/behaviour/chat.test.tsx`,
`packages/components/docs/chat.mdx`, `COMPONENTS.md` (Chat row only),
`TODO.md` (this workstream only), `PLAN.md` (D30 paragraph only), this plan,
`.agents/slop/plans/README.md` (index row only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Plan 522 established the package rule: **every focusable part paints the token
focus ring**. Its sweep covered seven controls, and plan 523 covered the two
overlay search fields. `ChatComposer` landed in plan 207, after the sweep was
designed, and it is the one focusable field the rule never reached.

Measured on this host (2026-10-19, `TestRenderer`, `nub`-installed binding) with

```tsx
<Chat label="Assistant" status={{ _tag: "idle" }} onSubmit={() => undefined}>
  <ChatComposer label="Message" testId="composer" autoFocus />
</Chat>
```

the renderer reports `getFocusedElementId() === composer.id` (the `<textarea>`
really holds native focus) while `findByTestId("composer")?.style` is

```
{ backgroundColor: "#11141A", borderColor: "#2A303B", borderRadius: 6,
  borderWidth: 1, color: "#EEF1F5", flexGrow: 1, fontFamily: ".SystemUIFont",
  fontSize: 14, fontWeight: 400, lineHeight: 20, paddingBottom: 6,
  paddingLeft: 8, paddingRight: 8, paddingTop: 6 }
```

— no `boxShadow`. GPUix 0.10.0 has no `outline*` and no `focusVisible`
(COMPONENTS.md, "Focus state"), so a focused composer looks exactly like an
unfocused one: the user cannot see where they are typing.

This is not a runtime limitation. `FieldInput` and `SearchInput` paint the same
ring on the same kind of host element; the composer simply never tracked focus.

## 2. Contract (do not re-litigate)

1. **The textarea paints the ring itself.** The ring is the existing
   `focusRing(theme)` spread on the `<textarea>`'s style, before the caller's
   `style` (the caller still merges last, as everywhere else).
2. **`autoFocus` seeds the state.** The runtime focuses an `autoFocus` element
   after React's effects and never dispatches React's `onFocus` (plans 388, 536);
   a ring computed only from `onFocus` would never appear on the measured path.
   Seed `focused` from `autoFocus`.
3. **Later focus changes are tracked.** `onFocus` sets `true`, `onBlur` sets
   `false`, and the caller's `onFocus`/`onBlur` still run (compose, never
   replace — plan 331's rule).
4. **No ring while unfocused.** A composer without `autoFocus` paints no
   `boxShadow`. The ring is never unconditional.
5. **Nothing else changes.** Enter/Send, Shift+Enter, Escape/Stop, the draft
   contract, the structure and the accessible name stay exactly as they are.
6. **No disabled state is invented.** `ChatComposer` has no `disabled` prop; the
   status contract owns send/stop. Do not add one in this plan.

## 3. Exact changes

### 3.1 `packages/components/src/chat.tsx`

In the imports, add `focusRing` to the existing `./internal/theme.js` import
(the line currently importing `textStyle, toneSurface, useTheme`).

In `ChatComposerProps`, no new prop is needed: `autoFocus`, `onFocus` and
`onBlur` come from `Props`. Keep the interface as it is.

In the `ChatComposer` destructure, add `autoFocus = false`, `onFocus`, `onBlur`
next to `onKeyDown`. The component currently spreads `...rest` onto the
`<textarea>`; after the change these four are explicit and the rest is unchanged.

Add the focus state after the `useControllableState` call:

```tsx
// The runtime focuses `autoFocus` after React's effects, so `onFocus` never
// runs on mount; seed the state or the ring never lights (plans 388, 536).
const [focused, setFocused] = useState(autoFocus);
```

Add `useState` to the existing React import (`Children, createContext,
useContext, type ReactNode`).

On the `<textarea>`:

- pass `autoFocus={autoFocus}` explicitly (it currently arrives via `rest`);
- add `onFocus` / `onBlur` handlers that set the state and then call the
  caller's handler;
- add `...(focused ? focusRing(theme) : {})` to the style object, immediately
  after `color: theme.colors.foreground` and before `mergeStyles`' second
  argument (so a caller `style` still wins).

The resulting textarea block is:

```tsx
<textarea
  {...rest}
  aria-label={label}
  placeholder={placeholder}
  value={draft}
  minRows={1}
  maxRows={6}
  autoFocus={autoFocus}
  onChange={(event) => setDraft(event.value ?? "")}
  onSubmit={(event: EventPayload) => {
    if (event.modifiers?.shift === true) return;
    send();
  }}
  onKeyDown={(event: EventPayload) => {
    if (isDismiss(event) && canStop(status)) {
      claimEvent(event);
      stop();
    }
    onKeyDown?.(event);
  }}
  onFocus={(event) => {
    setFocused(true);
    onFocus?.(event);
  }}
  onBlur={(event) => {
    setFocused(false);
    onBlur?.(event);
  }}
  style={mergeStyles(
    {
      ...textStyle(theme, "body"),
      // … every existing rule unchanged …
      color: theme.colors.foreground,
      ...(focused ? focusRing(theme) : {}),
    },
    style,
  )}
/>
```

Do not move the ring to the surrounding row: the row contains Send/Stop and
would draw a ring around controls that do not hold focus.

### 3.2 `packages/components/src/behaviour/chat.test.tsx`

Add two native cases at the end of the `describe("Chat", …)` block. Imports:
add `focusRing, darkTheme, lightTheme` from `../internal/theme.js` and
`type TestTheme` from `../internal/test-root.js` (follow `field.test.tsx`'s
pattern; `renderComponent` already comes from there). Add
`focusedTestId` from `../internal/interaction.js` if it is not already imported
(check first; `clickCentreOf, finishMotion` are there today).

Case 1 — **paints the focus ring on the focused composer in both themes**:

```tsx
it("paints the focus ring on the focused composer in both themes", () => {
  const assertTheme = (theme: TestTheme): void => {
    const palette = theme === "dark" ? darkTheme : lightTheme;
    const chat = renderComponent(
      <Chat label="Assistant" status={idle} onSubmit={() => undefined}>
        <ChatComposer label="Message" testId="composer" autoFocus />
      </Chat>,
      theme,
    );

    expect(focusedTestId(chat)).toEqual(Option.some("composer"));
    expect(chat.renderer.findByTestId("composer")?.style.boxShadow).toEqual(
      focusRing(palette).boxShadow,
    );

    chat.unmount();
  };

  assertTheme("dark");
  assertTheme("light");
});
```

(`Option` is already imported? Check the file. If not, import
`* as Option from "effect/Option"`.)

This case **fails on `HEAD`**: `style.boxShadow` is `undefined` (measured above).

Case 2 — **paints no ring on an unfocused composer**:

```tsx
it("paints no ring on a composer that does not hold focus", () => {
  const chat = renderComponent(
    <Chat label="Assistant" status={idle} onSubmit={() => undefined}>
      <ChatComposer label="Message" testId="composer" />
    </Chat>,
    "light",
  );

  expect(chat.renderer.findByTestId("composer")?.style.boxShadow).toBeUndefined();

  chat.unmount();
});
```

This pins contract §2.4 and **fails if the ring is made unconditional**.

Also update the file's header comment: append the two guarded bugs (a focusable
composer with no focus cue; a ring painted while unfocused).

### 3.3 `packages/components/docs/chat.mdx`

- **Theming** (around line 108): add that the composer paints the token focus
  ring while it holds focus, exactly like `FieldInput`; the ring is a separate
  signal from the border.
- **Accessibility** (around line 117): add a bullet — the composer paints the
  focus ring on native focus (seeded from `autoFocus` because 0.10.0 delivers no
  React focus event for it).
- **Verification** (line ~137): raise `(10 tests)` to `(12 tests)` and name the
  two new cases ("paints the ring while focused; paints none while unfocused").
- **Limitations**: no new limitation. Do not claim a disabled state.

### 3.4 `COMPONENTS.md` — Chat row only

The row currently says "10 native behaviour tests + a transition suite, both
themes". Change the count to **12** and append one clause:

> the composer paints the token focus ring while it holds native focus, seeded
> from `autoFocus` because the runtime focuses after React's effects and sends no
> React focus event for it (plan 595)

Keep every other claim and limitation unchanged.

### 3.5 `TODO.md`, `PLAN.md`, plan index

- `TODO.md`: add one ticked line at the end of the **Tier 2 hardening after the
  inventory closed** list:

  ```
  - [x] The chat composer paints the focus ring — plan 595: measured that an
    `autoFocus` `<textarea>` was the focused element (`focused=composer`) yet
    painted no `boxShadow`, so the one focusable field after plan 522 had no
    focus cue; it now seeds `focused` from `autoFocus`, composes the caller's
    `onFocus`/`onBlur` and paints the token ring only while focused; 2 native
    cases (Chat 12), a no-ring pin, both-direction proof; docs, `COMPONENTS.md`
    and the inventory synced (owner: components)
  ```

- `PLAN.md` D30: append `595` as the next components overflow plan (`593`/`594`
  are the playground's).

- `.agents/slop/plans/README.md`: add the `595` row after `592` with status
  `done` once the implementation and gates pass. While implementing, add it with
  the title only, then update the status last.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
```

Expected: exit `0`, no output.

```sh
nub run --filter @gpuixui/components test
```

Expected: all 44 unit files pass (444 tests; the Chat logic suite is unchanged).

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected: **Chat 12/12**; the full suite moves from `750 passed / 35 failed
(785)` to **`752 passed / 35 failed (787)`**. The 35 failures are the known
plan-540 binding defects (34 position/focus-box, 1 scroll) and must not change.
If any other case fails, stop and report it.

```sh
nub run check
nub run lint
nub run test
```

Expected: exit `0` for each (inventory, manifest, exports, check-tests, fmt and
tsc included).

## 5. Test plan and both-direction proof

1. Write the two native cases first and run only the Chat file:

   ```sh
   cd packages/components
   ./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
     src/behaviour/chat.test.tsx
   ```

   Expected before the fix: case 1 fails (`boxShadow` is `undefined`), case 2
   passes. Record the output in the commit message or the plan's status row.

2. Implement §3.1. Re-run: both pass (`12/12`).

3. **Mutation proofs** (make the change, run the file, revert):
   - Delete `...(focused ? focusRing(theme) : {})` → case 1 fails, case 2 passes.
   - Make the ring unconditional (`...focusRing(theme)`) → case 2 fails, case 1
     passes.
   - Seed `useState(false)` instead of `useState(autoFocus)` → case 1 fails (the
     runtime never dispatches `onFocus`), case 2 passes.

4. Run the full behaviour suite and the three repo gates.

5. Restore the source and re-run the Chat file and the gates once more.

`scripts/verify-two-directions.sh` uses `jj`, which is not installed (recorded in
`TODO.md`); use the mutations above and report them instead.

## 6. STOP conditions

Stop and report, do not improvise, if:

- A `<textarea>` does not paint `boxShadow` in the `TestRenderer` after the ring
  is added (the authored style still lacks it, or `findByTestId` reports a
  different node). Do not move the ring to the wrapper row as a silent
  workaround; report the measured limit first.
- `autoFocus` is not accepted by `ChatComposerProps` without widening the public
  props (it is accepted today — the probe compiled — so a failure means the
  installed types changed).
- The full behaviour suite gains any failure beyond the known 35, or Chat is not
  12/12.
- The docs-count or `COMPONENTS.md` count checks cannot be made to pass without
  changing what the test counts mean.
- Any change would touch a file outside §"Files owned".

## 7. Acceptance

- A focused `ChatComposer` paints `focusRing(theme)`; an unfocused one paints no
  `boxShadow`; both themes are covered.
- The caller's `onFocus`/`onBlur` still run, and the tracked state follows a
  real focus/blur in a live window.
- Chat's native suite is 12/12 and the full suite is `752/35`; no new failure.
- `docs/chat.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index
  agree with the implementation; the docs count is 12.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
