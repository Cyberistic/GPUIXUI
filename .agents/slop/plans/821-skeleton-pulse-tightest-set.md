# 821 — The skeleton pulse's "next tightest" figure, and the set it says is tightest

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `078`, `094`,
`311`, `322`, `387`, `393`, `536`, `544`, `619`, `737`.

## 1. The defect

`docs/tokens.md`'s loading paragraph explains why the pulse's dim frame
(`skeleton` composited at `skeletonPulseOpacity`, 0.6) is part of the contrast
contract. Plan `393` found identity dark's `#3D4552` at `1.008:1` on the
`selected` fill, moved the dark skeleton a half-step to `#434C5A`, and wrote:

> The other seven surfaces are wider, and every other shipped set already
> cleared 1.05:1 at 0.6 (**the next tightest is 1.072:1**), so no other value
> moves.

Measured on this tree, both halves of that parenthetical are false:

| Set | Surface | Dim frame (0.6) | Opaque |
| --- | ------- | --------------- | ------ |
| `Light · Windows XP` | `active` (`#D8D2B7`) | **1.059:1** | 1.103:1 |
| `Light · Windows XP` | `selected` (`#BDD4FF`) | 1.072:1 | 1.120:1 |
| `Light · Linux` | `active` | 1.074:1 | 1.131:1 |
| `Dark` (identity) | `selected` (`#402F94`) | 1.074:1 | 1.179:1 |

1. **`1.072` is the *third* tightest, not the next one.** The next tightest
   dim frame below identity dark's `1.074:1` is XP light's `active` wash at
   **`1.059:1`**, which is *tighter than the set the paragraph is about*. The
   paragraph therefore reads as if identity dark were the system's tightest dim
   frame; it is not, and the true tightest set has a margin of only `0.009`
   over the floor, where the sentence claims `0.022`.
2. **The cause is a later palette plan, not a typo.** Plan `619` moved XP
   light's `active` one designed step (`#DDD7BE` → `#D8D2B7`) so the selectable
   row's press cleared its step floor — the same move this workstream's own
   `rowPressStepPairs` publishes. Plan `393`'s audit predates that move *and*
   the XP/Aero recipes joining `shippedThemes` (plans `311`, `387`), so the
   sentence was written against a smaller enumeration.

Nothing derives either half. `docs.test.ts` holds the paragraph's *surface
list* and `skeleton-pulse.test.ts` holds every shipped set to the floor, so a
palette edit that moves a wash can leave the page naming the wrong set and a
`1.072:1` that no set produces while the whole suite stays green. That is the
failure mode plans `536` and `544` fixed for other quoted minima.

No colour, pair, floor, metric, role or shipped theme needs to move: every
shipped dim frame clears `1.05:1` (the tightest is `1.059:1`), so the figure on
the page is wrong, not the palette.

## 2. What the package produces today

`shippedThemes` × `skeletonPulsePairs` (9 surfaces × 24 sets), sorted by the dim
frame:

```
Light · Windows XP   active         1.0592   opaque 1.1035
Light · Windows XP   selected       1.0723   opaque 1.1197
Light · Linux        active         1.0736   opaque 1.1308
Dark                 selected       1.0737   opaque 1.1792
Light · macOS        active         1.0745   opaque 1.1240
```

Identity dark's own nine surfaces, sorted: `selected` 1.0737, `active` 1.2351,
`selectedActive` 1.2450, `accent` 1.2653, `hover` 1.3221, `popover` 1.3709,
`muted` 1.3709, `card` 1.4527, `background` 1.5126 — so "the other seven
surfaces are wider" is true for that set (there are eight others; `popover` and
`muted` share a value), and the sentence should say eight rather than seven
because the list has grown from eight surfaces to nine since plan `322` added
the `accent` wash.

## 3. Decisions

1. **Correct the figure and the claim; move no colour.** The tightest dim frame
   is `Light · Windows XP` on `active` at **`1.059:1`**. The paragraph should
   name that set and surface, and keep identity dark's own pair (`1.074:1` dim,
   `1.179:1` opaque) as the value the move produced.
2. **Do not add a `figures.ts` entry.** `documentedFigures` describes a
   `ContrastPair` measured on one named set and surface, with a fixed sentence
   form (`**{figure}:1** …`) that the catalogue inserts verbatim. This claim is
   two different sentences: one names a *minimum across the enumeration* and
   the other the pair inside one set. Plans `815`, `817` and `818` established
   the purpose-named claims suite for that shape; this plan follows them.
