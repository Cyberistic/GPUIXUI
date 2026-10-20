# Plan 781: the platform style headers must name their own readable ink

**Status:** ready.
**Workstream:** `tokens-theme`. Owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`.
**Depends on:** 063 (platform styles), 082 (`primaryText`), 528 and 591 (the two
moves that made the sentences stale), 356 (the snippet guard convention).

## 1. The defect

Each shipped platform style is a **file a consumer copies and edits** — MISSION's
acceptance is "a consumer can take one platform theme file, edit it, and ship
their own look". The three real style files open with a JSDoc header that states
the accent's readable text step by quoting it:

| File | Header says (light / dark) | `primaryText` it ships (light / dark) |
| ---- | -------------------------- | ------------------------------------ |
| `src/platform-styles/macos.ts` | `#0055B3` / `#A4D4FF` | **`#00478F`** / `#A4D4FF` |
| `src/platform-styles/linux.ts` | `#12488F` / `#99C1F1` | `#12488F` / **`#B4D5F7`** |
| `src/platform-styles/windows.ts` | `#005BA1` / `#76D0FF` | **`#004A82`** / `#76D0FF` |

Every one of the six quoted values was correct when plan 082 wrote the sentences.
Two later palette plans moved the role and left the prose:

- plan 528 moved macOS light `#0055B3` → `#004A9A`, Windows light `#005BA1` →
  `#004F8A` and XP `#003FA8` → `#003A9C` (`selectionLinkPairs`);
- plan 591 (`de030aba`, *hold inline code text on its accent wash*) moved macOS
  light `#004A9A` → `#00478F`, macOS dark `#96CDFF` → `#A4D4FF`, Linux dark
  `#A5CBF5` → `#B4D5F7`, Windows light `#004F8A` → `#004A82` and XP
  `#003FA8` → `#003A9C`.

So today:

- **macOS** names a colour that is no longer any role in the file — `#0055B3`
  occurs once, in the header;
- **Windows** names `#005BA1`, which is the file's **`primaryHover`**, as the
  readable text step;
- **Linux** names `#99C1F1`, which is the file's **`primaryHover`** (dark), as
  the readable text step.

That is the `primary`-as-text confusion the role split exists to prevent (plan
082: a fill is a surface, `primaryText` is the ink). A consumer copying the macOS
file gets a header that tells them to paint links one role generation out of
date; the Windows and Linux headers point at a hover **fill**.

Nothing guards the **hexes at the head of these sentences**.
`platform-claims.test.ts` derives the four fill figures the same sentences carry
(plan 535) and `platforms.test.ts` holds the palettes to the contrast floors, but
no suite reads the readable-ink pair — which is the first thing a copier reads.

The **fill figures in the same sentences are correct** and stay: macOS
`#0071E3` measures 4.21:1 on its canvas and `#2E93FF` 4.47:1 on its dark card,
Linux `#1C71D8` 3.51:1 on its pressed wash, Windows `#0067C0` 4.30:1 on its
pressed wash (re-derived in §2.3, and already owned by plan 535). Only the two
text-step values drift, and only in one mode per file — the pair the header is
meant to state.

## 2. The fix

Three one-line prose corrections, and the guard that should have read them.

### 2.1 The three headers

`packages/tokens/src/platform-styles/macos.ts`, the line beginning "The accent's
readable text step is":

```
- * `#A4D4FF` dark: the fill's `#0071E3` measures 4.21:1 on the canvas and
+ * `#A4D4FF` dark: the fill's `#0071E3` measures 4.21:1 on the canvas and
```
with `#0055B3` replaced by `#00478F` in the first half of that sentence. Match on
`step is \`#0055B3\` light` so the edit cannot touch anything else.

`packages/tokens/src/platform-styles/linux.ts`:

