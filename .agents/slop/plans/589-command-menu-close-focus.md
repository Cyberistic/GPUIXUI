# Plan 589 — Closing the command menu returns focus to its opener

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 301, 329, 340, 388, 523, 530, playground 581 |
| Status | **planned** |
| Claimed number | first free after `588` (checked every worktree; recorded in `PLAN.md` D30) |

## 0. Why this plan exists

The playground's plan `581` mounted the shipped `CommandMenu` in a real window
for the first time. Two `live-tier2-command` runs and the headless
`tier2-command` agree on the measured defect:

```text
open palette → type → Enter
  action runs, dialog closes
  focused = none
```

The palette therefore drops the user's focus on the floor after every command
(and after Escape). The cause is ordering inside one commit:

1. `CommandMenuInput` sets `autoFocus`. GPUix applies `autoFocus` natively
   **after React's effects** (plans 388, 523), so by the time
   `useModalFocus`'s layout effect asks `renderer.getFocusedElementId()`, the
   answer is already the input.
2. `useModalFocus` stores that id as the opener (`previousFocus`).
3. On close the input is unmounted; the restore path sees a destroyed element
   and deliberately focuses nothing.

`DialogContent` already has the correct mechanism: it runs the caller's
`initialFocus` **after** recording the opener. `CommandMenu` passes
`initialFocus={() => input.current?.id ?? null}`, so the input is focused even
without its own `autoFocus`.

A second, smaller measurement from the same plan: `Home`/`End` are consumed by
the GPUix `<input>` and never reach `onKeyDown`, so the palette's
`isFirst`/`isLast` branches are dead on 0.10.0.

## 1. Exact files to change

1. `packages/components/src/command-menu.tsx` — drop `autoFocus`; drop the two
   dead key branches and their imports.
2. `packages/components/src/behaviour/command-menu.test.tsx` — one new native
   case: a palette opened from a focused control returns focus there on close.
3. `packages/components/docs/command-menu.mdx` — the key table and the
   limitation paragraph say the component has no `Home`/`End` branch; the
   verification count and the focus paragraph name the restore.
4. `COMPONENTS.md` — the `Command menus` row: new native test count, the
   close-focus contract, and the `Home`/`End` wording.
5. `TODO.md` — tick the recorded task; keep the measured cause in one line.
6. `PLAN.md` D30 — append the number `589` to the components overflow trail.
7. `.agents/slop/plans/README.md` — index this plan (and add its result row when
   it lands).

Do **not** change `internal/modal.ts`, `dialog.tsx`, `internal/key.ts`, the
dismiss stack or any other component. `Home`/`End` keep their shared predicates
for suites that can receive them (Tabs, List, menus).

## 2. Implementation

### 2.1 `CommandMenuInput`

Before:

```tsx
const [focused, setFocused] = useState(true);
...
autoFocus
```

After (same ring seed, no mount-time focus race):

```tsx
// DialogContent focuses this field through `initialFocus` after it has
// recorded the opener, so focus can return when the palette closes. A second
// `autoFocus` would claim focus first and destroy that record (plan 589).
const [focused, setFocused] = useState(true);
...
// no autoFocus
```

Keep `onFocus`/`onBlur` and the `focusRing` line exactly as they are: the
runtime does not deliver those events for its own focus change, which is why
the seed stays `true`, and the ring is already proven by plan 523.

### 2.2 `handleKeyDown`

Remove `isFirst`/`isLast` from the import and the two branches:

```ts
const handleKeyDown = (event: EventPayload): void => {
  if (isDismiss(event)) {
    dismissTopLayer(event);
    return;
  }
  if (isDown(event)) step({ _tag: "Move", delta: 1 });
  else if (isUp(event)) step({ _tag: "Move", delta: -1 });
};
```

The native `<input>` consumes `Home`/`End` (measured by playground plan 581:
no key-down is emitted and the scroll offset does not change), so no reachable
path calls those branches. The arrows remain the working path and are already
tested.

### 2.3 The native case

Add to `src/behaviour/command-menu.test.tsx`:

