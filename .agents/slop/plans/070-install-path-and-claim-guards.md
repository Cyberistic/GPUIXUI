# 070 — Install-path truth and the last unguarded design-system claims

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth, documentation completeness) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/design-system.md`) |
| Depends on | plans `062` (design-system truth guard), `065` (README guard), `066` (public value coverage) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Three claims in this workstream's own documents are not held to the
implementation, and one mission-named design-system topic is absent.

1. **The README's install command does not exist.** `packages/tokens/README.md`
   opens "Install and import" with `nub add @gpuixui/tokens`. But
   `packages/tokens/package.json` is `"private": true` at `0.0.0`, its `exports`
   point at `src/`, and its own Limitations section says "the package is private,
   so a consumer compiles it directly" and that Phase G publishes it. `nub` is
   pnpm-shaped: `nub add <name>` resolves `<name>` from a registry, and no
   registry has ever had this private workspace name. The front door therefore
   sends a consumer to a dead command, and nothing guards the section.
2. **The design-system document names the platform families in prose.**
   `docs/design-system.md` §5 says `Menlo` on macOS, `DejaVu Sans Mono` on Linux,
   `Consolas` on Windows and `Menlo` for an unknown platform, and names the sans
   sentinel. Plan `065` guarded the README's platform table; plan `062` guarded
   the design-system's numeric claims. Neither guards this sentence. Editing
   `platform-styles/linux.ts` to another family leaves every test green while the
   rationale document lies.
3. **The "icon sizing/alignment" mission item is half documented.**
   `MISSION.md`'s design-system list requires icon sizing **and alignment**.
   §6 states the five size tiers and stops. The alignment rule exists in the
   implementation — a control is a flex row centred on the cross axis, the
   icon/label gap is `spacing.sm`, and an icon-only control is square at the
   control's height with no horizontal padding (`packages/primitives/src/core/style.ts`,
   `controlStyle`) — but the design system never states it, so a new component
   has no rule to follow.

**Not in scope.** The runtime claims (no `outline*`, no `focusVisible`, eight
`MotionStyle` properties, no `registerFont`, no scrollbar tint) are facts about
GPUix `0.10.0`, already evidenced in `docs/tokens.md` and `COMPONENTS.md`. Leave
them as prose.

## 2. Design decision

Follow the method of plans `058`/`062`/`065`: **build the exact sentence from the
implementation and require the document to contain it.** No markdown parser, no
regex over prose.

- The install guard is **conditional on the manifest**, because the truthful
  instruction changes at publication: while `private === true` the README must
  present the workspace dependency; once published it must present
  `nub add @gpuixui/tokens`. Writing the condition into the test is what stops a
  future edit from pinning the wrong half.
- Both documents are whitespace-wrapped, so normalise with
  `.replace(/\s+/g, " ")` exactly as the existing guards do.
- Guard only membership and values the implementation owns. The *alignment rule*
  is a design decision, not derived data; guard the one number it quotes
  (`spacing.sm`) so a spacing edit cannot leave the sentence stale.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/070-install-path-and-claim-guards.md` | **create** (this file) |
| `packages/tokens/README.md` | replace the install block: workspace dependency now, registry command after Phase G |
| `packages/tokens/src/readme.test.ts` | add the install-path guard (reads `package.json`) |
| `docs/design-system.md` | add the icon-alignment paragraph to §6 |
| `packages/tokens/src/docs.test.ts` | guard the platform-family sentence and the alignment gap |
| `COMPONENTS.md` | extend the **Design tokens** row's notes with the two new guards |
| `TODO.md` | one new task under the tokens block, ticked; progress count updated |
| `.agents/slop/plans/README.md` | index row and explanatory sentence for `070` |

**Do not change** the theme data, the public API, the platform style values,
`docs/tokens.md`, or any other package. If a guard exposes a mismatch between a
document and the implementation, the implementation is right unless its value is
demonstrably a bug — a value change needs its own plan.

## 4. Exact edits

### 4.1 `packages/tokens/README.md` — install

Replace:

````md
## Install and import

```sh
nub add @gpuixui/tokens
```
````

with:

````md
## Install and import

The package is **private until Phase G**, so it installs from this workspace, not
from a registry. Add it to the consuming package's `dependencies` and install:

```json
{ "dependencies": { "@gpuixui/tokens": "workspace:*" } }
```

```sh
nub install
```

Once published, the same entry installs with `nub add @gpuixui/tokens`.
````

Keep the two import examples that follow, unchanged.

### 4.2 `packages/tokens/src/readme.test.ts` — the install guard

Add `import packageJson from "../package.json";` beside the existing imports, and
this `it` inside the top-level `describe`:

```ts
it("presents an install path that exists today", () => {
  // A private workspace package is never on a registry, so `nub add` would be
  // a dead command. The truthful instruction changes at publication, so the
  // manifest decides which half the README must present.
  const install =
    packageJson.private === true
      ? '"@gpuixui/tokens": "workspace:*"'
      : "nub add @gpuixui/tokens";
  expect(readme).toContain(install);
});
```

