# 368 — DatePicker opens on today (clamped to the bounds), not the month head

**Phase.** F — integration and polish (a measured consumer defect).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 112, 119, 127, 303, 323, 346 (playground evidence).
**Status.** planned 2026-10-18.

## 1. Why this plan exists

Opening a `DatePicker` with no value should focus **today** — or the first
selectable day when today is outside `min`/`max`. The playground measured the
opposite in `tier2-choice` (plan `346` §8): the focused cell was
`date-day-2026-10-01` while `today="2026-10-17"`, and with `min="2026-10-17"` the
focused day was **before** the bound, so the first arrow press jumped forward.

Cause: `DatePickerCalendar` has two layout effects.
1. The open effect sets `viewMonth`/`active` from `selectedDay ?? todayDay`.
2. The focus effect runs in the **same commit** and reads the old `active`
   (`None` on a no-value picker), falling back to `startOfMonth(viewMonth)`.
   It clears `pendingFocus` and focuses the month head; the open effect's state
   has not rendered yet.

The in-package suite only ever opens with a selected day, so the fallback was
never exercised.

## 2. What will change

1. Compute one **anchor**: `clampToBounds(selectedDay ?? today, bounds)`, and use
   it for the initial `viewMonth`, the open effect and the focus effect's
   fallback. The month head is never a focus fallback.
2. Clamp the anchor to `min`/`max`, so opening with `min` in the future focuses
   the first selectable day rather than an out-of-range one.
3. Two native regression tests: no value focuses today; no value with
   `min="2026-10-17"` focuses that day.

No public API changes.

## 3. Exact implementation

### 3.1 `packages/components/src/date-picker.tsx` (`DatePickerCalendar`)

After the context destructure, derive:

```ts
/**
 * Where an open with no active day lands: the selection, else today, clamped to
 * the bounds. Using it in the focus effect is what keeps the month head from
 * stealing focus when the open effect's state has not rendered yet (plan 368).
 */
const anchor = clampToBounds(
  Option.getOrElse(selectedDay, () => todayDay),
  bounds,
);
```

- Initial state:

  ```ts
  const [viewMonth, setViewMonth] = useState<DateTime.Utc>(() =>
    startOfMonth(anchor),
  );
  const [active, setActive] = useState<Option.Option<DateTime.Utc>>(() =>
    Option.some(anchor),
  );
  ```

- Open effect: replace `const anchor = Option.getOrElse(selectedDay, () =>
  todayDay);` with the outer `anchor` (delete the shadowing local), keeping
  `setViewMonth(startOfMonth(anchor)); setActive(Option.some(anchor));`.
- Focus effect:

  ```ts
  const day = Option.getOrElse(active, () => anchor);
  ```

  `anchor` is intentionally not in the dependency array; the open effect already
  re-anchors on `open`, the selected ISO and `today`, which the existing
  `eslint-disable-next-line` documents.

- `tabbable` keeps `clampToBounds(..., bounds)`; no change.

### 3.2 `packages/components/src/behaviour/date-picker.test.tsx`

Add two cases (the fixture already pins `today="2026-10-17"`):

```tsx
it("opens with no value on today, not the month head", () => {
  const picker = renderComponent(<Picker />);

  open(picker);

  expect(focusedTestId(picker)).toEqual(
    Option.some("date-day-2026-10-17"),
  );

  picker.unmount();
});

it("opens on the first selectable day when today is before min", () => {
  const picker = renderComponent(<Picker min="2026-10-17" />);

  open(picker);

  expect(focusedTestId(picker)).toEqual(
    Option.some("date-day-2026-10-17"),
  );

  picker.renderer.simulateKeystrokes("right");
  expect(focusedTestId(picker)).toEqual(
    Option.some("date-day-2026-10-18"),
  );

  picker.unmount();
});
```

On the current code both focus `date-day-2026-10-01`; the first `ArrowRight`
moves to the 2nd (and from a pre-bound day the selection clamp jumps, which the
second case also catches).

### 3.3 Docs and inventory

- `packages/components/docs/date-picker.mdx`: verification count 16 → 18, the
  no-value anchor rule in the behaviour/keyboard section, and the opening
  sentence corrected if it claims the month head.
- `COMPONENTS.md`: Date pickers row 16 → 18 native tests and the anchor rule.
- Plan index row; `TODO.md` task.

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/date-picker.test.tsx
```

Expected: DatePicker 18/18. With §3.1 reverted, the two new cases fail with
`date-day-2026-10-01` focused.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run --filter @gpuixui/components test
nub run check
```

Expected: behaviour 529, unit unchanged, `check` exit `0`.

## 5. STOP conditions

1. The focused cell is not `date-day-2026-10-17` after the change. Measure
   whether `today` or `bounds` reach the calendar context; do not move the anchor
   into the rendered grid by hand.
2. A selected value outside `min`/`max` becomes unreachable. Clamping the anchor
   must not change what a caller's out-of-range value renders — only the focus
   fallback; if it does, STOP and report.
3. An existing DatePicker case regresses (selected-day opening, month
   browsing, clear). Investigate the anchor's bounds interaction before widening.

## 6. Acceptance

- A no-value open focuses today, or the first selectable day when today is out
  of bounds; the first arrow press moves one day (not a clamp jump).
- Both new tests fail on the old fallback.
- Gates pass; docs and inventory say 18; plan indexed and `TODO.md` ticked.

## 7. Result

_To be filled after execution._
