# 066 — The token reference must name every public value

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth) |
| Owner | **tokens-theme workstream** (`docs/tokens.md`, `docs/design-system.md`, `packages/tokens`) |
| Depends on | plans `056`–`065` (the docs guards and the platform variants) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`docs/tokens.md` opens with a promise: **“This page is the reference: if a token
is not here, it is not public.”** Nothing holds the page to that promise. Seven
public **value** exports of `@gpuixui/tokens` are absent from it today:

| Export | What it is |
| ------ | ---------- |
| `defaultDensity` | the `comfortable` preset; the density every built-in theme uses |
| `lightColors`, `darkColors` | the semantic role sets behind the two shipped themes |
| `highContrastLightColors`, `highContrastDarkColors` | the role sets behind the two high-contrast themes |
| `lightElevation`, `darkElevation` | the shadow sets behind the two shipped themes |

A consumer reading the reference cannot discover them, and a future export can
ship undocumented without failing any gate. The existing guards (`056`, `058`,
`059`, `062`, `065`) check *values and claims*; none checks **coverage**.

The same page documents the platform variants as “copy a style file and edit
it”, but never shows the `PlatformStyle` shape a consumer must reproduce. MISSION
acceptance says a consumer can take one platform theme file, edit it, and ship
their own look. The call is documented; the editable file is not. The executed
example (`src/platform-styles.example.ts`) extends a resolved theme, which is a
different flow from authoring a style file.

Finally, `docs/design-system.md` §8 lists the interaction states but omits
**loading**, though MISSION’s design-system requirement names “interaction,
disabled, loading, focus and selection states”. The package ships the pieces
(`skeleton`, `motion.pulse`, `primary` for the indicator); the rationale document
just never says so.

## 2. Design decision

1. **Coverage guard.** Import the package namespace in `docs.test.ts`
   (`import * as Tokens from "./index.js"`) and assert that every value export’s
   name appears in `docs/tokens.md`. Type-only exports are erased at runtime and
   are out of scope; the page already covers the important shapes in its Theme
   API section. A new value export without a sentence in the page now fails the
   suite. This is the same one-way method as the other docs guards: the
   implementation is the source, the document must contain it.
2. **Document the seven omissions honestly**, not as an export dump:
   - `defaultDensity` under **Density**;
   - the four role sets and two elevation sets under **Theme API**, with the
     rule that components read `theme.colors` / `theme.elevation` and the raw
     sets exist for tooling and table generation.
3. **Show the platform style shape** under **Platform styles** with a complete,
   typed example, and put the example in source so it is type-checked and
   tested: add `contosoPlatformStyle` (a full `PlatformStyle` authored from
   scratch, as a consumer would after copying a file) plus its resolver to
   `packages/tokens/src/platform-styles.example.ts`. `platforms.test.ts` proves
   it applies through `applyPlatformStyle` and inherits the identity’s unnamed
   roles. The prose block is then a transcription of compiled code, not a sketch.
4. **Add the loading row** to the design-system state table. One row, no new
   token: the state is `skeleton` fill plus `pulse` (or `step`) motion, with the
   active indicator on `primary`.