Update the file header: add the install path to the list of claims it guards, and
say why (a front door that sends a consumer to a 404).

### 4.3 `docs/design-system.md` §6 — icon alignment

After the paragraph "Icon and avatar sizes are **fixed tiers**, …", add:

```md
Icon size is a tier; alignment is a rule. An icon shares the horizontal flex row
of the text it belongs to and is centred on the cross axis — never
baseline-aligned, because the runtime's line box and the SVG's own box do not
share a baseline. The gap between icon and label is `spacing.sm` (6px). An
icon-only control is square at the control's height and takes no horizontal
padding, so its hit target stays the size the density preset promises. Inline
icons take `xs` so they do not raise the line box, control icons `md`, and
toolbar or navigation icons `lg` or `xl`. The icon set owns its markup rules; the
design system owns the size tier and the alignment.
```

### 4.4 `packages/tokens/src/docs.test.ts` — two guards

Imports: `platformTypes` and `systemUiFont` already come from `./platforms.js`;
`spacing` already comes from `./scale.js`. No new imports are needed.

Inside `describe("docs/design-system.md", …)` add:

```ts
it("names the platform families the implementation ships", () => {
  expect(designSystem).toContain(
    `Sans is GPUI's \`${systemUiFont}\` sentinel`,
  );
  expect(designSystem).toContain(
    `Mono comes from the platform table (\`platformTypes\`): \`${platformTypes.darwin.mono}\` on macOS, \`${platformTypes.linux.mono}\` on Linux, \`${platformTypes.win32.mono}\` on Windows, \`${platformTypes.default.mono}\` for a platform the library does not know.`,
  );
});

it("states the icon-to-label gap the spacing scale defines", () => {
  expect(designSystem).toContain(
    `The gap between icon and label is \`spacing.sm\` (${spacing.sm}px).`,
  );
});
```

Update the file header's design-system sentence to name the platform-family claim
as one of the guarded claims.

### 4.5 `COMPONENTS.md`

In the **Design tokens** row's Notes, after the `docs.test.ts` clause, add that
the same file holds the design-system's platform-family sentence and icon-gap
rule, and that `readme.test.ts` holds the install path to the manifest's
`private` flag.

### 4.6 `TODO.md`

Under "Design tokens and theming (`tokens-theme`)", add and tick:

```
`[x]` Make the README's install path honest (workspace dependency while private)
and guard it against the manifest; guard the design-system's platform-family
claim; document icon alignment, the last mission-named design-system item
(plan 070)
```

Bump the section's progress count and percentage (`37/56` → `38/57`; the bar is
recomputed from the count, keep the same rounded style).

### 4.7 `.agents/slop/plans/README.md`

Add `070` to the tokens table (Phase F, depends on `062`, `065`, `066`, status
`done` when the plan is executed) and one sentence to the explanatory paragraph
after the table.

## 5. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens test          # 15 files, all assertions pass
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run check                                  # check:tests, lint, fmt, types
nub run lint                                   # exit 0
nub run test                                   # every workspace suite passes
```

### Two-direction proofs (run each, then revert the mutation)

1. **Install guard.** Replace the README's
   `{ "dependencies": { "@gpuixui/tokens": "workspace:*" } }` block with
   `nub add @gpuixui/tokens`, run the package test, expect
   `presents an install path that exists today` to fail. Revert.
2. **Platform-family guard.** Change `linuxPlatformStyle.types.mono` in
   `packages/tokens/src/platform-styles/linux.ts` to `"Ubuntu Mono"`, run the
   package test, expect `names the platform families the implementation ships` to
   fail. Revert.
3. **Gap guard.** Change `spacing.sm` in `packages/tokens/src/scale.ts` from `6`
   to `5`, run the package test, expect
   `states the icon-to-label gap the spacing scale defines` to fail. Revert.

Do not commit a mutation. `git diff` before committing must show only the plan's
intended changes.

## 6. STOP conditions

- **STOP** if `packageJson.private` is no longer `true` at execution time: the
  registry half is then the truthful path, the README text changes, and the
  conditional guard must be re-read before applying it.
- **STOP** if the design-system sentence the guard builds is not present verbatim
  after whitespace collapsing — fix the *document* to match the implementation's
  real families; do not weaken the assertion.
- **STOP** if any gate is red for a reason outside this plan. Report the failing
  suite and the evidence instead of editing another workstream's paths.
- **STOP** if the alignment paragraph would need a number that is not derivable
  from a token. It does not: `spacing.sm`, the size tiers and the square
  icon-only rule are all in the package.

## 7. Acceptance criteria

- [ ] The README presents the workspace dependency while the package is private,
      names the published command as the later path, and the test fails when the
      wrong half is presented.
- [ ] `docs/design-system.md` names the real per-platform mono families, and the
      test fails when one shipped family changes.
- [ ] The design system states the icon alignment rule, including the guarded
      `spacing.sm` gap, and the test fails when the spacing value changes.
- [ ] `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [ ] `nub run check`, `nub run lint` and `nub run test` exit 0.
- [ ] Committed on `agent/tokens-theme` and pushed.
