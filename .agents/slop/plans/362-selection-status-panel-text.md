# Plan 362 — text selection in a status panel

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
091 (`selectionSoftPairs`), 320 (body text on the soft fills), 346 (a status
panel's caption and link), 351 (the floor table derived from the contract).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Three text roles are painted inside a status panel, and the contract measures
two of them only against the fill, not through a text selection:

| Role | Painted by | Measured on the fill | Measured through `selection` |
| ---- | ---------- | -------------------- | ---------------------------- |
| `xSoftForeground` | the Alert/Badge/Toast title | `contrastPairs` (body) | `selectionSoftPairs` (plan 091) |
| `foreground` | `AlertDescription`, the ghost dismiss control (plan 320) | `softBodyPairs` (body) | **no pair** |
| `mutedForeground` | a caption or supporting line in the panel (plan 346) | `softPanelTextPairs` (secondary) | **no pair** |

A reader copies an alert's description or a toast's caption with the pointer like
any other body text. `themeContrastFailures` therefore returns `[]` for a theme
whose soft fill and selection wash make the selected body or caption unreadable,
while the same edit on a plain surface is reported.

A probe over the 24 shipped sets (identity × mode × contrast, three platform
variants × mode × contrast, both recipes × mode × contrast) measures the gap:

```
identity dark default: foreground through selection on infoSoft = 7.26:1  (floor 7)
Aero light default:    mutedForeground through selection on destructiveSoft = 4.78:1  (floor 4.5)
```

Both pass, so **no colour moves** — the missing pairs are a guard, exactly like
plans 314, 316, 319, 320, 334, 335, 339, 346 and 348. The tightest body pair is
only **0.26** above its floor, so the guard has teeth: a small edit of the wash,
the accent or a soft tint can break it.

`primaryText` is deliberately **not** added. Plan 087 already documents that
accent-toned text under a wash is not guaranteed at AAA, and the probe confirms
why: in the default sets macOS light measures 4.16–4.32:1 for `primaryText`
through the wash on the four fills (under the 4.5:1 secondary floor), and every
AAA light set measures 5.38–5.90:1 (under 7:1). Adding it would ship a shipped
failure no palette edit can fix while keeping the wash perceivable; the design
system already states the omission. The plan adds the sentence evidence to the
catalogue so the omission is recorded where the new pairs live.

## 2. Decision

Extend the existing `selectionSoftPairs` list from four pairs to twelve; no new
pair class, floor, export, role or colour.

```ts
export const selectionSoftPairs: readonly ContrastPair[] =
  softSurfaceRoles.flatMap(
    (background): ReadonlyArray<ContrastPair> => [
      [`${background}Foreground`, background, "body"],
      ["foreground", background, "body"],
      ["mutedForeground", background, "secondary"],
    ],
  );
```

Rejected alternatives, with reasons:

- **A new exported list** (`selectionSoftBodyPairs`) — splits one composition
  across two names and leaves `themeContrastFailures` to remember both; the
  existing list is already "the text roles a soft status panel carries through
  the wash", so extending it is the smaller surface.
- **Measure only the body role** — a Toast's caption is selected with the body
  around it, and plan 087 already established that secondary text carries its own
  floor through the wash.
- **Add `primaryText`** — no shipped palette can satisfy it (see §1), and a
  red gate on every shipped theme is not a guard.
- **Add the three roles to `selectionPairs` instead** — that list is keyed by a
  surface→role map of the nine plain surfaces; the soft fills need the tone role
  interpolated per fill, which is why plan 091 put them in their own list.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

Replace the `selectionSoftPairs` definition (currently four explicit entries)
with the flatMap above, and extend its JSDoc:

> The text roles a soft status panel carries, through the selection wash: the
> tone's own foreground (the title), default body text (`AlertDescription`, the
> ghost dismiss control) and the quiet caption or supporting line. A reader
> copies any of the three, and the wash composites over the fill, so each is
> held to its own floor. Accent-toned text is the one deliberate omission
> (plan 087): no perceivable wash keeps a link at 7:1 at AAA.

Also extend the `themeContrastFailures` JSDoc sentence that names
`selectionSoftPairs` (the "An Alert, Badge or Toast is measured the same way"
passage) to say the list holds the tone's foreground, the body and the caption.
No signature, list name or export changes.

