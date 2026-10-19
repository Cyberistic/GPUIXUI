# 625 — Readable marks: menu highlight, choice marks and the timeline dot

**Workstream:** components (Tier 2 composition/feedback)
**Phase:** C/F (hardening after the Tier 2 inventory closed)
**Depends on:** 110, 111, 113, 114, 117, 157, 323, 387, 392, 516, 606
**Touches:** `packages/components/src/menu/item.tsx`,
`packages/components/src/menu/radio.tsx`,
`packages/components/src/timeline.tsx`,
`packages/components/src/behaviour/dropdown-menu.test.tsx`,
`packages/components/src/behaviour/timeline.test.tsx`,
`packages/components/docs/{dropdown-menu,context-menu,timeline}.mdx`,
`packages/components/COMPONENTS.md`, `TODO.md`, `PLAN.md`,
`.agents/slop/plans/README.md`.

## 1. Why

The tokens workstream's contrast audits found three component marks that are
painted with a **wash** or a background role instead of an ink:

1. **Menu highlight bar** — `menu/item.tsx` paints the highlighted row's 2 px
   left bar with `theme.colors.accent`. `accent` is a wash: in the identity light
   theme it is `#EEF0FF` against the menu's `popover` `#FFFFFF` (**1.13:1**), and
   in dark it is `#2E2370` against `#222730` (**1.12:1**) — below the 3:1 mark
   floor, so the row that exists to show the keyboard highlight has no visible
   bar. The row's own text role, `popoverForeground`, measures 14.9:1 (light)
   and 12.4:1 (dark) on the same states.
2. **Menu choice marks** — the checkbox row's check glyph and the radio row's
   dot also use `accent` on the same `popover`/`hover` fills, so a checked or
   chosen row has no visible mark. They use the same `popoverForeground` role.
3. **Timeline upcoming dot** — `timeline.tsx` paints a pending event's dot with
   `muted`, which is `#EEF1F5` on the light `background` `#F6F8FA` (**1.06:1**)
   and `#222730` on the dark `#11141A` (**1.23:1**): a pending event has no dot.
   `mutedForeground` is the designed secondary ink (6.24:1 light, 7.79:1 dark).

The roles already ship in this branch's `@gpuixui/tokens`; this is a consumer
change only. The wider cross-team list in `workspaces/tokens-theme/TODO.md`
(`secondaryHover`, `primaryText`, `statusTone(...).text`, `contrastRing`,
`track`) depends on token roles that are **not in this branch** — those rows are
out of scope and stay recorded in `TODO.md` → Interlocks.

## 2. Exact changes

### 2.1 Menu rows and choice marks

File: `packages/components/src/menu/item.tsx`

- In `menuRowStyle`, change the highlighted row's `borderColor` from
  `theme.colors.accent` to `theme.colors.popoverForeground`. Keep the resting
  (non-highlighted) bar `theme.colors.popover` so the 2 px gutter never shifts.
- In `MenuCheckboxItem`'s checked branch, change the `<Icon name="check" …>`
  `color` from `theme.colors.accent` to `theme.colors.popoverForeground`.
- Update the comment above the bar to say the bar is the row's text ink, not a
  wash.

File: `packages/components/src/menu/radio.tsx`

- Change the selected dot's `backgroundColor` from `theme.colors.accent` to
  `theme.colors.popoverForeground`.

These are the shared parts used by the Dropdown menu, Context menu and submenu
rows; do not touch the individual menu surfaces.

### 2.2 Timeline dot

File: `packages/components/src/timeline.tsx`

- In `dotFill`, the `upcoming` branch becomes `theme.colors.mutedForeground`.
- Leave `complete` (`foreground`) and `current` (`primary`) unchanged.

## 3. Tests (write first, prove they fail)

### 3.1 `packages/components/src/behaviour/dropdown-menu.test.tsx`

Add one test (count 52 → 53) in the radio-group block:

```tsx
it("paints the highlight bar and the radio dot with the row's text role", () => {
  const menu = renderComponent(<RadioMenu />);
  clickCentreOf(menu, "trigger");

  // Open by pointer, then move the highlight with the keyboard.
  menu.renderer.simulateKeystrokes("down");

  expect(menu.renderer.findByTestId("sort-name")?.style.borderColor).toBe(
    darkTheme.colors.popoverForeground,
  );

  clickCentreOf(menu, "sort-modified");

  const row = menu.renderer.findByTestId("sort-modified");
  const leadingId = row?.children[0];
  const leading = leadingId === undefined
    ? undefined
    : menu.renderer.getElement(leadingId);
  const dotId = leading?.children[0];
  const dot = dotId === undefined
    ? undefined
    : menu.renderer.getElement(dotId);

  expect(dot?.style.backgroundColor).toBe(
    darkTheme.colors.popoverForeground,
  );

  menu.unmount();
});
```