3. **Guard the superlative, not only the number.** The case must derive the
   ordered minimum and assert that the page names *that* set and surface, so a
   palette edit that makes another set tightest fails the page even when both
   figures stay above the floor.
4. **Hold the README's copy of the identity dark figure too** — it quotes
   `1.074:1` as the dim frame the move produced and no test reads it.

## 4. Files to change

1. **create** `packages/tokens/src/skeleton-pulse-claims.test.ts`.
2. `docs/tokens.md` — the loading paragraph (one sentence; no other passage
   states either figure).
3. `TODO.md` — a ticked row and the workstream counter.
4. `.agents/slop/plans/README.md` — the plan row and the closing paragraph.
5. `COMPONENTS.md` — the *Design tokens* row's skeleton clause gains the new
   owner (no figure change; it states neither number today).

No token value, pair, floor, metric, role or shipped theme changes.

## 5. Step 1 — `packages/tokens/src/skeleton-pulse-claims.test.ts`

Header states the bug: the catalogue's loading paragraph says identity dark is
the tightest dim frame and that "the next tightest is 1.072:1", while XP light's
`active` wash (moved by plan `619`) measures `1.059:1` — tighter than the set
the paragraph is about — and no test reads either claim.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `alpha`, `compositeOver`, `contrastRatio`, `extendTheme`, `getTheme`,
`shippedThemes`, `skeletonPulseOpacity`, `skeletonPulsePairs` from `./index.js`.

Helpers (module scope):

```ts
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

const between = (text: string, start: string, end: string): string => { … };

/** The role composited at the pulse's fraction over the surface behind it. */
const dimFrame = (color: string, surface: string): number =>
  contrastRatio(
    compositeOver(alpha(color, skeletonPulseOpacity), surface),
    surface,
  );

const fixed = (value: number): string => value.toFixed(3);

/** Every dim frame in the shipped enumeration, tightest first. */
const frames = (): ReadonlyArray<{
  readonly theme: string;
  readonly surface: keyof ThemeColors;
  readonly ratio: number;
}> => … // shippedThemes × skeletonPulsePairs, sorted by ratio

const catalogueLoading = between(
  prose("../../../docs/tokens.md", import.meta.url),
  "The audit found identity dark at **1.008:1** on `selected`",
  "Brand-toned text is checked on the nine surfaces",
);
const readmeLoading = between(
  prose("../README.md", import.meta.url),
  "identity dark measured **1.008:1** on `selected`",
  "and the decorative `border` at 1.05:1",
);
```

Cases:

1. **the identity dark pair is the shipped one** — `getTheme("dark")` on
   `selected`: `fixed(dimFrame(skeleton, selected)) === "1.074"` and
   `fixed(contrastRatio(skeleton, selected)) === "1.179"`; the catalogue slice
   contains both figures, and the README slice contains `1.074`. This holds the
   two numbers the paragraph uses for the move.
2. **the set the paragraph was about is its own tightest surface** — the nine
   identity dark frames sorted ascending start with `selected`, and the
   catalogue says "The other eight surfaces are wider" (eight, not seven: the
   list grew when plan `322` added `accent`). This holds the "other surfaces"
   half without deriving it from a literal.
3. **the page names the shipped minimum** — `frames()[0]` is
   `Light · Windows XP` / `active`; the catalogue slice contains
   `Light · Windows XP`, `` `active` `` and `**1.059:1**`; it does not contain
   `1.072:1`.
4. **the guard reads the page, not a constant** — a predicate
   `namesTightest(text)` (set, surface and figure all present) returns `true`
   for the catalogue slice and `false` for the pre-fix sentence
   (`… every other shipped set already cleared 1.05:1 at 0.6 (the next tightest
   is 1.072:1) …`) and for the shipped slice with the figure changed to
   `1.060`.
5. **a palette edit moves the minimum** — `extendTheme(getPlatformRecipeTheme("xp", "light"), { colors: { active: "#E4DFCC" } })`
   (a lighter wash) makes some other set the minimum, and `namesTightest` on
   the shipped slice is then `false`; the plugin-free assertion is that the
   derived first entry's set is no longer `Light · Windows XP`. This proves the
   figure tracks the palette rather than the paragraph.

