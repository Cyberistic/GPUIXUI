# Plan 665 — The elevation-content prose names every fill, not nine of fifteen

## Why

Plan 610 joined `disabled`, `skeleton` and `track` to `contentFillSurfaces`
because a menu or popover opens across a disabled control, a loading row and a
value groove, taking the `md` elevation walk from twelve to fifteen painted
pairs. The floor table's elevation row was derived and moved; three prose
paragraphs that describe the same walk did not:

| Location | Claim | Contract |
| -------- | ----- | -------- |
| `docs/tokens.md` (*Elevation*, ~line 1254) | "the four filled actions, the three solid status chips, the raised panel action and the four soft status panels" — **12** | `elevationContentSurfaces.length` is **15** |
| `docs/tokens.md` (elevation check, ~line 2361) | `primary` … `softAction` and the four soft panels — **12** | 15 |
| `docs/design-system.md` §7 (~line 356) | "the four filled actions, the three solid status chips, the raised panel action and the four soft status panels" — **12** | 15 |

The same catalogue already says "the **fifteen** resting content fills" in the
scrim paragraph and in plan 610's own audit paragraph, so the page contradicts
itself. `docs.test.ts` derives the floor table's elevation row from
`elevationContentSurfaces`, but no test reads these three prose sentences — a
reader following the elevation section is told three measured surfaces are not
part of the walk.

No colour, pair, floor, metric, check or shipped theme changes.

## Scope

Documentation truth only:

- the three paragraphs name all fifteen fills, in `elevationContentSurfaces`
  order, with the derived count word;
- one guard in `docs.test.ts` holds every paragraph that says
  "`elevationContentSurfaces` names" to the index.

## Files

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | two elevation paragraphs list all fifteen fills and say "fifteen". |
| `docs/design-system.md` | §7's mid-paragraph lists all fifteen fills. |
| `packages/tokens/src/docs.test.ts` | a case derives the count and the member list from `elevationContentSurfaces` for every paragraph that names it. |

## Exact edits

### 1. `docs/tokens.md` — the *Elevation* section (~line 1254)

Replace

```
resting content fills `elevationContentSurfaces` names — the four filled
actions, the three solid status chips, the raised panel action and the four soft
status panels — so its shadow is measured there too;
```

with

```
resting content fills `elevationContentSurfaces` names — `primary`,
`secondary`, `accent`, `destructive`, `info`, `success`, `warning`,
`softAction`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`,
`disabled`, `skeleton` and `track` — so its shadow is measured there too;
```

and change the preceding `A menu or popover (`md`) also opens across the` to name
the derived count:

```
A menu or popover (`md`) also opens across the fifteen
```

### 2. `docs/tokens.md` — the elevation check (~line 2361)

Replace

```
resting content fills `elevationContentSurfaces` names — `primary`,
`secondary`, `accent`, `destructive`, `info`, `success`, `warning`,
`softAction` and the four soft status panels — because a dropdown opens across
the button beside its trigger and a context menu over a Badge;
```

with the same fifteen-name list used above, followed by

```
— because a dropdown opens across the button beside its trigger and a context
menu over a Badge;
```

and make the lead sentence "also opens across the fifteen resting content
fills".

### 3. `docs/design-system.md` §7 (~line 356)

Replace

```
resting content fills `elevationContentSurfaces` names — the four filled
actions, the three solid status chips, the raised panel action and the four soft
status panels — because a dropdown opens across the button beside its trigger;
```

with the same fifteen-name list (backticked) and the derived count in the lead:

```
resting content fills `elevationContentSurfaces` names — `primary`,
`secondary`, `accent`, `destructive`, `info`, `success`, `warning`,
`softAction`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`,
`disabled`, `skeleton` and `track` — because a dropdown opens across the button
beside its trigger;
```

### 4. `packages/tokens/src/docs.test.ts`

`elevationContentSurfaces` is already imported and `countWord` already exists.
Add a case beside the elevation floor-row case:

```ts
it("names every content fill in the prose that describes the md walk", () => {
  const paragraphs = [markdown, designSystemSource]
    .flatMap((document) => document.split(/\n{2,}/))
    .filter((paragraph) =>
      paragraph.includes("`elevationContentSurfaces` names"),
    );

  // The catalogue has two (elevation section and the check) and the design
  // system one. A new paragraph that names the index must enumerate it.
  expect(paragraphs).toHaveLength(3);
  paragraphs.forEach((paragraph) => {
    expect(paragraph).toContain(
      `the ${countWord(elevationContentSurfaces.length)} resting content fills`,
    );
    elevationContentSurfaces.forEach((surface) => {
      expect(paragraph, surface).toContain(`\`${surface}\``);
    });
  });
});
```

`countWord` currently lives above the `describe` blocks in this file and is
already used by the catalogue-count cases, so no new helper is needed. If the
flat split picks up the floor-table row (it does not, because that row says
"the resting content fills" without the index phrase), keep the positive
`toHaveLength(3)` assertion rather than filtering table rows out silently.

## Commands, in order

Before the edits, prove the guard can fail:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts
```

Expected: the new case fails with `paragraphs` containing the three stale
paragraphs and the missing `disabled`/`skeleton`/`track` members (and the count
word `fifteen`). If it passes before the edits, the guard is not reading the
prose — stop and report.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/elevation-contrast.test.ts
nub run check-types
```

Then the workstream gates from the repository root:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. Do not quote a test count in the commit message.

## STOP conditions

- `elevationContentSurfaces` no longer has fifteen members: stop and report. The
  prose must follow the list, not the number this plan observed.
- The phrase "`elevationContentSurfaces` names" appears in a paragraph this plan
  did not update and that is not the floor row: stop and report; enumerate it in
  this plan's style rather than letting the guard fail on an unrelated sentence.
- Any figure other than the count word needs to move: stop. This plan moves no
  colour, pair, floor or metric.
- A test outside `docs.test.ts` and `elevation-contrast.test.ts` fails: stop and
  report rather than editing an unrelated document.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | Run the new case on the pre-fix documents: each paragraph misses `disabled`, `skeleton` and `track`, and the lead word is absent. |
| Passes with the fix | The same case after the three edits; the elevation-contrast suite and the full tokens suite stay green. |
| Cannot pass by deleting the list | The positive count and the per-member `toContain` both derive from the index; removing the enumeration fails as surely as leaving it stale. |
| Cannot pass on a new paragraph | `expect(paragraphs).toHaveLength(3)` fails when a fourth paragraph starts naming the index without enumerating it. |

## Acceptance

- [ ] All three elevation-content paragraphs name the fifteen fills the walk
      measures, in `elevationContentSurfaces` order.
- [ ] The count word in each derives from `elevationContentSurfaces.length`.
- [ ] The new guard fails on the pre-fix documents and passes after the edits.
- [ ] No colour, pair, floor, metric, check or shipped theme moves.
- [ ] `nub run check`, `nub run lint` and `nub run test` are green.
