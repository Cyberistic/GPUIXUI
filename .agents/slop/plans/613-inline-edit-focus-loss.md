# 613 — InlineEdit commits when native focus leaves without a blur event

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `313` (inline edit), `326`/`327` (behaviour harness), `347` §8.2, `379` (outside press/Tab), `514`, `554`, playground `605` |
| Status | planned |

## 1. The problem

`InlineEdit` commits on Enter, `Tab`, an outside press, and React `blur`.
The last one is not delivered when the runtime moves focus by itself:
playground plan `605` measured a full live gate where a click away moved native
focus to `ws-elsewhere` but ran no React `onBlur`, so the editor stayed open and
the readout kept `commits=1`. Plan `379` already added the outside press, and
plans `555`/`605` show the live suite passes in three focused runs; the state
depends on the window. The remaining hole is any focus move that **is not
preceded by a press this component can observe** (a synthetic/automation click,
a programmatic focus move, a window that drops the pointer delivery). A real
consumer can reach that state, and the editor then appears stuck.

The runtime exposes the truth synchronously: `renderer.getFocusedElementId()`
returns the host that holds focus. The primitives package already treats that
query as the authoritative signal on this build (`NativeFocusProvider`, plan
`590`). This plan adds the same sampling to the one component whose *commit*
depends on leaving the field — not to paint a ring — and only while an edit is
open.

Measured on this host, 2026-10-19, in the real `TestRenderer`:

```
input id 1 focused
renderer.focusNext()
focused id 2
onFocus calls 0, onBlur calls 0
```

`focusNext()` is therefore a faithful headless stand-in for the live state: a
focus change with no React event. The test below uses it.

## 2. Scope

**In scope**

- `packages/components/src/inline-edit.tsx`: while the input is mounted and
  enabled, sample `getFocusedElementId()` every 50 ms. Once the input has been
  observed focused, a sample that names a different host (or no host) commits the
  draft and leaves focus where the runtime put it.
- The event paths stay primary; the sampler is additive and shares the existing
  `finished` guard, so a gesture that already committed is a no-op.
- Two native behaviour tests and the docs/inventory truth for them.

**Out of scope — do not touch**

- No change to `popover.tsx`, `tabs.tsx`, `list.tsx` or any other component's
  focus handling in this plan. This is the commit path only.
- No new provider or public prop. The sampler is internal to `InlineEdit`.
- No change to the `value`/`draft` ownership contract.
- No playground edit (owned by the playground workstream); its missed-blur
  fallback keeps working and is now a safety net rather than the only exit.

## 3. Exact files and changes

### 3.1 `packages/components/src/inline-edit.tsx`

1. Add the sampling interval constant with a comment naming the reason:

   ```ts
   /** How often an open edit asks the renderer which host holds focus, ms. */
   const FOCUS_SAMPLE_MS = 50;
   ```

2. Add refs beside `finished`:

   ```ts
   // The sampler runs outside React's events; it reads the latest finish.
   const finishRef = useRef(finish);
   // Only a focus move after the input was seen focused can end the edit.
   const heldFocus = useRef(false);
   ```

   Keep `finishRef.current = finish` current with a `useLayoutEffect` that has no
   dependency array (runs after every commit). Do **not** put the interval in
   that effect.

