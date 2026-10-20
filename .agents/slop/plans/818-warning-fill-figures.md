# 818 — The light `warning` fill's fill-only figure is restated in twelve passages and derived in two

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `057`, `332`,
`348`, `399`, `733`, `749`, `806`, `810`, `815`, `817`.

## 1. The defect

Every document that explains why a solid status role is a fill, and why
`warning` and `info` carry no mark pair, rests on one measurement: **the light
identity `warning` fill is `1.78:1` against the canvas**, under the `3:1` mark
floor. `docs.test.ts` derives that sentence twice — `docs/tokens.md`
§*Status tones* ("The solid roles are fills and marks, never foregrounds …") and
`docs/design-system.md` §3 ("The solid roles are surfaces, and three of them are
also marks …") — and both cases are correct and valuable.

The same figure is then **restated twelve more times**, and nothing derives those
restatements: the catalogue's two other passages, the design system's mark-floor
paragraph, the package README, the ledger, and four public source modules whose
JSDoc a consumer reads in their editor. A palette edit that satisfies the two
guarded cases therefore leaves twelve passages arguing from a number the package
no longer produces, and every gate stays green.

Measured on this tree, before the fix: the two guarded sentences restored to the
shipped figure, **the other twelve occurrences of `1.78` replaced by `1.79`**,
and the full suite run — **220 files / 7130 tests stayed green**. The
`docs.test.ts` cases cannot see them, because each case reconstructs one
sentence; nothing owns "every passage that states this figure".

The twelve, with the claim each supports:

| File | Passages |
| ---- | -------- |
| `docs/tokens.md` | §*Colour roles* "`warning` and `info` are fill-only: light `warning` is 1.78:1 on the canvas"; §*Status tones* "a status *dot* is still `xText` … the light `warning` fill is 1.78:1 on the canvas" |
| `docs/design-system.md` | §9 "Status marks are `xText`, never the solid status fill, because the light `warning` fill is **1.78:1** on the canvas" |
| `packages/tokens/README.md` | "A status dot or label stays `xText`: the light `warning` fill is 1.78:1 on the canvas" |
| `COMPONENTS.md` | the *Status tones* row: "The solid fills are surfaces, not foregrounds: light `warning` is 1.78:1 on the canvas" |
| `packages/tokens/src/color.ts` | `ThemeColors.warning` JSDoc: "A fill only: light `warning` is 1.78:1 on the canvas" |
| `packages/tokens/src/contrast.ts` | `markPairs` JSDoc, `markRoles` JSDoc and the exemption rationale (three passages) |
| `packages/tokens/src/styles.ts` | `statusTone` JSDoc and the two solid-role JSDoc blocks (three passages) |

Why it matters: the figure is the *premise* of a contract decision, not a
decorative ratio. It says the fill sits below the mark floor, so a status label,
icon or dot must read `xText`. If a palette lift made `warning` a legible mark,
the sentence would still say "fill-only" — and twelve of the fourteen places a
reader can meet that claim would still quote the old number, including the
public JSDoc that ships to consumers.

No colour, pair, floor, metric, role or shipped theme moves: every stated figure
is correct today.

## 2. What the palette produces today

```
identity light `warning`  #F5B01F
on `background` #F6F8FA   1.78:1     mark floor 3
on `card`       #FFFFFF   1.89:1     mark floor 3
identity light `success`  4.26:1 on `background`   mark 3, secondary 4.5
```

Fourteen passages state the canvas figure, across seven files:

| File | Occurrences |
| ---- | ----------- |
| `docs/tokens.md` | 3 |
| `docs/design-system.md` | 2 |
| `packages/tokens/README.md` | 1 |
| `COMPONENTS.md` | 1 |
| `packages/tokens/src/color.ts` | 1 |
| `packages/tokens/src/contrast.ts` | 3 |
| `packages/tokens/src/styles.ts` | 3 |

Two of the fourteen are the sentences `docs.test.ts` already derives; the guard
below reads all fourteen, so the count is one enumeration rather than "two owned
and twelve not". One further passage states the same fact in the other voice —
"the solid `warning` is **1.78:1** on the light canvas" in `docs/tokens.md`
§*Verification* — and is deliberately out of scope: `docs.test.ts` derives it
(plan `332`) and it names `solid \`warning\``, not `light \`warning\``.

`COMPONENTS.md` also contains `light \`warning\` edge measured 1.12:1`, the
soft-edge mixture at high contrast, and both pages contain "the high-contrast
light `warning` **surface**". Those are a different role and a different claim;
the guard rejects the `high-contrast light \`warning\`` form by lookbehind.

## 3. Decision

1. Add `packages/tokens/src/warning-fill-claims.test.ts`, which derives the
   fill's canvas figure from `getTheme("light")` and the `mark` floor from
   `contrastFloors`, reads every passage that states the figure in the seven
   files, and holds each occurrence — and the per-file count — to the derived
   value.
2. State the owner in the catalogue's §*Verification* paragraph list, so a
   reader knows the fourteen passages are held.
3. Change no prose value. Every figure is correct; the missing owner is the
   defect.
4. Do not fold the figure into `figures.ts`: that table's entries are a
   `ContrastPair` measured over `shippedThemes` with one named set and surface
   per sentence, and this claim is fourteen passages plus a premise
   (`figure < mark floor`). A purpose-named claims suite is the pattern plans
   `815` and `817` established.

## 4. Files to change

1. **create** `packages/tokens/src/warning-fill-claims.test.ts`.
2. `docs/tokens.md` — one sentence in §*Verification* naming the new owner; no
   figure changes.
3. `COMPONENTS.md` — the *Status tones* row names the new owner; no figure
   changes.
4. `TODO.md` — a ticked row and the section counter.
5. `.agents/slop/plans/README.md` — the plan row, the closing paragraph, and
   `817`'s status column corrected to `done` (it is executed; `f307c39c`).

No token value, pair, floor, metric, role or shipped theme changes.

## 5. Step 1 — `packages/tokens/src/warning-fill-claims.test.ts`

Header states the bug: the light `warning` fill's fill-only rationale rests on
`1.78:1` against the canvas; `docs.test.ts` derives the two sentences that argue
it from the palette, and twelve further passages — the catalogue's two other
statements, the design system's mark-floor paragraph, the README, the ledger and
four public JSDoc blocks — restate the same number with no owner, so replacing
all twelve left 220 files / 7130 tests green.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `contrastFloors`, `contrastRatio` from `./contrast.js`;
`extendTheme`, `getTheme` from `./theme.js`. Nothing else.

Helpers (module scope):

```ts
/** The seven files that state the light `warning` fill's canvas figure. */
const passages = [
  ["../../../docs/tokens.md", 3],
  ["../../../docs/design-system.md", 2],
  ["../README.md", 1],
  ["../../../COMPONENTS.md", 1],
  ["./color.ts", 1],
  ["./contrast.ts", 3],
  ["./styles.ts", 3],
] as const;

const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

/**
 * Every passage that states the fill's contrast with the canvas: `light
 * \`warning\`` — either capitalisation — followed by the figure, up to a
 * sentence break. The high-contrast `warning` *soft surface* is another role
 * and another claim, so a phrase preceded by `high-contrast ` is excluded.
 */
const stated = (text: string): ReadonlyArray<string> =>
  [
    ...text.matchAll(
      /(?<!high-contrast )[Ll]ight `warning`[^.;]*?(\d+\.\d\d):1/g,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const fixed = (value: number): string => value.toFixed(2);
```

Cases:

1. **the figures are the palette's** — on `getTheme("light")`, `fixed` of
   `contrastRatio(warning, background)` is `"1.78"`, of
   `contrastRatio(warning, card)` is `"1.89"`, and of
   `contrastRatio(success, background)` is `"4.26"`; both `warning` figures are
   below `contrastFloors.default.mark`, and `success` is at or above the mark
   floor and below `contrastFloors.default.secondary`. That is the premise the
   word "fill-only" rests on.
2. **every passage states the shipped figure** — for each entry of `passages`,
   `stated(prose(file))` has the declared length and every member equals the
   derived canvas figure. A file that gains or loses a passage fails on the
   length; a stale digit fails on the figure. The case message names the file.
3. **the guard reads what the pages say, not a number** — `stated` on a
   rewritten copy of `docs/tokens.md` with the figure changed returns the
   changed value (so the helper is a reader, not a constant), and `stated` on
   "the 30% mixture it replaced measured 1.12:1 on the high-contrast light
   `warning` surface" returns `[]` (so the soft-edge passage cannot be counted
   as this claim). This is the `toContain`-free half: it proves the pattern can
   distinguish the two claims.
4. **the premise can fail** — `extendTheme(getTheme("light"), { colors: { warning: colors.background } })`
   derives `1.00`, below the floor; a lifted fill
   (`{ colors: { warning: "#6B4500" } }`) derives a figure at or above the mark
   floor, so "fill-only" is a property of the shipped palette rather than of the
   role, and a palette that crosses it must revisit the sentence.

Deliberately not asserted: the two sentences `docs.test.ts` already derives
(this suite reads them as occurrences, it does not re-derive their wording), the
§*Verification* sentence plan `332` derives, `markPairs`/`trackMarkPairs`
membership (`solid-role-claims.test.ts`), and the soft-edge mixture.

## 6. Test plan

```sh
nub run --filter @gpuixui/tokens test src/warning-fill-claims.test.ts
```

Expected after: one file, four cases green.

**Prove every case in both directions** (apply, run the file, revert — one at a
time):

1. Replace the twelve unguarded occurrences of `1.78` with `1.79`: case 2 fails
   on every file. Before the suite exists the same mutation leaves the whole
   package suite green — the §1 evidence.
2. Change `palette.amber[400]` (the light `warning` role) to `#D9A400`: the
   derived canvas figure becomes `2.13`, so case 1 fails on the anchor and case 2
   fails on all fourteen passages. A one-step nudge (`#F5B01F` → `#F5B020`) does
   **not** fail, and must not: the figure rounds to the same two decimals, so
   every document is still true.
3. Delete one occurrence (e.g. `styles.ts`'s third): case 2 fails on the length.
4. Add a passage to `README.md`: case 2 fails on the length until the table
   records it.
5. Move `contrastFloors.default.mark` to `1.7`: case 1 fails, because the
   premise's bound is read from the export. (A floor *above* the figure leaves a
   true claim true — `1.78 < 4` — so the mutation that proves the anchor is the
   one that falls under it.)
6. Reflow one passage across lines: it still passes — every §2 passage is
   already wrapped, and `prose` normalises whitespace, which is the point.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: **221** test files and **7134** tests green (220 / 7130 before; one
file with four cases added). No native scenario changes: no runtime behaviour or
token value moves, so no `apps/playground` smoke or live scenario is affected.

## 7. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. Every
  stated figure is correct.
- Stop if a passage has to be reworded to become assertable. Add the assertion
  the existing wording supports; if the wording makes it unassertable, record it
  in `TODO.md` instead of rewording a figure.
- Do not touch the two `docs.test.ts` sentences or `figures.ts`.
- Do not widen the guard to the high-contrast `warning` soft surface or the
  soft-edge mixture: they are different roles and different claims.
- Do not replace the derived figure with a literal in the test, and do not fall
  back to a bare `toContain("1.78")`: containing a number is the defect this plan
  closes. Case 3 exists to keep the guard a reader.

## 8. Acceptance

- `warning-fill-claims.test.ts` derives the canvas figure, the card and
  `success` anchors and both floors, and holds all fourteen passages — counts
  included — plus the two distinguishing cases.
- Each mutation in §6 fails the file, and the tree is restored afterwards.
- `nub run --filter @gpuixui/tokens test` is green (221 files, 7134 tests),
  `nub run check`, `nub run lint` and `nub run test` clean.
- `TODO.md` ticks the row and keeps the section counter current; the plan index
  lists `818` and marks `817` done; the catalogue and the ledger name the new
  owner.

## 9. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states, before the suite existed: with the two
  `docs.test.ts` sentences restored and the other twelve occurrences of `1.78`
  set to `1.79`, the whole package suite was green — **220 files / 7130 tests**.
  The first experiment (all fourteen mutated) failed exactly two cases,
  `docs.test.ts`'s *quotes the status ratios the light palette produces* and
  *quotes the warning figure the design system repeats*, which is what narrowed
  the scope from "the card figure" to "the twelve unguarded restatements".
- `warning-fill-claims.test.ts` adds four cases: the anchors (canvas, card and
  `success` figures plus the `mark` and `secondary` floors), every passage with
  its per-file count, a reader check that separates the fill's claim from the
  high-contrast `warning` soft surface, and a planted-palette premise.
- Every §6 mutation was applied alone, the new file run and the tree restored:
  the twelve-passage mutation and the count mutations (a deleted `styles.ts`
  passage, an added `README.md` one) failed case 2; `palette.amber[400]` at
  `#D9A400` failed cases 1 and 2 (`2.13` against the page's `1.78`); the `mark`
  floor at `1.7` failed case 1; the restored tree passed. A one-step nudge of the
  amber ramp derives the same `1.78`, as §6.2 now records.
- `nub run --filter @gpuixui/tokens test` → **221 files / 7134 tests** green;
  `nub run check`, `nub run lint` and `nub run test` clean.
- No prose figure changed, because every figure was already correct and twelve of
  them were unowned. **No native scenario was run**: no runtime code or token
  value moves, and this worktree has no `apps/playground/dist` build
  (`apps/playground/dist/smoke/run.js` is absent — the playground build is
  blocked by `BLOCKERS.md` B1, another workstream's task).