```
- step is `#12488F` light and `#99C1F1` dark; the fill's `#1C71D8` is 3.51:1 on
+ step is `#12488F` light and `#B4D5F7` dark; the fill's `#1C71D8` is 3.51:1 on
```

`#99C1F1` is also the dark `primaryHover`, so match the whole
`` `#12488F` light and `#99C1F1` dark `` run — not the bare hex.

`packages/tokens/src/platform-styles/windows.ts`:

```
- * `#005BA1` light and `#76D0FF` dark; the fill's `#0067C0` is 4.30:1 on the
+ * `#004A82` light and `#76D0FF` dark; the fill's `#0067C0` is 4.30:1 on the
```

`#005BA1` is also the light `primaryHover`, so match
`` step is `#005BA1` light `` — not the bare hex.

Do **not** touch a palette value, a ratio, a plan number, the XP/Aero recipes
(they quote no hex in their headers), `default.ts` (no colours), or either page.
`docs/tokens.md` §*Brand-toned text* already quotes the shipped macOS value
(`#00478F`) and the passages at lines 1666/1766/3827 quote `#0055B3`,
`#005BA1` and `#99C1F1` as **pre-move** values in plan history; they are correct
and stay.

### 2.2 The guard: `packages/tokens/src/platform-header-text-step.test.ts`

A new suite beside the files it reads, in the repo's `node:fs` documentation-guard
convention (`contrast-reference.test.ts`, `snippets.test.ts`). It imports each
style module, resolves its theme through `getPlatformTheme`, and holds the header
to the data:

```ts
/**
 * Guards the defect plan 781 fixes: each platform style header states its
 * accent's readable text step by quoting a hex, and two palette plans moved
 * `primaryText` while the prose stayed. macOS named `#0055B3`, a colour the file
 * no longer declares at all; Windows named `#005BA1` and Linux dark `#99C1F1`,
 * which are each file's `primaryHover` — a hover *fill* presented as the ink the
 * role split exists to separate. `platform-claims.test.ts` owns the figures the
 * sentences carry; no suite read the pair of hexes before them.
 *
 * Every case below derives its expectation from the module's own palette through
 * the resolver, so the next `primaryText` move fails here.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { linuxPlatformStyle } from "./platform-styles/linux.js";
import { macosPlatformStyle } from "./platform-styles/macos.js";
import { windowsPlatformStyle } from "./platform-styles/windows.js";
import { getPlatformTheme } from "./theme.js";
```

The file supplies:

- `headerOf(file)`: read the module, take everything before `export const`, strip
  the JSDoc `*` prefixes and collapse whitespace (the headers are hard-wrapped);
- `styles`: the three imported style modules keyed by platform;
- `variants`: the three pairs `{ platform, file }`;
- `textStepSentence(header)`: the one sentence a header states about the ink,
  from "The accent's readable text step is" to "(plan 082).".

Three cases:

1. **The sentence names the shipped ink.** Assert the header contains

   ```ts
   `The accent's readable text step is \`${light.colors.primaryText}\` light and \`${dark.colors.primaryText}\` dark`
   ```

   built from `getPlatformTheme(platform, mode)` for the variant. The failure
   message is the expected sentence, so a palette move says exactly what the
   header must become. The figures after that clause stay `platform-claims.test.ts`'s
   job (plan 535); this suite owns the two hexes before it.

2. **No header quotes a colour the file does not declare.** Collect every
   `#RRGGBB` in the header and the style's own `colors.light` + `colors.dark`
   values; every header hex must be one of them (`#0055B3` is the case this
   catches: an orphan after a move that left no other trace).

