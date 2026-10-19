# Plan 666 — The scrim explanation names the three chips it counts

## Why

`docs/tokens.md` has two present-tense paragraphs that enumerate the surfaces
`overlayWashPairs` composites the scrim over. The first one (the *Elevation* /
overlay section, ~line 2303) was updated when plan 508 joined the three solid
status chips to `overlaySurfaces`, and it names them. The second (the contrast
contract audit, ~line 3847) was not:

```
`overlayWashPairs` composites `overlay` over `background`, `card`, `muted`,
`input`, `selected`, `popover`, the resting filled actions (`primary`,
`secondary`, `accent`, `destructive`), the raised action a status panel carries
(`softAction`), the four soft status panels (…), a disabled control (`disabled`),
a loading row (`skeleton`) and a value groove (`track`)
```

That is **18** of the **21** surfaces `overlaySurfaces` names; the three solid
status chips (`info`, `success`, `warning`) that plan 508 added are missing.
The same paragraph closes by quoting "the tightest of the twenty-one pairs", so
the page states the count and under-lists the members in one breath. Its final
rationale sentence also calls the missing group "the three resting fills" — a
name that matches nothing in the role set — where it means the three solid
status chips.

No colour, pair, floor, metric, check or shipped theme changes.

## Scope

Documentation truth only:

- the audit paragraph in `docs/tokens.md` enumerates the three chips and says
  "twenty-one";
- the ambiguous "three resting fills" clause names the chips;
- one guard in `docs.test.ts` derives the count and the member list from
  `overlaySurfaces` for this paragraph.

## Files

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | the contrast-contract scrim paragraph names `info`/`success`/`warning`, the derived count and the chips in the rationale clause. |
| `packages/tokens/src/docs.test.ts` | a case slices that paragraph and holds its count and every `overlaySurfaces` member to the index. |

## Exact edits

### 1. `docs/tokens.md` (~line 3847)

Replace

```
The modal scrim is a surface wash too. `overlayWashPairs` composites `overlay`
over `background`, `card`, `muted`, `input`, `selected`, `popover`, the
resting filled actions (`primary`, `secondary`, `accent`, `destructive`), the
raised action a status panel carries (`softAction`), the
four soft status panels (`infoSoft`, `successSoft`, `warningSoft`,
`destructiveSoft`), a disabled control (`disabled`), a loading row (`skeleton`)
and a value groove (`track`), and holds the result to 1.05:1, because a scrim
```

with

```
The modal scrim is a surface wash too. `overlayWashPairs` composites `overlay`
over the twenty-one surfaces `overlaySurfaces` names — `background`, `card`,
`muted`, `input`, `selected`, `popover`, the resting filled actions
(`primary`, `secondary`, `accent`, `destructive`), the three solid status chips
a Badge paints (`info`, `success`, `warning`), the raised action a status panel
carries (`softAction`), the four soft status panels (`infoSoft`, `successSoft`,
`warningSoft`, `destructiveSoft`), a disabled control (`disabled`), a loading
row (`skeleton`) and a value groove (`track`) — and holds the result to 1.05:1,
because a scrim
```

Then in the same paragraph replace

```
layout, the page's actions and the panel's action keep their resting fills, a
status panel stays on screen and the three resting fills stay painted, so all of
them are measured
```

with

```
layout, the page's actions and the panel's action keep their resting fills, a
status panel stays on screen and the three solid status chips stay painted, so
all of them are measured
```

Keep "The tightest of the twenty-one pairs" as it is; the guard derives its
word from the index.

### 2. `packages/tokens/src/docs.test.ts`

`overlaySurfaces`, `countWord` and the `markdown` source are already in scope.
Add a case beside the other catalogue scrim cases:

```ts
it("names every scrim surface in the contrast audit's explanation", () => {
  const from = markdown.indexOf("The modal scrim is a surface wash too.");
  const to = markdown.indexOf("an 80% black veil over black", from);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  const explanation = markdown.slice(from, to).replace(/\s+/g, " ");

  expect(explanation).toContain(
    `the ${countWord(overlaySurfaces.length)} surfaces \`overlaySurfaces\` names`,
  );
  overlaySurfaces.forEach((surface) => {
    expect(explanation, surface).toContain(`\`${surface}\``);
  });
  expect(explanation).not.toContain("the three resting fills");
});
```

Whitespace is normalised because the paragraph wraps at 80 columns.

## Commands, in order

Before the edits, prove the guard can fail:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts
```

Expected: the new case fails on `info` (or the first missing chip) and on the
count phrase, because the paragraph says neither. If it passes before the edits,
the guard is not reading the paragraph — stop and report.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts src/overlay-scrim.test.ts
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

- `overlaySurfaces` no longer contains `info`, `success` and `warning`, or its
  length is not 21: stop and report; the prose follows the list.
- The paragraph has already been rewritten by another plan and the anchor
  strings are absent: stop and report rather than inventing a new location.
- Any figure other than the count word needs to move: stop. This plan moves no
  colour, pair, floor or metric.
- A test outside `docs.test.ts` and `overlay-scrim.test.ts` fails: stop and
  report rather than editing an unrelated document.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | The new case on the pre-fix paragraph: no `twenty-one … names` phrase, `info`/`success`/`warning` absent, and the stale "three resting fills" present. |
| Passes with the fix | The same case after the edits; the overlay-scrim suite and the full tokens suite stay green. |
| Cannot pass by deleting the paragraph | The positive count and per-member assertions derive from `overlaySurfaces`; removing the explanation fails as surely as leaving it short. |
| Cannot pass by renaming the stale clause only | `overlaySurfaces.forEach` still requires each chip in backticks, so the rationale sentence alone is not enough. |

## Acceptance

- [ ] The contrast-audit scrim paragraph names all 21 surfaces, the three chips
      included, and its count derives from `overlaySurfaces`.
- [ ] The "three resting fills" phrase is replaced by the three solid status
      chips it meant.
- [ ] The new guard fails on the pre-fix paragraph and passes after the edits.
- [ ] No colour, pair, floor, metric, check or shipped theme moves.
- [ ] `nub run check`, `nub run lint` and `nub run test` are green.