### 3.2 `packages/tokens/src/selection-status-panel.test.ts` (new)

Header comment states the bug guarded: the body and caption of a status panel
were measured on the fill but not through the selection wash, so an edited theme
could erase them while `themeContrastFailures` returned `[]`.

Cases:

1. **Every shipped set passes.** Iterate the same 24-set list the other suites
   build (`themeModes` × `themeContrasts` for the identity, `platformNames`
   without `default` × both axes, `platformRecipeNames` × both axes) and assert
   no pair in `selectionSoftPairs` misses `contrastFloors[theme.contrast]`.
2. **The list is the three roles on the four fills.** Assert length 12 and the
   exact `[foreground, background, pairClass]` content, in order:
   tone foreground / body, `foreground` / body, `mutedForeground` / secondary
   for `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`.
3. **Quotes the tightest shipped figures** from the probe (§1), derived with
   `compositeOver` + `contrastRatio` over the quoted sets (identity light/dark,
   the three platform variants light/dark, both recipes light):
   - `foreground` on `infoSoft` through `selection`: **identity dark, 7.26**;
   - `mutedForeground` on `destructiveSoft` through `selection`: **Aero light, 4.78**.
4. **The body regression.** `extendTheme(getTheme("light"), { colors: { infoSoft:
   lightTheme.colors.foreground } })` must report exactly the pair
   `foreground`/`infoSoft`/`wash: "selection"`/`body`/floor 7, with a ratio
   below 7.
5. **The caption regression.** `extendTheme(getTheme("light"), { colors: {
   warningSoft: lightTheme.colors.mutedForeground } })` must report exactly the
   pair `mutedForeground`/`warningSoft`/`wash: "selection"`/`secondary`/floor 4.5.
6. **`primaryText` stays out, with evidence.** Assert the list contains no
   `primaryText` pair, and that the shipped macOS light `primaryText` through the
   wash on `infoSoft` is under the secondary floor — the measured reason for the
   omission. Use `contrastRatio`/`compositeOver` on `getPlatformTheme("darwin",
   "light")`.

### 3.3 `packages/tokens/src/contrast.test.ts`

- "covers every documented pair": `selectionSoftPairs.length` moves `4` → `12`.
- The opaque-wash and brand-theme cases already spread `selectionSoftPairs`, so
  their expected arrays grow automatically. The quiet brand case hard-codes
  `selected` failures = `9`; the four soft-fill caption pairs now also fail
  (its `mutedForeground` is too quiet), so it becomes `13` and its background set
  gains the four soft fills. Update the literal and the comment if one names the
  count.

Run the file and reconcile any other expected-array case the suite reports; do
not weaken a filter to hide a pair.

### 3.4 `docs/tokens.md`