Also strengthen "toggles a checkbox row …" (same file) after the toggle:

```tsx
const check = menu.renderer.findByType("svg")[0];
expect(check?.style.color).toBe(darkTheme.colors.popoverForeground);
```

The highlight assertion is the regression: the old source gives
`darkTheme.colors.accent`; the check and dot assertions do the same.

### 3.2 `packages/components/src/behaviour/timeline.test.tsx`

In "paints the dot from the event's status", change the `deploy` expectation from
`darkTheme.colors.muted` to `darkTheme.colors.mutedForeground`, and render the
same history in the light theme too:

```tsx
const light = renderComponent(<History />, "light");
expect(dotOf(light, "deploy")?.style.backgroundColor).toBe(
  lightTheme.colors.mutedForeground,
);
light.unmount();
```

No new `it`, so the documented count stays 6.

## 4. Commands and expected results

Run from `workspaces/components`:

1. `cd packages/components && nub run test:behaviour src/behaviour/dropdown-menu.test.tsx src/behaviour/timeline.test.tsx`
   - **Measured before the source change:** 4 failed / 55 passed. The new
     assertions failed on `borderColor` and the check glyph colour, and the
     timeline failed with `expected '#222730' to be '#A1A9B7'` (old `muted` vs
     `mutedForeground`); the other two failures were the recorded plan-540
     placement cases.
   - **Measured after the source change:** 2 failed / 57 passed — only the two
     recorded plan-540 placement cases (`centres a requested menu on its
     trigger`, `opens to the left when the right side cannot hold it`). The
     new and strengthened cases pass.
2. `cd packages/components && nub run test`
   - **Measured:** 45 files, 454 tests, all pass. `inventory.test.ts` accepts the
     new count with `docs/dropdown-menu.mdx` at 53.
3. `cd packages/components && nub run check-types`
   - **Measured:** exit 0 with no output.
4. `nub run check` from the worktree root
   - **Measured:** exit 0 (the first run failed on formatting; `nub run fmt:fix`
     fixed `dropdown-menu.test.tsx` and the rerun passed `check:tests`, `lint`,
     `fmt` and every package's `check-types`).
5. `cd packages/components && nub run test:behaviour src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx src/behaviour/timeline.test.tsx`
   - **Measured:** 3 failed / 77 passed; all three are the recorded plan-540
     position cases (two Dropdown, one Context menu). The shared-row change
     introduces no new failure.

## 5. Docs and ledger

- `packages/components/docs/dropdown-menu.mdx`
  - Verification count 52 → 53, and one sentence: the highlight bar, check glyph
    and radio dot use the row's `popoverForeground` ink so they stay visible on
    the popover and its hover/press washes.
- `packages/components/docs/context-menu.mdx`
  - One sentence: the shared menu rows use `popoverForeground` for the
    highlight bar and choice marks (count stays 21 — no new case there).
- `packages/components/docs/timeline.mdx`
  - One sentence: an upcoming dot uses `mutedForeground` (the secondary ink), not
    the `muted` wash (count stays 6).
- `packages/components/COMPONENTS.md`
  - Update the Dropdown menus, Context menus and Timeline rows with the role
    names; do not change their status.
- `TODO.md`
  - Add one ticked line under the Tier 2 hardening list with plan 625, the
    measured ratios, the changed files and the test counts.
- `PLAN.md` D30
  - Record that plan 625 is the next free number after 624 (checked across every
    worktree).
- `.agents/slop/plans/README.md`
  - Add the 625 row with status `done — …` only after steps 1–4 pass.

## 6. STOP conditions

- `@gpuixui/tokens` in this worktree does not export `popoverForeground` or
  `mutedForeground` — stop; do not add a token.
- The native behaviour config cannot load the GPUix binding — stop and record
  `unsupported-host`; do not call the paint change verified.
- A target test fails on a **focus/bounds** signal rather than a colour — this is
  the recorded plan-540 binding defect; leave the component change in, record the
  exact failure in the plan, and do not weaken the assertion.
- Any request to edit `packages/tokens`, `packages/primitives` or a docs-site
  path — stop; those are other workstreams. Record the need in `TODO.md`.

## 7. Acceptance

- The three marks paint the ink roles above in both themes.
- The new/stroked tests fail on the old source and pass on the new source.
- `nub run --filter @gpuixui/components test`, `check-types`, `nub run check` and
  `nub run lint` pass (or the only failures are the classified plan-540 binding
  cases, recorded).
- Docs counts match the suites; `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan
  index are synced.