## 6. Test plan

```sh
nub run --filter @gpuixui/tokens test src/skeleton-pulse-claims.test.ts
```

Expected after: one file, five cases green.

**Prove the cases in both directions** (apply, run the file, restore):

1. Restore the old clause (`the next tightest is 1.072:1`) in the catalogue:
   cases 3, 4 and 5 fail. Before the suite exists the same restoration leaves
   the whole package suite green — the §1 evidence.
2. Change the stated figure to `1.060:1`: case 3 fails.
3. Change `Light · Windows XP` in the sentence to `Light · macOS`: case 3
   fails on the set even though the figures are untouched.
4. Change `skeletonPulseOpacity` to `0.7`: case 1 fails (`1.074`/`1.179`) and
   case 3 fails (the minimum moves); the tree must be restored.
5. Reflow the paragraph across lines: still passes — `prose` normalises
   whitespace.
6. README: change `1.074` to `1.075`; case 1 fails.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

No native scenario changes: no runtime behaviour or token value moves, so no
`apps/playground` smoke or live scenario is affected. Record the ids that were
run (none) in the execution record.

## 7. STOP conditions

- Stop if a colour, pair, floor, metric or shipped theme has to move. Every
  shipped dim frame clears `1.05:1`; the defect is the page's figure and claim.
- Stop if the sentence cannot be made assertable from the derived values
  without inventing a number. If so, record the wording problem in `TODO.md`.
- Do not widen the guard to the opaque skeleton pairs (plan `094`'s
  `skeleton-washes.test.ts` owns them) or to the contrast floor (the public
  checker owns it).
- Do not add a `documentedFigures` entry: the sentence names a minimum across
  the enumeration, not one measured pair.
- Do not reword the paragraph's historical clause about `1.008:1`: it is
  past-tense evidence for plan `393`'s bug and is correct as history.

## 8. Acceptance

- `skeleton-pulse-claims.test.ts` derives the identity dark pair, the
  nine-surface order inside that set, the shipped minimum's set/surface/figure,
  and proves the predicate can fail on the pre-fix sentence and on a planted
  palette.
- The catalogue names `Light · Windows XP`'s `active` wash at `1.059:1` and no
  longer states `1.072:1`; the README's `1.074:1` is held by the suite.
- Each mutation in §6 fails the file, and the tree is restored afterwards.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are clean.
- `TODO.md` ticks the row and keeps the counter current; the plan index lists
  `821`; the ledger names the new owner.

## 9. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states: restoring the plan-`393` sentence
  (`… every other shipped set already cleared 1.05:1 at 0.6 (the next tightest
  is 1.072:1) …`) failed cases 2 and 3 of the new suite and left the rest of the
  package green; the pre-fix sentence quotes the third-tightest frame and no set
  produces `1.072:1` on its own.
- `skeleton-pulse-claims.test.ts` adds five cases: identity dark's pair
  (`1.074` dim / `1.179` opaque, held in the catalogue and the README), the
  nine-surface order inside that set (`selected` first, and the paragraph's
  "other eight"), the enumeration's ordered minimum (`Light · Windows XP` /
  `active` / `1.059`), the reader predicate against the pre-fix sentence and two
  tampered copies, and a planted palette that moves the minimum off XP.
- Every §6 mutation was applied alone, the new file run and the tree restored:
  the restored old clause failed cases 2 and 3; `1.059` → `1.060` failed case 3;
  naming `Light · macOS` failed cases 3 and 4; `skeletonPulseOpacity` at `0.7`
  failed cases 1 and 3; the README's `1.074` → `1.075` failed case 1; the
  restored tree passed.
- `docs/tokens.md` now names `Light · Windows XP`'s `active` wash at
  **`1.059:1`**, says eight surfaces instead of seven, and states that plan
  `619` moved the wash after the audit. The README's `1.074:1` is unchanged and
  now held by the suite.
- `nub run --filter @gpuixui/tokens test` → **223 files / 7143 tests** green
  (222 / 7138 before; one file with five cases added). `nub run check` clean.
- **No native scenario was run**: no runtime code or token value moves, and this
  worktree has no `apps/playground/dist` build (`apps/playground/dist/smoke/run.js`
  is absent — the playground build is blocked by `BLOCKERS.md` B1, another
  workstream's task).
