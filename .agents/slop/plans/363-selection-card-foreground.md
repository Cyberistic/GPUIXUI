# Plan 363 — the card's own foreground through a text selection

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
071 (the contrast contract), 081/087 (the selection contract), 362 (the status
panel's text roles).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`selectionPairs` maps each selected surface to the role its text paints, and the
`card` entry is `foreground`. But `card` also carries its own public role,
`cardForeground` — documented as "Text on `card`" — and a shipped component
paints it: `packages/components/src/context-menu.tsx:262` sets `card` as the
trigger's fill and `cardForeground` as its colour. The two roles are not always
the same value: they differ in both Windows recipes (`xp` light `#191D25` vs
`#1A1A1A`, `aero` light `#191D25` vs `#101828`).

That role is measured statically (`cardForeground` on `card` in `contrastPairs`)
but never **through the selection wash**. A theme whose card text is readable at
rest but loses its floor once the wash composites over the card returns `[]`
from `themeContrastFailures` while the same edit on `foreground` is reported.
The card is also the one surface in `selectionForegrounds` whose own role the
map does not name, so the omission is structural rather than a forgotten pair.

The probe over the 24 shipped sets finds every set clears the 7:1 body floor
through the wash; the tightest is **9.07:1** (Windows dark). So **no colour
moves** — the pair is a guard, in the same series as plans 314, 316, 319, 320,
334, 335, 339, 346, 348 and 362.

## 2. Decision

Add one pair beside the surface map; keep the default `foreground` pair.

```ts
export const selectionPairs: readonly ContrastPair[] = [
  ...selectionSurfaces.map(/* the default text role per surface */),
  // A card's own text role is `cardForeground`; `CardTitle` paints the default
  // `foreground`, so both are painted on a card and both are measured.
  ["cardForeground", "card", "body"],
  ...selectionSurfaces.map(/* mutedForeground */),
];
```

Rejected alternatives, with reasons:

- **Replace `foreground` with `cardForeground`** — `CardTitle` paints
  `foreground` and arbitrary text inside a card takes the default role, so the
  existing pair is the one the component paints; replacing it would unguard the
  shipped composition.
- **Map `card` to `cardForeground` in `selectionForegrounds`** — the map is one
  role per surface; a card genuinely carries both, so a second pair is the
  smaller, clearer change.
- **Measure `cardForeground` on the four base surfaces** — it is the text role
  *of a card*; a card's content is painted on the card, not on the canvas behind
  it.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

Insert the pair after the first `selectionSurfaces.map(...)` spread in
`selectionPairs`, with the comment above, and extend the JSDoc:

> … the role each surface uses for its own text on the left, and secondary text
> on the right. A card carries two: the default `foreground` a `CardTitle`
> paints and its own `cardForeground`. …

### 3.2 `packages/tokens/src/selection-card-foreground.test.ts` (new)

Header states the bug guarded: the card's own `cardForeground` was measured on
the card but never through the selection wash, and the recipes already ship the
two roles apart.

Cases:

1. **The pair is in the list.** `selectionPairs` contains
   `["cardForeground", "card", "body"]`, and still contains
   `["foreground", "card", "body"]`.
2. **Every shipped set passes.** The 24-set list (as in plan 362) measured on
   the card pair.
3. **Quotes the tightest shipped figure:** Windows dark at **9.07:1**, derived
   with `compositeOver`/`contrastRatio` over the quoted sets.
4. **The regression.** Edit the dark theme's `cardForeground` to
   `compositeOver(dark.selection, dark.card)` and assert exactly one reported
   pair with `wash: "selection"`, `foreground: "cardForeground"`,
   `background: "card"`, `pairClass: "body"`, `floor: 7`, and the ratio the
   checker computes.
5. **The two recipes ship the roles apart.** Assert `xp` and `aero` light have
   `cardForeground !== foreground`, so the pair measures a real difference and
   not two aliases.

### 3.3 Existing suites

- `selection-text.test.ts`: the `selectionPairs` foreground/background arrays
  gain the card pair (background `card` after the nine body surfaces, foreground
  `cardForeground` at the same index).
- `selection-secondary.test.ts`: `selectionPairs.length` 18 → 19; the
  `mutedForeground` count is still `selectionSurfaces.length`.
- `contrast.test.ts`: `selectionPairs.length` 18 → 19; the opaque-wash expected
  array gains `["cardForeground", "card"]` after the nine body pairs.
- `inventory.test.ts` reads `selectionPairs.length`, so the ledger must state 19.

### 3.4 `docs/tokens.md`

- §Text selection: after the sentence naming `accent` with `foreground`, note
  that a card carries two text roles — the default `foreground` a `CardTitle`
  paints and its own `cardForeground` — and both are measured through the wash.
- Checker section: say the selection list holds `cardForeground` on `card`
  beside the default role.
- Verification section: name the pair and plan `363`.
- Pair history: append plan `363` adds `cardForeground` on `card` to
  `selectionPairs` (18 → 19), beside the plain `contrastPairs` list (still
  **338**), tightest **9.07:1**, so no colour moves.

### 3.5 `docs/design-system.md`

- §9 floor table, the "text selection (body text …)" row: add
  "`cardForeground` on `card`".
- §8 interaction-state table, the `text selection` row: name the card's own
  role.

### 3.6 `packages/tokens/README.md`

Add the card role to the selection paragraph's surface list, and the tightest
figure.

### 3.7 `COMPONENTS.md`

- **Theme contrast check** row: `19 selection pairs` (was 18); append a sentence
  naming plan 363, the pair, the 18 → 19 growth, 9.07:1 and that no colour
  moves.

### 3.8 `.agents/slop/plans/README.md`

- Table row:

```
| [363](./363-selection-card-foreground.md) | The card's own foreground through a text selection | F | 071, 081, 087, 362 | done |
```

- Closing paragraph: the two roles a card carries, the recipes that ship them
  apart, the probe figure, the 18 → 19 growth and that no colour moves.

### 3.9 `TODO.md`

- One ticked row under the tokens section; progress bar `130/180` → `131/181`.

`docs.test.ts` guards the §9 row text, so update its expected row in the same
commit.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-card-foreground.test.ts)
# EXPECT: cases 1 and 4 FAIL (the pair is absent, so the regression finds no
# reported failure); cases 2, 3 and 5 pass because they measure the shipped
# themes directly.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-card-foreground.test.ts)
# EXPECT: every case passes.
```

Then:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: all files pass (74 → 75 files, ~4292 tests), `check:tests`, oxlint,
oxfmt, `tsc --noEmit` clean.

Guarded documents:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts \
  src/contrast.test.ts src/selection-text.test.ts src/selection-secondary.test.ts
```

## 5. STOP conditions

- Any shipped set fails the card pair (the plan forbids a colour move).
- `selectionPairs` needs a new list, class or signature — the change is one
  entry.
- The regression case passes on the pre-fix `contrast.ts`.
- A guarded document needs its claim deleted rather than reworded.
- `nub run check` or `nub run lint` fails outside these files.

## 6. Acceptance criteria

- `selectionPairs` has 19 entries and contains both `foreground`/`card` and
  `cardForeground`/`card` at the body floor.
- Every shipped set passes; the tightest is Windows dark at 9.07:1.
- Editing `cardForeground` to the composited wash reports exactly the card pair
  through the wash.
- The two docs pages, the README and the ledger name the card pair and the
  figure; every guarded suite passes.
- No token value, colour, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. `ContextMenuTrigger` already paints the role; no consumer migration.