```tsx
/**
 * The bug this guards (plans 581/589), measured in a real window: the palette
 * closed with `focused = none`. `CommandMenuInput`'s `autoFocus` took native
 * focus in the same commit, before `useModalFocus` recorded the opener, so the
 * saved id was the field being destroyed. The dialog's `initialFocus` already
 * focuses the field; the field must not claim focus before the opener is read.
 */
it("returns focus to the control that opened it", () => {
  const palette = renderComponent(<ReopeningPalette perform={vi.fn()} />);

  palette.renderer.focusElement(
    palette.renderer.findByTestId("open-palette")?.id ?? -1,
  );
  clickCentreOf(palette, "open-palette");
  expect(focusedTestId(palette)).toEqual(Option.some("command-input"));

  palette.renderer.simulateKeystrokes("escape");
  finishMotion(palette);

  expect(focusedTestId(palette)).toEqual(Option.some("open-palette"));

  palette.unmount();
});
```

Use the existing `ReopenablePalette` fixture: `open-palette` is a
`role="button"` with `tabIndex={0}` and is still mounted after the close, so it
is a valid restore target. Focusing it before the click pins the precondition —
a plain `div` does not gain focus from a press in 0.10.0. Do not add a new
fixture unless `ReopenablePalette` cannot be reused.

Expected on `HEAD`: the case fails with
`expected Some("open-palette"), received None` (or `Some(undefined)` if the
restore is skipped). After §2.1 it passes.

### 2.4 Docs and inventory

`docs/command-menu.mdx`:

- Delete the `Home` / `End` row from the key table.
- Replace "The component keeps its branches for when the runtime forwards them"
  with: the host consumes them, so the palette has no branch and the arrows or
  the pointer are the paths.
- In "Focus and the highlight", add that closing returns focus to the control
  that was focused before the palette opened (the dialog's recorded opener).
- Bump the verification sentence to 24 tests and name the new case.

`COMPONENTS.md` — the `Command menus` row: `23` → `24` native behaviour tests,
one clause for the close-focus contract, and the `Home`/`End` clause reworded
from "reaches branches" to "the host consumes them; the palette has no branch".

## 3. Commands and expected results

From `packages/components`:

```sh
# 1. Prove the new case fails first (only the command-menu file).
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/command-menu.test.tsx -t "returns focus to the control"
# Expected on HEAD: 1 failed, 0 passed.

# 2. Apply §2.1 and §2.2, then the same command.
# Expected: 1 passed.

# 3. The whole file (24 tests).
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/command-menu.test.tsx
# Expected: 24 passed.

# 4. The full native suite; the 35 plan-540 binding failures are known and stay.
nub run test:behaviour
# Expected: 748 passing / 35 known failures of 783 (was 747/35 of 782).

# 5. Gates.
nub run check
nub run lint
nub run test
```

If the focused `-t` run reports the new case as passed on `HEAD`, STOP: the case
does not guard the defect.

## 4. Both-direction proof

1. Write §2.3 and run command 1 on `HEAD`: the new case fails.
2. Apply §2.1 only (keep §2.2 for later): command 2 passes; then restore
   `autoFocus` on the input and run command 2 again — it must fail with the
   opener replaced by the destroyed field. Revert the mutation.
3. Apply §2.2 and run the whole file (command 3): 24 passed.
4. Record both runs in the commit body. `scripts/verify-two-directions.sh` uses
   `jj`, which is not installed (D1); do the runs by hand.

## 5. STOP conditions

- The new case passes on `HEAD`: stop and re-measure; the fixture may not
  reproduce the measured ordering.
- The new case fails after §2.1 for a different reason (e.g. `initialFocus` did
  not run): stop and record the focused id at each step; do not add a second
  focus mechanism.
- Any command-menu case other than the new one changes verdict: stop and name
  it.
- Removing `Home`/`End` changes a passing case: stop — something in this package
  does receive them, and the measurement is wrong.
- The full native suite's known plan-540 failures move: stop and classify each
  moved case before touching anything else.

## 6. Acceptance

- Closing the palette with Escape returns focus to the control that held it
  before the palette opened; Enter follows the same path (both go through
  `setOpen(false)` and the dialog's restore).
- `Home`/`End` are documented as host-consumed, with no dead branch in the
  palette.
- Command-menu suite: 24 native tests, exit `0`; full native suite 748/35 of 783
  unless a known plan-540 case is re-measured; `nub run check`, `nub run lint`,
  `nub run test` exit `0`.
- `docs/command-menu.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan
  index agree.
- One commit: `fix(components): closing the command menu restores focus (plan 589)`.

## 7. Results

To be filled when the plan lands.
