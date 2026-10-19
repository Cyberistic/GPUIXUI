# 643 — A mark thinner than the hairline

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 332 (the fill as a mark), 353/556/598/601/604 (the fixed
surface metrics), 636 (the Toast tone bar) ·
**Number block:** 500–699 (`tokens-theme` overflow; `642` is the latest used) ·
**Status:** done

## 1. The defect

The numeric contract holds the **timeline marker** to the rail it marks:

```ts
...(usableBound(dimensions.timelineMarkerSize)
  ? atLeast("dimensions", "timelineMarkerSize",
      dimensions.timelineMarkerSize, borderWidth.thin)
  : []),
```

Plan 604 chose that bound because "a marker thinner than the rail it marks does
not read as a dot". The other four fixed marks have no such rule — they are only
positive:

| Mark | Field | Shipped |
| ---- | ----- | ------- |
| Toast tone bar | `dimensions.toastToneBarWidth` | 3 |
| Inbox unread dot | `dimensions.notificationUnreadDotSize` | 6 |
| Carousel indicator | `dimensions.carouselIndicatorSize` | 8 |
| Avatar presence dot | `dimensions.avatarPresenceDotSize` | 10 |

So a copied theme can set any of them to `0.1` and every check returns `[]`:

```ts
const faded = extendTheme(getTheme("light"), {
  dimensions: { toastToneBarWidth: 0.1, notificationUnreadDotSize: 0.1 },
});
themeMetricFailures(faded); // []
themeFailures(faded);       // []
```

`0.1 > 0`, so the `positive` rule passes; nothing compares the mark with the
theme's own smallest stroke. The Toast tone bar is the one a reader notices: it
is the only tone signal on a notification card, and at a tenth of a pixel it
aliases to a faint smear at 1× (the shipped 3px bar is what plan 348/636
designed).

The rule is already accepted on the timeline marker, so this is the same
guarantee one table row over, not a new house style. Every shipped set ships
`borderWidth.thin: 1` and every mark at 3 or above, so no shipped value moves.

## 2. Decision

For the four fixed marks above, report a mark thinner than the theme's own
hairline (`borderWidth.thin`) as an `at-least` failure:

```ts
...(usableBound(dimensions[member])
  ? atLeast("dimensions", member, dimensions[member], borderWidth.thin)
  : []),
```

- `usableBound` keeps the existing `positive` rule as the single diagnostic for
  a zero, negative or non-finite mark; the at-least rule waits for a usable
  value (the plan-641 rule).
- A borderless theme (`borderWidth.thin: 0`) keeps no invented bound: a positive
  mark passes `at-least 0`. The mark still has to be positive.
- Equality passes: a 1px mark with a 1px hairline is a valid design.
- Already covered and therefore excluded from the list: `timelineMarkerSize`
  (its own rule), `carouselIndicatorActiveWidth` (held to
  `carouselIndicatorSize`), and `avatarPresenceDotSize`'s upper bound (half the
  smallest avatar) stays.

Not changed:

- any shipped colour, pair, floor, metric, platform style or recipe;
- `dimensions`, `Dimensions`, `metricMembers`, `metricGroups` or `metricRules`;
- the positive rule, which remains every dimension's first check;
- the timeline marker's rule (it keeps its own clause and one diagnostic).

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/643-mark-stroke-floor.md` | this plan |
| `packages/tokens/src/metrics.ts` | add the four-mark rule beside the dimensions rules; extend the `themeMetricFailures` dimensions JSDoc |
| `packages/tokens/src/mark-stroke.test.ts` | new regression suite |
| `docs/tokens.md` | name the rule in Component dimensions and in the metric-contract dimensions bullet |
| `docs/design-system.md` | name the rule in §6 |
| `packages/tokens/README.md` | name the rule under Checking the numbers |
| `COMPONENTS.md` | add the clause to the **Theme metric check** row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-643.md` | the audit note |

No other file. **Do not** change a component, a primitive, a platform style, a
shipped value, a colour, a pair or a floor.

## 4. `packages/tokens/src/metrics.ts`

After the dimensions sign walk and before the overlay rule, add:

```ts
// A fixed mark the theme owns is a stroke the runtime paints. The timeline
// marker already reads the rail it marks (plan 604); the Toast's tone bar, the
// inbox's unread dot, a carousel indicator and an avatar's presence dot are the
// same kind of mark and were only positive, so a tenth of a pixel passed every
// check. A mark below the theme's own hairline is thinner than the smallest
// stroke a border may paint. `usableBound` leaves a zero, negative or
// non-finite value to the `positive` rule, so one bad mark keeps one
// diagnostic (plans 641 and 643).
const fixedMarks = [
  "toastToneBarWidth",
  "notificationUnreadDotSize",
  "carouselIndicatorSize",
  "avatarPresenceDotSize",
] as const satisfies ReadonlyArray<keyof Dimensions>;

...fixedMarks.flatMap((member) =>
  usableBound(dimensions[member])
    ? atLeast("dimensions", member, dimensions[member], borderWidth.thin)
    : [],
),
```