**a. §Text selection** (the paragraph ending "a soft status surface carries its
own tone with `xSoftForeground`."): extend the sentence to name the three roles:

> … a soft status surface carries its own tone with `xSoftForeground`, its
> description with `foreground` and its caption with `mutedForeground`.

**b.** The paragraph that starts "The soft surfaces are held in both directions
too": change the `selectionSoftPairs` clause to say it measures all three text
roles through the wash, add the quoted tightest figures from §1, and add the
deliberate `primaryText` omission with its measured reason.

**c. Checker section** (¶ "An Alert, Badge or Toast is measured the same way"):
say `selectionSoftPairs` holds the tone's foreground, the body and the caption
through the wash.

**d. Verification section** (¶ starting "Text selection is measured in both
directions"): name the body and caption on the four soft fills and the plan
number.

**e. Pair history:** append a sentence after the plan 357 sentence: plan `362`
adds a status panel's body and caption to `selectionSoftPairs` (4 → 12), beside
the plain `contrastPairs` list, so the plain count stays **338**; the tightest
pairs are 7.26:1 and 4.78:1, so no colour moves.

**f.** If the page's own prose states the soft-list count as four anywhere else,
reconcile it from the list (the guards in §4 catch this).

### 3.5 `docs/design-system.md`

- §9 floor table, the "text selection on a soft status fill" row: name
  `xSoftForeground`, `foreground` and `mutedForeground` over the wash on the four
  fills.
- §8 interaction-state table, the `text selection` row: replace "including the
  four soft status fills (`xSoftForeground`)" with the three roles.
- The "Not covered, deliberately" accent-toned bullet: add that the omission
  covers the soft status fills as well (no numeric claim).

### 3.6 `packages/tokens/README.md`

After "The audit found identity light `successSoftForeground` … (plan 091).",
add one sentence: the panel's description (`foreground`, body floor) and caption
(`mutedForeground`, secondary floor) are measured through the same wash on the
four soft fills (plan 362), and accent-toned text stays the documented omission.
Keep the existing guarded phrase at the start of that paragraph intact.

### 3.7 `COMPONENTS.md`

- **Theme contrast check** row: `12 soft-selection text pairs` (was 4) and append
  a sentence naming plan 362, the two roles, the 4 → 12 growth, the tightest
  figures and that no colour moves. `338 contrast pairs` stays.
- **Design tokens** row: no count changes; if a sentence lists what selection
  covers, add the body and caption on a status panel.

### 3.8 `.agents/slop/plans/README.md`

- Add the table row:

```
| [362](./362-selection-status-panel-text.md) | Text selection in a status panel | F | 091, 320, 346, 351 | done |
```

- Add the closing paragraph in the same voice: the three roles, the probe figures,
  the 4 → 12 growth, the deliberate `primaryText` omission and that no colour
  moves.

### 3.9 `TODO.md`

- Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming
  the gap, the two roles, the tightest figures, the 4 → 12 growth and that no
  colour moves.
- Update the section progress bar from `129/179` to `130/180`.

## 4. Test plan and both directions

`scripts/verify-two-directions.sh` drives `jj`, which is not installed (PLAN D1).
Prove both directions with git:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-status-panel.test.ts)
# EXPECT: cases 2, 4 and 5 FAIL on the pre-fix list — the list is four pairs, so
# the length/content case sees 4, and neither regression case finds a reported
# body or caption pair. Cases 1, 3 and 6 pass: they measure the shipped themes
# and the quoted figures directly, and the pre-fix list is a subset.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/selection-status-panel.test.ts)
# EXPECT: every case passes.
```

A regression case that passes in the first run means it does not guard the fix —
STOP and rewrite it.

Then the full gate:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: all suite files pass (currently 73 files / 4280 tests; +1 file and
5–6 cases), `check:tests` reports every test asserts something, `tsc --noEmit`
is clean for `packages/tokens` and `packages/deploy`, oxfmt/oxlint clean.

Also run the guarded documents and the contract:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/contrast.test.ts
```

Expected: all pass after §3.3–§3.7. `docs.test.ts` still finds the reworded
selection sentences (update its expected strings in the same commit — do not
delete a guarded claim), `inventory.test.ts` finds `12 soft-selection text
pairs`, `readme.test.ts` keeps its phrase.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails a new pair (the plan
  forbids a colour move);
- `primaryText` is already measured through the wash somewhere, or a shipped
  set fails it after the change (the omission is documented, not newly created);
- `themeContrastFailures` needs a signature change, a new pair class or a new
  exported list — the change is one existing list's content;
- a regression case passes on the pre-fix `contrast.ts`;
- `docs.test.ts`, `inventory.test.ts` or `readme.test.ts` rejects a reworded
  sentence in a way that needs the claim deleted rather than updated;
- `nub run check` or `nub run lint` fails outside these files.

## 6. Acceptance criteria

- `selectionSoftPairs` has exactly 12 entries: the tone's foreground (`body`),
  `foreground` (`body`) and `mutedForeground` (`secondary`) on each of the four
  soft fills.
- Every shipped set returns `[]` for the new pairs; the tightest are 7.26:1
  (identity dark `foreground` on `infoSoft`) and 4.78:1 (Aero light
  `mutedForeground` on `destructiveSoft`).
- Setting a soft fill to `foreground` reports exactly the body pair through the
  `selection` wash; setting one to `mutedForeground` reports exactly the caption
  pair.
- `selectionSoftPairs` contains no `primaryText` entry, and the test records the
  measured reason (macOS light default below the secondary floor).
- The two docs pages, the package README and the ledger row name the two roles,
  the 4 → 12 growth and the deliberate omission; the guarded suites pass.
- The regression cases fail on the pre-fix `contrast.ts` and pass after it.
- No token value, colour, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The composition is already shipped (`AlertDescription` and the ghost
dismiss control paint `foreground` on the tone root; plan 346 records the caption
and link), so the pair describes what exists. No consumer migration is implied.