3. **No pointer fill is presented as the ink.** For both modes, the sentence
   must not contain `primaryHover` or `primaryActive` unless that value *is* the
   ink (Windows dark's hover legitimately equals its `primaryText`). This is the
   derived form of "the header named a different role's colour": it catches
   Windows' `#005BA1` and Linux dark's `#99C1F1` without hardcoding either.

### 2.3 The figures in the same sentences

Re-derived on the merged tree while auditing the defect (they already match, and
plan 535's `platform-claims.test.ts` owns them):

| Platform | Fill | Surface | Ratio |
| -------- | ---- | ------- | ----- |
| macOS light | `#0071E3` | canvas `#F2F2F7` | 4.21 |
| macOS dark | `#2E93FF` | card `#2C2C2E` | 4.47 |
| Linux light | `#1C71D8` | pressed wash `#DCDCE2` | 3.51 |
| Windows light | `#0067C0` | pressed wash `#DCDCE2` | 4.30 |

They are unchanged by this plan, which is why the three edits touch one hex
each. A later palette move fails `platform-claims.test.ts` and, for the ink,
this new suite.

### 2.4 Documents and bookkeeping

- `docs/tokens.md` and `docs/design-system.md`: **no edit**. They do not quote
  the Linux or Windows text step, and the macOS one they quote (`#00478F`) is
  the shipped value.
- `packages/tokens/README.md`: **no edit**. It names the platform table through
  `platformTypes`, not per-platform inks.
- `COMPONENTS.md`, the `Platform style variants` row: append one clause —
  each style file's header states the ink it ships and
  `platform-header-text-step.test.ts` holds the sentence to the palette, because
  plan 528 and 591 moved `primaryText` while three headers kept plan 082's
  value (plan 781).
- `.agents/slop/plans/README.md`: add one row to the `tokens-theme` table:
  `| [781](./781-platform-style-text-step.md) | The three platform headers that name the wrong readable ink | F | 063, 082, 528, 591 | done |`.
- `TODO.md`, under *Design tokens and theming*: one ticked row phrased as the
  defect, with "(plan 781)".

## 3. Commands and expected results

Run from the worktree root.

```sh
# 1. can-fail: write the test BEFORE editing the three headers
cd packages/tokens && nub exec vitest run src/platform-header-text-step.test.ts
# expected: FAIL, 3 of 3 — the macOS ink sentence (#0055B3), the orphan-hex
# case for macOS #0055B3, and the pointer-fill case for Linux dark #99C1F1.
# Record the exact messages.

# 2. apply the three edits, then
cd packages/tokens && nub exec vitest run src/platform-header-text-step.test.ts
# expected: PASS (3 cases).

# 3. the touched suites
cd packages/tokens && nub exec vitest run src/platforms.test.ts src/platform-claims.test.ts \
  src/platform-composition.test.ts src/docs.test.ts src/readme.test.ts \
  src/snippets.test.ts src/inventory.test.ts src/guards.test.ts
# expected: PASS.

# 4. typecheck and the package suite
cd packages/tokens && nub exec tsc -p tsconfig.json --noEmit
nub run --filter @gpuixui/tokens test
# expected: PASS (209 files; the new suite adds one file and three cases).

# 5. gates
nub run check
nub run lint
nub run test
# expected: all green.
```

## 4. STOP conditions

- The §2.2(1) sentence **passes before the header edits**. Then the headers are
  already correct and this plan's premise is wrong: report the derived sentence,
  keep the guard, and stop — do not invent a diff.
- A palette value disagrees with §2.3. Then a later plan moved a fill and left
  *these* figures stale too: correct the header from the derived sentence (that
  is the same defect) and record the move in §7; do not change a colour.
- Editing a header breaks a documentation case (`docs.test.ts`,
  `snippets.test.ts`). Those suites read pages and `@example` fences, not module
  headers; a failure means the edit matched more than the intended sentence —
  revert it and re-match on the longer run from §2.1.
- A style file's header is asserted by another workstream's test. Then report it
  and leave that header alone; the remaining two still land.
- A quoted fill figure is wrong when `platform-claims.test.ts` runs (it derives
  all four). That is a different defect from this one: report it and leave the
  figure to a separate plan rather than changing a colour here.

## 5. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| the ink sentence, all three files | a header naming the pre-move ink (macOS `#0055B3`, Windows `#005BA1`, Linux dark `#99C1F1`) | Yes — it fails on the shipped headers today (recorded in §7) |
| header hexes are declared values | the orphan `#0055B3` class — a quoted colour the file no longer carries | Yes — the macOS header fails it before the fix |
| no pointer fill presented as the ink | a header that calls `primaryHover`/`primaryActive` the readable ink | Yes — Linux dark fails it before the fix; Windows light is the same shape |
| `platform-claims.test.ts` (existing) | the four fill **figures** these sentences carry | already in place since plan 535; unchanged |

Two-direction proof recorded in §7:

1. before: `vitest run src/platform-header-text-step.test.ts` fails all three
   cases with the stale macOS ink, the orphan hex and Linux dark's hover fill;
2. after: the same command passes three;
3. revert one header (keep the test) and the same failure returns.

## 6. Acceptance criteria

- The three headers name their own `colors.light.primaryText` /
  `colors.dark.primaryText`; the four fill figures stay as plan 535 measured
  them.
- `platform-header-text-step.test.ts` exists, fails on the pre-fix headers and
  passes after, and covers the orphan-hex and pointer-fill rules.
- No token value, ratio, pair, floor, metric, role or shipped theme moves;
  `contrastPairs` stays **470** and the figure table stays **70**.
- The plan is indexed, `TODO.md` has the ticked row, and `COMPONENTS.md` records
  the guard.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Execution record

- **Before the fix**, with `platform-header-text-step.test.ts` in place and the
  three headers unchanged, the suite failed **3 of 3**:
  - `state the readable ink their palette ships` — at `macos.ts`, expected
    `The accent's readable text step is `#00478F` light and `#A4D4FF` dark` and
    the header carried `#0055B3`;
  - `quote no colour their palette does not declare` —
    `macos.ts #0055B3: expected false to be true`: the hex is not a value in
    either palette;
  - `names no other role's colour as the ink` — at `linux.ts`,
    `linux dark #99C1F1: expected 'The accent's readable text step is …' not to
    contain '#99C1F1'`; the sentence is `The accent's readable text step is
    `#12488F` light and `#99C1F1` dark; the fill's `#1C71D8` is 3.51:1 on the
    pressed wash (plan 082).` Windows light is the same defect one file over
    (`#005BA1` against the shipped `#004A82`).
- **After the three edits**: `vitest run src/platform-header-text-step.test.ts`
  passes **3 tests**; `platform-claims.test.ts` still passes, so the four fill
  figures these sentences carry did not move.
- **The both-directions proof**: with the three style files reverted and the new
  test kept, all **3** cases fail with the messages above; re-applying the three
  one-word edits returns the suite to green.
- **The figures were already right**: recomputed from the resolved themes while
  auditing — macOS `#0071E3` 4.2089 on `#F2F2F7` and `#2E93FF` 4.4687 on
  `#2C2C2E`, Linux `#1C71D8` 3.5138 on the pressed wash, Windows `#0067C0`
  4.2980 — which is why the three edits touch one hex each, and why plan 535's
  suite stays the owner of them.
- **Green after**: `nub exec tsc -p tsconfig.json --noEmit` passes; the eight
  touched suites pass (**3245 tests**, `platform-claims.test.ts` included);
  `@gpuixui/tokens` is **209 files / 7045 tests** (up from 208 / 7042 — the new
  suite's three cases); `nub run check`, `nub run lint` and `nub run test` pass.
- **No token moves**: no colour, pair, floor, metric, role or shipped theme
  changed; `contrastPairs` stays **470** (`contrast.test.ts:574`) and the figure
  table stays **70**.
- **Documents**: `docs/tokens.md` and `docs/design-system.md` needed no edit —
  they already quote the shipped macOS ink (`#00478F`) and the three pages'
  `#0055B3`/`#005BA1`/`#99C1F1` mentions are pre-move values in plan history.
  `COMPONENTS.md`'s `Platform style variants` row records the guard.