`Dimensions` is already imported as a type in this module; keep the list local
so no public index changes. Extend the dimensions bullet in the
`themeMetricFailures` JSDoc with:

> A fixed mark — the Toast's tone bar, the inbox's unread dot, a carousel
> indicator or an avatar's presence dot — is at least the theme's own hairline
> (`borderWidth.thin`), because a mark thinner than the smallest stroke a
> border may paint does not read; the timeline marker already reads the rail it
> marks.

## 5. `packages/tokens/src/mark-stroke.test.ts`

Header:

```ts
/**
 * Guards the defect plan 643 fixes: the fixed marks the theme owns were only
 * held to `positive`, so `toastToneBarWidth: 0.1` (and the inbox's unread dot,
 * a carousel indicator, an avatar's presence dot) returned `[]` from every
 * check while painting a sub-hairline smear. The timeline marker already read
 * `borderWidth.thin` (plan 604); the other four now do too, a zero/negative
 * mark keeps its single `positive` diagnostic, and every shipped set is
 * unchanged.
 */
```

Imports: `describe`, `expect`, `it` from `vitest`; `contrast` not needed;
`shippedThemes` from `./shipped-themes.js`; `themeFailures`,
`themeMetricFailures` from `./index.js`; `dimensions` type not needed;
`extendTheme`, `getTheme` from `./theme.js`.

Cases:

1. **Every shipped mark clears its own hairline** — derive the four names,
   iterate `shippedThemes`, and assert each value is at least
   `theme.borderWidth.thin`.
2. **A sub-hairline Toast bar is reported** — `extendTheme(getTheme("light"),
   { dimensions: { toastToneBarWidth: 0.5 } })` yields exactly
   `[{ group: "dimensions", member: "toastToneBarWidth", rule: "at-least",
   actual: 0.5, bound: 1 }]`.
3. **The other three marks are reported** — one `it` per field, or a loop over
   the four names asserting the member and bound. The pre-fix tree returns `[]`;
   state that in the header.
4. **A zero mark keeps one diagnostic** — `toastToneBarWidth: 0` yields only
   the `positive` rule, not `positive` + `at-least`.
5. **A borderless theme invents no bound** — `borderWidth: { thin: 0 }` plus
   `toastToneBarWidth: 0.5` passes the at-least rule (the positive rule still
   passes). The case documents that the rule reads the theme's own hairline.
6. **Equality is a design** — `borderWidth: { thin: 1 }` and
   `notificationUnreadDotSize: 1` returns `[]`.
7. **`themeFailures` carries the finding** — the composed check reports a
   `kind: "metric"` entry for the sub-hairline bar.

Do not assert back the value the test stubbed: each case computes the expected
value from the theme's own `borderWidth.thin` (the values above are the shipped
identity's, named only in the prose).

## 6. Documents

- `docs/tokens.md`, **Component dimensions**: after the toast/timeline
  sentences, add one sentence: the fixed marks the theme owns — the Toast tone
  bar, the inbox unread dot, a carousel indicator and an avatar presence dot —
  are at least `borderWidth.thin`, because a mark below the smallest stroke a
  border may paint is not a mark; a zero or negative value stays the `positive`
  rule's single diagnostic.
- `docs/tokens.md`, **`themeMetricFailures` dimensions bullet**: add the clause
  from §4.
- `docs/design-system.md` §6, after the timeline sentence: the same rule in
  prose, naming the four marks and `borderWidth.thin`, and that a borderless
  theme keeps its positive mark.
- `packages/tokens/README.md`, **Checking the numbers**: one sentence naming
  the four marks and the hairline rule.
- `COMPONENTS.md`, **Theme metric check** row: add "hold a fixed mark to the
  theme's hairline (`toastToneBarWidth`, `notificationUnreadDotSize`,
  `carouselIndicatorSize`, `avatarPresenceDotSize`; the timeline marker already
  reads its rail) (plan 643)" to the existing enumeration.
- `TODO.md`: add and tick a row under the design-token section; bump
  `278/352` to `279/353` and keep the ten-cell bar at 79% (`████████░░`).
- Plan index: add `643` after `642` and a summary paragraph after plan 642's
  summary.

## 7. Commands

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: type check clean; 176 test files and all tests pass (the new suite
adds cases); the repo gates green. If any shipped mark reports a failure, STOP:
the list or the shipped value is wrong, and no token value may move to satisfy
this rule.

## 8. STOP conditions

- A shipped set returns a metric failure after the change.
- A zero or non-finite mark reports more than one diagnostic.
- Any test fails for a reason other than the new rule's cases.
- The change needs a new public type, index or rule — this plan adds none.
- A document cannot be updated without retyping a shipped value.

## 9. Acceptance

- The four fixed marks are held to `borderWidth.thin`; a sub-hairline value is
  reported as `at-least`, one diagnostic per broken mark.
- A borderless theme's positive mark still passes.
- The new suite fails on the pre-fix tree (cases 2–4 and 7) and passes after.
- Every shipped theme, platform variant and recipe still returns `[]` from
  `themeFailures`.
- `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md` and
  `TODO.md` state the rule; the plan is indexed.