3. While editing, install one interval:

   ```tsx
   useEffect(() => {
     if (!editing || disabled || inputId === undefined || renderer === null) {
       heldFocus.current = false;
       return;
     }
     heldFocus.current = false;
     const read = (): void => {
       const focused = renderer.getFocusedElementId?.() ?? null;
       if (focused === inputId) {
         heldFocus.current = true;
         return;
       }
       if (heldFocus.current) finishRef.current(true, "keep");
     };
     read();
     const timer = setInterval(read, FOCUS_SAMPLE_MS);
     return () => clearInterval(timer);
   }, [disabled, editing, inputId, renderer]);
   ```

   `read()` immediately covers a focus move that happened before the effect ran;
   `heldFocus` keeps a controlled `editing` that never took focus from committing
   an untouched draft. `"keep"` is deliberate: the user already moved focus, so
   the commit must not pull it back to the display (the same rule the `Tab` path
   and plan `379`'s `displayIfUnfocused` already encode).

4. Import `useEffect` from React (the file currently imports
   `useCallback, useLayoutEffect, useRef, useState`).

5. Update the module header: the commit rule is Enter, `Tab`, an outside press,
   React blur **or a sampled focus move**; name the 50 ms sample and why.

Do not remove `onBlur`: it is immediate on a host that delivers it, and the
sampler is the fallback.

### 3.2 `packages/components/src/behaviour/inline-edit.test.tsx`

Add two cases to the existing `describe`:

1. **The bug guard — a focus move with no blur commits and keeps the new focus.**

   ```tsx
   it("commits when native focus leaves without a blur event", async () => {
     const onCommit = vi.fn();
     const edit = renderComponent(<Harness onCommit={onCommit} />);

     startEditing(edit);
     type(edit, "silent");
     edit.renderer.focusNext(); // moves focus to `elsewhere`, dispatches no blur

     await new Promise((resolve) => setTimeout(resolve, 120));

     expect(onCommit).toHaveBeenCalledTimes(1);
     expect(onCommit).toHaveBeenCalledWith("silent");
     expect(edit.renderer.findByType("input")).toHaveLength(0);
     expect(focusedTestId(edit)).toEqual(Option.some("elsewhere"));

     edit.unmount();
   });
   ```

   Header comment: names the live finding (plans `605`/`347`) and states that
   without the sampler the editor is still mounted and `onCommit` is uncalled.

2. **The pin — an open edit that never held focus does not commit.**

   ```tsx
   it("does not commit an edit that never took focus", async () => {
     const onCommit = vi.fn();
     const edit = renderComponent(
       <Harness onCommit={onCommit} host={{ editing: true }} />,
     );

     await new Promise((resolve) => setTimeout(resolve, 120));

     expect(onCommit).not.toHaveBeenCalled();
     expect(edit.renderer.findByType("input")).toHaveLength(1);

     edit.unmount();
   });
   ```
   (Controlled `editing` with no `autoFocus`; the input is mounted, focus is
   elsewhere/none, and the unchanged draft must not be reported.)

   If this second case cannot be made to fail by removing the `heldFocus` gate
   (because an unchanged draft never reports), keep it as the pin but record that
   fact in the plan's evidence; the first case remains the required
   two-direction proof.

### 3.3 `packages/components/docs/inline-edit.mdx`

- The commit-contract table: the `Blur` row becomes
  `Blur, or native focus moving to another host` and its result stays "commit;
  leave focus where the user put it".
- Replace the live-window paragraph with the measured contract: 0.10.0 does not
  dispatch React blur for every native focus change; while an edit is open the
  component samples `getFocusedElementId()` every 50 ms and commits on the first
  sample that names another host, so a click away does not leave the editor
  stuck. Events stay primary where the host delivers them.
- Limitations: replace "blur is a headless-only extra path" with the sampler
  statement (up to 50 ms latency on a host with no blur event) and keep the note
  that a press on a non-focusable area does not move focus, so it relies on the
  outside press.
- Verification: state the new real count (`19`) and name both new cases.

### 3.4 `packages/components/src/inline-edit.tsx` inventory record

Update `inlineEditMeta.limitations` to the sampled-focus wording (no duplicate
of the docs paragraph).

### 3.5 `COMPONENTS.md`

The `Inline edit` row: add the sampled focus-loss commit, the 50 ms bound, and
the new native test count (`19`). Do not claim a live run from this workstream;
the evidence is the headless measurement plus playground plan `605`.

### 3.6 `TODO.md`

Tick the cross-team task under **Interlocks** (the row that says
`Plan 347 §8.2 found InlineEdit's blur commit is headless-only`), replacing it
with a resolved row that names this plan, the sampler, and the two new tests.
Also add a line under Phase F's consistency pass.

### 3.7 `.agents/slop/plans/README.md` and `PLAN.md`

- Index this plan in the components table (`613`).
- Add a short D30 addendum: `613` is the first free number after `612` across
  the worktrees on 2026-10-19.

## 4. Test plan and two-direction proof

Commands, from `workspaces/components`:

```sh
nub run --filter @gpuixui/components check-types
nub exec --cwd packages/components vitest run --config vitest.behaviour.config.ts src/behaviour/inline-edit.test.tsx
nub run --filter @gpuixui/components test
nub run check && nub run lint && nub run test
```

Expected: type-check clean; InlineEdit 19/19; unit 449/449; gates exit 0.

Two-direction proof:

1. With the sampler: the new focus-move case passes.
2. Remove the interval installation (or make `read` a no-op) and run the same
   file: the new case fails with the editor still mounted and `onCommit`
   uncalled. Record the exact failure.
3. With the sampler but without the `heldFocus` gate, run the pin: if it commits
   an untouched draft, the gate is required; if not, record that the unchanged
   draft hides it and keep the pin as a contract statement.

The full native suite has the recorded plan-540 binding failures (36 red of 812
on 2026-10-19). This plan does not add to them; the InlineEdit file must be
green apart from failures already recorded for it. Run the file, not the full
suite, while iterating.

## 5. STOP conditions

- **STOP** if `focusNext()` in the headless renderer starts dispatching React
  blur; then the primary test is no longer a faithful stand-in and the plan needs
  a different no-event route. Record the measurement.
- **STOP** if the sampler commits before the input has held focus in any
  reproducible case; do not tune a delay — fix the gate.
- **STOP** if a live suite run is used as evidence without recording the window
  state and the exact command.
- **STOP** if any existing InlineEdit case changes outcome; report which one.

## 6. Acceptance

- Focus moving away without a React blur commits the draft once and leaves focus
  on the host the runtime chose.
- An edit that never took focus never commits.
- Every existing path (Enter, Escape, Tab, outside press, blur, unchanged,
  disabled) keeps its result.
- Docs, `COMPONENTS.md`, the inventory record and the test count agree.
- `nub run check`, `nub run lint`, `nub run test` pass.
