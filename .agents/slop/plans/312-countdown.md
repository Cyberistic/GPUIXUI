# 312 — Countdown: a remaining-time display

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §4 (C3) |
| Status | planned |
| Source | `docs/component-api.md` §8 (planned parts: `Countdown`); `COMPONENTS.md` → Tier 2 → Countdown; plan `205` C3 |

This plan is self-contained. It adds `Countdown` at the Tier 2 bar.

---

## 1. Why

A countdown looks like a timer but is not one. The component must not own a tick:
the repo's Effect rule puts time behind `Clock`, and a renderer timer would keep
running after unmount and would make every test wait in real time. `Countdown`
therefore renders **one remaining duration it is given**, and the application
ticks with Effect `Clock` and re-renders. The formatting is the component's.

`COMPONENTS.md` gives the row `<text>` + app `Clock`; there is no host element.

## 2. The target API

```tsx
<Countdown remainingMs={remaining} label="Offer ends in" showDays />
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Countdown` | formats the remaining time and paints it as one text node | `remainingMs` (required, non-negative), `label?`, `showDays?` (default `false`), `style?: StateStyle<CountdownState>` |

`CountdownState` is `{ readonly remainingMs: number; readonly expired: boolean }`.

### Formatting (`src/countdown/logic.ts`)

- `breakdown(remainingMs)`: clamps negatives to zero, floors to whole seconds,
  and returns `{ days, hours, minutes, seconds }` (each non-negative integer).
- `formatCountdown(remainingMs, { showDays })`:
  - under an hour: `MM:SS` (always two-digit minutes);
  - an hour or more: `HH:MM:SS` (hours are not capped at 24);
  - `showDays` and at least one day: `Nd HH:MM:SS`;
  - zero or negative: `00:00`.
- Pure and total; the component has no other logic.

The display is fixed 24-hour-style and locale-free (the repo has no i18n layer);
record that, and that "days" are 24-hour units, not calendar days.

### Visual rules (tokens only)

- `caption` type with `mono`? The repo's token types have no mono role on the
  component seam; use `caption` and let the caller opt into a mono face through
  `style`. No colour of its own: inherit `foreground`, and render
  `mutedForeground` once expired (`remainingMs <= 0`) — the one stateful colour.
- The accessible name is the `label`; the value is the text. There is no
  `role="timer"` in 0.10.0's supported roles, so none is claimed.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/countdown/logic.ts` | **create** — `breakdown`, `formatCountdown` |
| `packages/components/src/countdown/logic.test.ts` | **create** — 9 unit tests |
| `packages/components/src/countdown.tsx` | **create** — `Countdown`, `countdownMeta` |
| `packages/components/src/index.ts` | add `export * from "./countdown.js";` |
| `packages/components/src/inventory.ts` | import and list `countdownMeta` |
| `packages/components/src/behaviour/countdown.test.tsx` | **create** — 5 native tests |
| `packages/components/examples/countdown.example.tsx` | **create** — a session-expiry banner driven by an Effect `Clock` tick |
| `packages/components/docs/countdown.mdx` | **create** — including how to tick with Effect |
| `docs/component-api.md` | move Countdown into the built table |
| `COMPONENTS.md` | row → `done` / `yes`, 5 native + 9 unit tests, limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test             # expected: countdown logic 9
nub run --filter @gpuixui/components test:behaviour   # expected: Countdown 5
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `aria-label` on a `<text>` node does not reach the accessibility dump —
  render the label and the value as two text nodes instead and record it;
- the example needs a real renderer timer to demonstrate ticking — the example
  owns an Effect `Clock` loop at the boundary and passes `remainingMs`; do not
  put a timer in the component.

## 6. Test plan

`src/countdown/logic.test.ts` (pure):

1. `breakdown` splits 90_000 ms into 0d/0h/1m/30s;
2. floors partial seconds;
3. clamps negatives to zero;
4. `formatCountdown` under an hour is `MM:SS`;
5. an hour or more is `HH:MM:SS` with uncapped hours (25h → `25:00:00`);
6. `showDays` adds `Nd ` only when there is a day;
7. zero and negative render `00:00`;
8. 59_999 ms renders `00:59` (floor, not round);
9. 86_399_000 ms renders `23:59:59`.

`src/behaviour/countdown.test.tsx` (real renderer):

1. renders the formatted remaining time;
2. re-renders with a new `remainingMs` and shows the new value;
3. a negative value renders `00:00` in `mutedForeground`;
4. `label` names the text in the accessibility dump;
5. a consumer `style` wins in both themes.

**Both directions.** Remove the negative clamp: unit test 3 and native test 3
fail. Round instead of floor: unit test 8 fails. Restore after each.

## 7. Acceptance criteria

- One part with JSDoc, the exported pure module and `CountdownState`.
- Five native + nine unit tests; the example ticks from Effect `Clock`, not from
  the component.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.
