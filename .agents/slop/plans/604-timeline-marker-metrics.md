# 604 — The Timeline marker's fixed metrics

**Phase:** B/F (design-token ownership of the fixed surface metrics a component
still hardcodes)
**Workstream:** `tokens-theme` (the cross-team `components` migration is
recorded in `TODO.md`, never edited here)
**Depends on:** 353 (the `dimensions` group), 358/552/554/568 (the metric
contract and its totality), 530/556/598/601 (the same literal audit one
component at a time)
**Status:** done (157 files / 6,003 tests green; both directions verified)

## 1. The bug

`packages/components/src/timeline.tsx` is a shipped component exported from
`packages/components/src/index.ts`. It paints an event rail whose marker column
and dot are two hardcoded pixel sizes:

- `timeline.tsx:151` — the marker column is `width: 16`;
- `timeline.tsx:156-157` — the dot is `width: 8, height: 8`.

Every other fixed surface metric of this class already lives in
`theme.dimensions`: the keycap (`keycapSize`), the calendar cell
(`calendarCellSize`), the time segment (`timeSegmentWidth`), the avatar presence
dot (`avatarPresenceDotSize`), the carousel marks, the notification inbox and its
unread mark, and the date field width. A brand can widen a dialog or a toast but
cannot make a timeline's marker larger or its rail column narrower; the two
values are unreachable from a theme and from a copied `PlatformStyle`.

The relationship they encode is unmeasured as well. The dot is centred inside
the column, so a marker larger than its column paints outside the rail it is
supposed to sit on; this is the same class of defect as plan 556's presence dot
(outside its avatar) and plan 601's date field (narrower than its own chrome).
`themeMetricFailures` returns `[]` for a theme with a 20px timeline dot in a
16px column today, because no rule reads the two numbers.

The colour half is already recorded cross-team: `timeline.tsx` paints the
pending dot with `muted`, which has no surface pair (the `components` row in
`TODO.md` asks for `borderStrong` or `mutedForeground`). This plan deliberately
does not touch a colour, a pair or a floor.

## 2. What changes, and what deliberately does not

**Does not change:** no colour role, palette value, contrast pair, floor,
elevation, motion, spacing, density, platform style, recipe or shipped theme
pixel. The two shipped values (16 and 8) are exactly what the component paints
today; only their ownership moves into the theme.

**Changes:**

1. `packages/tokens/src/scale.ts` — `Dimensions` gains two members with JSDoc:
   - `timelineMarkerSize: number` — 8px, the event dot;
   - `timelineMarkerColumnWidth: number` — 16px, the column the dot and rail sit
     in.
   The default `dimensions` object gains both.
2. `packages/tokens/src/metrics.ts` — two rules in the dimensions section:
   - the marker is at least the connector's width (`borderWidth.thin`): a dot
     thinner than the rail it marks is not a marker;
   - the marker column is at least the marker, so the dot fits the rail.
   Each rule is gated on a usable (`Number.isFinite && > 0`) marker, so a zero
   marker keeps exactly one `positive` diagnostic (the plan-532 rule that one
   cause keeps one report). The `positive` rule is automatic: the dimensions
   walk already covers every member of the theme's own group.
3. `packages/tokens/src/timeline-marker.test.ts` — new co-located suite: the
   shipped values, the 24-set inheritance, the field-by-field merge, and the
   two failing plants (marker larger than its column; marker thinner than the
   rail) plus the zero-marker single-diagnostic case. Its header states the bug
   being guarded.
4. `packages/tokens/src/dimensions.example.ts` — the copy-and-own example moves
   the timeline marker with the rest (12px in a 24px column), so the new members
   are exercised through `themeFailures` rather than merely present.
5. `packages/tokens/src/dimensions.test.ts` — the example case asserts the two
   resolved values and keeps the rest of the group inherited.
6. `docs/tokens.md` — two rows in the Component dimensions table (the table is
   already held to `Object.entries(dimensions)` by `docs.test.ts`, so the rows
   are mandatory) and one sentence in the paragraph that names the marker and
   its two rules.
7. `docs/design-system.md` §6 — one sentence beside the other fixed metrics,
   derived from `dimensions`, with a `docs.test.ts` case holding it.
8. `packages/tokens/README.md` — add the marker to the "Component dimensions
   include …" sentence.
9. `COMPONENTS.md` — the `Design tokens` row names the timeline marker among the
   owned dimensions; the `Theme metric check` row names the two new rules.
10. `TODO.md` — one ticked tokens row for this unit, and one cross-team
    `components` row: read `theme.dimensions.timelineMarkerSize` and
    `timelineMarkerColumnWidth` for `timeline.tsx`'s 16/8 literals, and (the
    colour row already exists) keep the pending dot on a measured role.