**Not in scope.** No theme data or public API change; no new token. No change to
`packages/tokens/README.md` (plan `065` guards it; its copy sentence stays true).
No markdown structural parsing beyond the existing tests.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/066-public-value-coverage.md` | **create** (this file) |
| `packages/tokens/src/docs.test.ts` | **add** a `describe("docs/tokens.md public values")` block with the coverage guard |
| `packages/tokens/src/platform-styles.example.ts` | **add** `contosoPlatformStyle` (full `PlatformStyle`) and `resolveAuthoredPlatformStyle` |
| `packages/tokens/src/platforms.test.ts` | **add** one `it` for the authored style: label, colours, shape apply; unnamed roles inherit; high-contrast base keeps its colours |
| `docs/tokens.md` | **edit** Density (`defaultDensity`), Theme API (the six raw sets), Platform styles (shape + copyable example link), and the opening claim sentence stays |
| `docs/design-system.md` | **edit** §8: add the loading row |
| `COMPONENTS.md` | **edit** the **Design tokens** row notes: the reference page is now coverage-guarded |
| `TODO.md` | **add** one ticked task; keep the progress bar current |
| `.agents/slop/plans/README.md` | **add** the `066` index row and its explanatory paragraph |

## 4. The guard

Append to `packages/tokens/src/docs.test.ts`. Import the namespace once:

```ts
import * as Tokens from "./index.js";
```

The block:

```ts
describe("docs/tokens.md public values", () => {
  it("names every value the package exports", () => {
    const undocumented = Object.keys(Tokens).filter(
      (name) => !markdown.includes(name),
    );
    expect(undocumented).toEqual([]);
  });
});
```

`Object.keys` on the module namespace lists runtime values only; a type export is
erased. The failure message names the missing export, which is the actionable
part. If a future export is deliberately internal, it must not be exported from
`index.ts` — do not add an allowlist.

## 5. Exact documentation edits

### 5.1 `docs/tokens.md` — Density

After the preset table and before the `controlHeight` snippet, add:

> `defaultDensity` is the `comfortable` preset, and every built-in theme uses it.
> A theme’s `density` always names the preset it is based on, including after a
> partial metric override.

### 5.2 `docs/tokens.md` — Theme API

After the merge-rules list, add a paragraph:

> The role and shadow sets behind the shipped themes are exported as
> `lightColors`, `darkColors`, `highContrastLightColors`,
> `highContrastDarkColors`, `lightElevation` and `darkElevation`. They are the
> objects each theme points at, exported for tooling and table generation;
> component source reads `theme.colors` and `theme.elevation`, never a fixed set.
> A consumer theme may share an untouched set or replace it through
> `extendTheme`.

### 5.3 `docs/tokens.md` — Platform styles

Add an **Authoring a platform style** subsection after the copy/extend snippet:

- the `PlatformStyle` shape as a `ts` block (`types`, `structure`, `colors` per
  mode, `elevation` per mode; every field optional except the families and
  label, so unnamed roles inherit the identity);
- the complete `contosoPlatformStyle` example, linked to
  [`src/platform-styles.example.ts`](../packages/tokens/src/platform-styles.example.ts);
- one sentence: `applyPlatformStyle(getTheme(mode), contosoPlatformStyle)` is the
  same call the shipped variants use, so a copied file cannot take a path the
  library does not test.

### 5.4 `docs/design-system.md` — §8 interaction states

Add one row after `pressed` (order: hover, pressed, **loading**, selected,
disabled, focus, text selection, status):

> `| loading | `skeleton` fill with `pulse` or `step` motion; the active indicator uses `primary` |`

Keep it on one line in the table so the markdown stays readable.

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; records the new total
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

Record the observed test count in the commit message; do not predict a number.

## 7. STOP conditions

Stop and report if:

- `Object.keys(Tokens)` contains a name that no honest sentence can document
  (that means the export is internal and should leave `index.ts`) — do not add an
  allowlist;
- the copyable example cannot be typed as `PlatformStyle` without a cast — the
  shape is then wrong and needs its own decision, not a workaround;
- a platform-style test needs a colour pair that fails the contrast floors — that
  is a product bug, not a docs bug; fix it with its own test;
- the doc grows a second platform-style example — one complete file is the
  requirement; link the shipped files for the rest.

## 8. Test plan

- **Coverage guard.** Fails today: `defaultDensity`, the four colour sets and the
  two elevation sets are absent. After the edits it passes. Prove both
  directions: run the suite before adding the sentences and observe the failure
  naming at least `defaultDensity`; add the sentences, observe green.
- **Authored platform style.** The new `it` asserts the resolved theme’s name
  carries the copied label, its `primary` is the copied value, its radius and
  density come from the copied structure, an unnamed role still equals the base,
  and a high-contrast base keeps its colours. Mutating `contosoPlatformStyle`’s
  accent must fail the second assertion — observe it, then restore.
- **Loading row.** Prose only; the contrast suite already holds `skeleton` and
  `primary` to their floors where they are pairs.

## 9. Acceptance criteria

- `docs.test.ts` fails when a value export is removed from `docs/tokens.md`,
  naming it.
- All seven previously undocumented exports are documented with intent, not as a
  list dump.
- `platform-styles.example.ts` contains a complete `PlatformStyle` authored from
  scratch; it type-checks, is applied in a test, and is linked from the docs.
- `docs/design-system.md` §8 names the loading state.
- `COMPONENTS.md` and `TODO.md` record the work.
- The gate commands in §6 exit 0, and both failing directions were observed.