11. `.agents/slop/plans/README.md` — index this plan.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/scale.ts` | add two `Dimensions` members and defaults |
| `packages/tokens/src/metrics.ts` | add the two dimension rules |
| `packages/tokens/src/timeline-marker.test.ts` | create |
| `packages/tokens/src/dimensions.example.ts` | extend the example theme |
| `packages/tokens/src/dimensions.test.ts` | assert the two resolved values |
| `docs/tokens.md` | two table rows and one paragraph sentence |
| `docs/design-system.md` | one sentence in §6 |
| `packages/tokens/src/docs.test.ts` | one design-system sentence case |
| `packages/tokens/README.md` | name the marker in the dimensions list |
| `COMPONENTS.md` | Design tokens + Theme metric check rows |
| `TODO.md` | tick this unit; add the cross-team consumer row |
| `.agents/slop/plans/README.md` | index plan 604 |

No other file. **Do not edit** `packages/components/src/timeline.tsx` in this
worktree: that is the `components` workstream.

## 4. The rules, precisely

After the existing per-member `positive` walk for `dimensions`:

```ts
// The connector is `borderWidth.thin`; a marker thinner than the rail it
// marks does not read as a dot.
...(usableBound(dimensions.timelineMarkerSize)
  ? atLeast(
      "dimensions",
      "timelineMarkerSize",
      dimensions.timelineMarkerSize,
      borderWidth.thin,
    )
  : []),
// The dot is centred in the column the rail also occupies, so the column
// must at least contain it.
...(usableBound(dimensions.timelineMarkerSize)
  ? atLeast(
      "dimensions",
      "timelineMarkerColumnWidth",
      dimensions.timelineMarkerColumnWidth,
      dimensions.timelineMarkerSize,
    )
  : []),
```

Both use the theme's own values, so a copied or decoded scale is governed, not
the shipped 8/16. The generic `positive` and `finite` passes already govern the
two members; only the relationships need a rule.

Order matters for one diagnostic per cause: with `timelineMarkerSize: 0`, the
marker is not `usableBound`, so the two dependent rules stay silent and the
`positive` rule reports `timelineMarkerSize` once. With
`timelineMarkerColumnWidth: 0`, only the column's `positive` diagnostic fires.

## 5. The failing plants

| Case | Theme edit | Expected |
| --- | --- | --- |
| marker wider than its column | `{ timelineMarkerSize: 20 }` | one `at-least` on `timelineMarkerColumnWidth`, `actual: 16`, `bound: 20` |
| marker thinner than the rail | `{ timelineMarkerSize: 0.5 }` | one `at-least` on `timelineMarkerSize`, `actual: 0.5`, `bound: 1` |
| zero marker | `{ timelineMarkerSize: 0 }` | one `positive` on `timelineMarkerSize` (no second rule) |
| zero column | `{ timelineMarkerColumnWidth: 0 }` | one `positive` on `timelineMarkerColumnWidth` |
| shipped set | none | `themeFailures` / `themeMetricFailures` return `[]` |
| inherited by every shipped theme, platform variant and recipe | none | each `theme.dimensions` carries 8 and 16 |

`themeMetricFailures` returns only the `dimensions` failures for these edits;
the test asserts exact arrays where the cause is isolated, following
`fixed-surface-metrics.test.ts`.

## 6. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test        # 157 files, all green
nub run --filter @gpuixui/tokens check-types # clean
nub run check                                # check:tests, lint, fmt, types
nub run test                                 # workspace tests
```

## 7. STOP conditions

- STOP if `timeline.tsx` already reads these two values from
  `theme.dimensions`; the premise is then false and the plan must be rewritten.
- STOP if any shipped theme, platform variant or recipe fails the new rules.
  That means a shipped value is inconsistent; do not change a shipped pixel to
  make a guard pass — report it.
- STOP if a metric test asserts an exact **object shape** that a new member
  would break beyond the expected `toEqual(dimensions)` updates; the group is
  walked by key, so a legitimate test must follow the group.
- STOP if a docs guard already names the full dimension list in a way that
  conflicts with the two new rows; update the guard’s owner, not the claim.
- Do not touch `packages/components/**`; the consumer change is a `TODO.md`
  handoff.

## 8. Acceptance

- The two tokens exist, are documented in the catalogue table and the design
  system, and are inherited by every shipped theme.
- `themeMetricFailures` reports the two new relationships, and each case above
  fails on the pre-change implementation and passes after it.
- Every `*.example.ts` still runs; the copy-and-own example moves the marker and
  passes the total check.
- `nub run check`, `nub run lint` and `nub run test` pass.
- Both directions verified by hand and recorded in the commit/audit note.
