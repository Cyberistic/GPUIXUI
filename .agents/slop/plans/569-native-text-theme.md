# Plan 569 — the native text theme: code, diff and markdown

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 051 (platform type styles), 082 (`primaryText`), 332 (the mark
floor), 337/511/557 (the native field's reach and its caret), 399 (the solid
status fill), 527 (the hint on the row washes).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

GPUix 0.10.0 publishes four native text surfaces — `<code>`, `<diff>`,
`<markdown>` and the `<input>`/`<textarea>` editor — and every one takes a
`theme?: GpuixTheme` prop. `GpuixTheme` is a **token set**: an appearance, nine
colours, two families, a twenty-four-entry syntax palette and every layout
metric the native text engine paints.

The package reaches exactly one field of it. `nativeFieldTheme(theme)` returns
`{ caret }` (plan 511/557), because the editor reads only the caret; nothing
supplies the rest. The consumer shows the consequence: `components/message.tsx`
renders `<markdown source={text} />` with no `theme` prop, so an assistant
message's markdown is painted by the runtime's **built-in dark theme** in the
light identity, in every light platform variant and in both AAA light sets. The
runtime's light base is only selected by `GpuixTheme.appearance: "light"`, and
nothing in the library sends it.

The gap is not only `appearance`. The pinned `Theme` (`packages/native/src/theme.rs`,
`@gpuix/native@0.10.0` = `9fcd628`) carries:

- four text tiers — `text`, `text_muted`, `text_faint`, `text_dim` — all of which
  the runtime fades or composites (`text` at 92% in a diff line, `text_faint` at
  50/80% for gutter numbers and "Show more");
- `bg`, `border`, `accent`, `caret`, `codeText`, `codeWash`, `diffAdd`,
  `diffDel`, `diffHunkBg`;
- a `SyntaxPalette` with 24 capture classes, painted only as text on the code
  body;
- `fontSans`/`fontMono` and 29 `Metrics` fields, including `mdHeadingSizes`,
  `mdLineHeight`, `codeTextSize`, the diff header heights and the table chrome.

Every one of those values is a design decision this package already owns: the
body and secondary text roles, the brand ink (`primaryText`), the status text
roles, `code`/`codeBlock` type roles, spacing, radii and the surface roles. A
consumer cannot derive them without retyping the design system, and every
attempt reproduces plan 057's defect (a solid status fill used as text) or the
runtime's dark default in a light theme.

The same audit finds the one painted value a theme **cannot** change: the
runtime hard-codes the fade fractions — diff line text at 0.92, add/delete
markers and numbers at 0.9, the 3px accent bar at 0.55, the row wash at 5.5%, a
list marker at 0.85, a blockquote rail at 0.6 and its wash at 0.05, and the
code-block ink wash at 3.5%. A role chosen for the opaque floor can miss it once
the runtime fades it. The package's own promise ("the same floors the library's
suites enforce") therefore needs the code surface held at the body floor and the
faded compositions measured on every shipped set.

## 2. Decision

Ship **one bridge** — `nativeTextTheme(theme)` — that returns the complete
runtime `theme` prop from a resolved `Theme`, hold the syntax captures to the
body floor on the code plane, and measure its fixed opacity compositions on every
shipped set. The bridge is structural: the package
must not depend on `@gpuix/native` (it ships zero runtime dependencies and the
docs site consumes it), so it declares its own `NativeTextTheme`,
`NativeSyntaxTheme` and `NativeTextMetrics` interfaces with the field names the
runtime reads, exactly as `NativeFieldTheme` does.

### 2.1 The mapping

`bg` is the native content plane. It is `card` — the raised surface a code block,
diff or markdown document is painted on. A consumer that renders one directly on
the canvas overrides `bg: theme.colors.background`; every role below is already
measured on all four `Surface` tones, so the override stays inside the contract.

| Native field | Role | Why |
| ------------ | ---- | --- |
| `appearance` | `theme.mode` | Selects the runtime's light/dark base before the overrides. |
| `bg` | `card` | The content plane behind code and diff bodies. |
| `border` | `border` | Hairlines and the code-block card edge. |
| `text` | `foreground` | Body text. |
| `textMuted` | `mutedForeground` | Language tag, copy control, blockquote body. |
| `textFaint` | `placeholder` | Gutter numbers, hunk labels, "Show more". |
| `textDim` | `mutedForeground` | Diff file paths; one notch below `textMuted` by intent, but the mode tier exists. |
| `accent` | `primaryText` | A mark and a link, not the fill. The runtime paints it at 0.85/0.6 for list markers and the quote rail, so the **ink** has the headroom the fill does not. |
| `caret` | `primaryText` | Same value `nativeFieldTheme` returns. |
| `codeText` | `primaryText` | Inline code ink on its wash. |
| `codeWash` | `accent` | The tinted inline-code wash; `accent` is a measured fill on every panel. |
| `diffAdd` | `successText` | Text first: the runtime paints the marker and line numbers with it. |
| `diffDel` | `destructiveText` | Same, for a removed line. |
| `diffHunkBg` | `hover` | A neutral wash that is held past the card (a surface role can equal the card in platform dark sets). |
| `fontSans` | `typography.sans` | The UI family. |
| `fontMono` | `typography.mono` | The platform's mono family. |
| `syntax.*` | text roles | See below. |
| `metrics.*` | type/spacing/radius | See §2.3. |

The syntax palette uses only roles the contract already holds to a text floor on
`card`, so no new colour role is added:

| Capture | Role |
| ------- | ---- |
| `comment` | `mutedForeground` |
| `keyword`, `function`, `functionBuiltin`, `label` | `primaryText` |
| `string` | `successText` |
| `stringSpecial`, `escape`, `number`, `boolean`, `constant`, `variableSpecial`, `attribute` | `warningText` |
| `typeName`, `typeBuiltin`, `constructor` | `infoText` |
| `tag`, `macroName`, `invalid` | `destructiveText` |
| `property`, `variable`, `parameter` | `foreground` |
| `operator`, `punctuation` | `mutedForeground` |

Rejected alternatives:

- **Return the runtime's own defaults** — that is what happens today, and it is
  a dark theme in a light app. It also re-types every colour the design system
  owns.
- **Add 24 syntax colour roles** — the palette needs eight families, not
  twenty-four tokens; a capture class is a use of a role, not a new role.
- **Copy the runtime's Comet palette** — it is a different identity, and the
  fades are tuned to it. The semantic roles are the library's identity.
- **Hardcode the runtime's metrics** — the type scale would stop reaching code
  and markdown. The mapped metrics are listed in §2.3; the remaining chrome
  metrics stay at the runtime's defaults and are documented as such.
- **Depend on `@gpuix/native` for `GpuixTheme`** — the package ships no runtime
  dependency, and the docs site (a browser app) consumes it. Structural
  interfaces are the existing `NativeFieldTheme` precedent.

### 2.2 The painted floor

The syntax palette is held to the **body** floor on `card`, not the secondary
floor its roles carry as status labels: code is body copy. Seven distinct roles
cover the 24 captures, so `nativeSyntaxPairs` adds seven body pairs and every
shipped set already clears them (the tightest is `primaryText` at **7.83:1**).

The runtime also fades values at fixed fractions — a diff line at 0.92, an
add/delete marker and its numbers at 0.9, the 3px accent bar at 0.55, the row
wash at 5.5%, a list marker at 0.85, the quote rail at 0.6 and its wash at 0.05,
and the code block's ink wash at 3.5%. Those fractions are not tokens. The
opaque pairs are the binding constraint (a colour that clears the body floor
still clears every faded secondary/surface pair, measured on all shipped sets),
so the public checker keeps the opaque pairs and `native-text.test.ts` measures
the exact composites: the ink wash at the body floor and the fade ladder on every
shipped set. The test states the fractions with the source citation, so a runtime
change that sharpens them fails the suite instead of silently shipping.

The one **new** public pair the bridge needs is the syntax set: without it a
copied theme could set `infoText` to a secondary-strength 4.6:1 and paint code at
the wrong tier while every existing pair passed.

### 2.3 The metrics

Map only the metrics whose values come from a theme group; the rest stay at the
runtime's defaults and are documented as chrome this package does not name yet.

```
codeTextSize              = typography.codeBlock.fontSize
codeLineHeight            = typography.codeBlock.lineHeight
codeGutterPaddingRight    = spacing.lg
diffTextSize              = typography.codeBlock.fontSize
diffLineHeight            = typography.codeBlock.lineHeight
diffFileHeaderHeight      = typography.label.lineHeight + 2 * spacing.md
diffHunkHeaderHeight      = typography.caption.lineHeight + 2 * spacing.xs
diffNoticeHeight          = typography.caption.lineHeight + 2 * spacing["2xs"]
diffBodyBottomPad         = spacing.md
diffMarkerWidth           = spacing["2xl"]
diffRowPaddingX           = spacing.xl
mdTextSize                = typography.body.fontSize
mdLineHeight              = typography.body.lineHeight
mdBlockGap                = spacing.lg
mdHeadingSizes            = [h1, h2, h3, body].map(fontSize)
mdHeadingLineHeights      = [h1, h2, h3, body].map(lineHeight)
mdTableCellPadding        = spacing.lg
mdInlineCodeRadius        = radius.sm
mdCodePaddingX            = spacing.lg
mdCodePaddingY            = spacing.md
mdCodeRadius              = radius.lg
mdCodeHeaderPaddingY      = spacing.xs
mdCodeHeaderTextSize      = typography.caption.fontSize
```

The heading arity is the runtime's: `[h1, h2, h3, h4to6]`, and the body role is
the h4–h6 size the document falls back to.

## 3. Exact edits

### 3.1 New `packages/tokens/src/native-text.ts`

- `NativeSyntaxTheme`: the 24 capture fields from `SyntaxTheme` in
  `@gpuix/native@0.10.0`'s `dist/host.d.ts`.
- `NativeTextMetrics`: the 23 mapped fields above. Every field is required — the
  returned object is complete.
- `NativeTextTheme`: `appearance`, `bg`, `border`, `text`, `textMuted`,
  `textFaint`, `textDim`, `accent`, `caret`, `codeText`, `codeWash`, `diffAdd`,
  `diffDel`, `diffHunkBg`, `fontSans`, `fontMono`, `syntax`, `metrics`.
- `nativeTextTheme(theme: Theme): NativeTextTheme` — the mapping in §2.1/§2.3,
  with JSDoc that names the runtime, the consumer call, the `bg` override and
  the fixed fades.
- The syntax record is one internal `const`; the function spreads it.

### 3.2 `packages/tokens/src/contrast.ts` — the syntax pairs

Import `nativeSyntaxRoles` from `./native-text.js` (no cycle: the bridge imports
only `Theme`/`ThemeColors`), and add the deduplicated body list:

```ts
const nativeSyntaxPairs: readonly ContrastPair[] = [
  ...new Set(Object.values(nativeSyntaxRoles)),
].map((role): ContrastPair => [role, "card", "body"]);
```

Spread it into the checker's `pairFailures` beside `contrastPairs` — not into
`contrastPairs` itself, so the published pair count and every suite that filters
that list stay unchanged — and add one bullet to the `themeContrastFailures`
JSDoc naming the native code surface and the test that holds the fixed ink wash
and fades. Export `nativeSyntaxPairs` and add it to
`contrast.test.ts`'s compile-enforced pair-list inventory. No failure type
changes and `contrastPairs` stays 405.

### 3.3 New `packages/tokens/src/native-text.example.ts`

The runnable example the docs show: resolve a theme, pass `nativeTextTheme` to a
`<markdown>` and a `<code>`, and override `bg` for a canvas document.

### 3.4 New `packages/tokens/src/native-text.test.ts`

Header comment states the bug being guarded: *the runtime's native text
elements default to a dark theme, and the library shipped no bridge; a light
theme rendered `<markdown>` in the runtime's dark default while every check
returned `[]`.*

Cases:

1. `appearance` follows `mode` on every shipped set.
2. The colours equal the §2.1 roles on every shipped set; `caret` equals
   `nativeFieldTheme(theme).caret`.
3. Every syntax class equals its §2.1 role, and **no** syntax class is a solid
   fill (`primary`, `success`, `warning`, `info`, `destructive`) — the plan-057
   defect.
4. Every colour the bridge returns is a role `contrastPairs` measures on `card`
   (a linkage walk over the returned values).
5. `metrics` follow an edited theme: a body size/leading, h1/h2/h3 sizes,
   spacing, radius and caption changes flow into the mapped fields; the
   runtime-only chrome fields are absent.
6. Fonts follow `typography.sans`/`mono`.
7. Every shipped set clears the §2.2 composites (the ink wash and the fixed
   fades). A planted theme whose `infoText` is `#636363` — 4.755:1 on the darkest
   light wash, so every existing secondary pair passes, but **6.008:1** on
   `card` — is reported by `themeContrastFailures` through the new
   `nativeSyntaxPairs` body pair (proves the new check can fail). A second
   planted dark theme tunes `infoText` to just clear the body floor on `card`
   and asserts the ink composite drops below it (proves the test's composite
   guard can fail).
8. A light theme's returned `appearance` is `"light"` and a dark theme's is
   `"dark"`; mutating the bridge to return a fixed `"dark"` fails case 1.
9. `bg` is `card` by default and the canvas override is an ordinary value the
   test makes explicit.

### 3.5 `packages/tokens/src/index.ts`

`export * from "./native-text.js";`

### 3.6 `docs/tokens.md`

- New `### Native text documents` after `### Native text fields`, documenting:
  the runtime prop, the full mapping table, the syntax table, the metric table,
  the `bg` override, the fixed fades (with the `themeContrastFailures` bullet),
  the remaining runtime defaults, and the consumer call that is still to adopt
  it (`components/message.tsx`).
- A fenced `ts` snippet using `nativeTextTheme` (imports complete).
- Three rows in the `## Types` index, alphabetically between
  `NativeFieldTheme` and `OpacityFailure`: `NativeSyntaxTheme`,
  `NativeTextMetrics`, `NativeTextTheme`.
- The value section mentions `nativeTextTheme`, satisfying the namespace-wide
  coverage guard.

### 3.7 `docs/design-system.md`

A paragraph in §5 (Typography) or §10 (Runtime constraints): the native text
surfaces take the design system's roles and type scale through one bridge; the
runtime's fixed fades are held in the contrast contract; the remaining chrome
metrics stay runtime-owned. No count and no new claim that the guard does not
hold.

### 3.8 `packages/tokens/README.md`

Mention `nativeTextTheme` in the API overview and the native text limitation.

### 3.9 `COMPONENTS.md`, `TODO.md`, plan index

- `TODO.md`: add and tick one row in the tokens section; add one cross-team row
  for `components` to pass `nativeTextTheme(theme)` to `<markdown>`/`<code>`/
  `<diff>` (owner: `components`; plan 569).
- `COMPONENTS.md` Design tokens row: one clause naming `nativeTextTheme`.
- `.agents/slop/plans/README.md`: index this plan as `done` after the gate.

## 4. Commands

```bash
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt
```

Expected: the suite that was 145 files / 5754 cases grows by one file, all
green; `check-types` clean; lint and fmt clean for the touched files. Then
`nub run check` (repo-wide) as the completion gate. `nub run test` repo-wide is a
merge gate; record its result if run, and never claim it without running it.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe reports a native fade failure —
  the roles were chosen from the measured probe (tightest 5.23:1 for a diff
  marker, 7.02:1 for syntax, 1.077:1 for the row wash), so a failure means the
  mapping changed;
- the syntax body floor cannot be met on `card` in every shipped set;
- a required native metric has no theme source (do not invent a literal — leave
  it at the runtime default and document it);
- `themeContrastFailures` starts reporting a pair the existing suites do not
  already pass;
- `docs.test.ts`, `public-types.test.ts`, `snippets.test.ts`,
  `readme.test.ts` or `inventory.test.ts` fails for a reason other than the
  documented additions;
- the change needs a path outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/`.

## 6. Test plan — both directions

Each guard must fail without its subject:

| Guard | Mutate | Expected |
| ----- | ------ | -------- |
| `appearance` | return `"dark"` always | light case fails |
| role mapping | map `string` to `success` (a fill) | fill-as-text case fails |
| syntax coverage | remove `label` from the record | equality case fails |
| syntax floor | set `infoText` to `#636363` | new `nativeSyntaxPairs` case fails |
| ink composite | raise the dark `infoText` to the body floor exactly | ink case fails |
| metrics | drop `mdHeadingSizes` | edited-theme metric case fails |
| fonts | hardcode `"monospace"` | font case fails |
| docs | delete the `nativeTextTheme` mention | value-coverage case fails |

Run the two-direction check for the new regression case with
`scripts/verify-two-directions.sh` if it is executable; otherwise record that the
script is the repo-tooling row in `TODO.md` and prove both directions by
temporarily reverting the implementation in the worktree (never committed).

## 7. Acceptance criteria

- `nativeTextTheme(lightTheme).appearance === "light"` and the dark set returns
  `"dark"`.
- Every shipped set's native theme equals the §2.1/§2.3 mapping; every syntax
  class is a text role, never a solid fill.
- An edited theme flows into the mapped metrics and families.
- `themeContrastFailures` reports a theme whose syntax role is only
  secondary-strength on the code plane (the new body pair); every shipped set
  still returns `[]` (now including the native syntax pairs), and the suite's
  ink-wash composite at the body floor also passes on every shipped set.
- The catalogue documents every field, the syntax and metric tables, the `bg`
  override, the fades and the remaining runtime defaults; the type index names
  the three new interfaces; the README and the design system state the bridge.
- One runnable example is imported by the suite.
- The tokens suite, `check-types`, lint and fmt pass; the cross-team row for
  `components` is recorded.

## 8. Cross-team

`components` consumes the bridge: `message.tsx` renders `<markdown>` with no
`theme` prop, and any `<code>`/`<diff>` surface does the same. They should pass
`nativeTextTheme(theme)` and, for a document on the canvas, override `bg` with
`theme.colors.background`. This plan ships the token side and records the
migration in `TODO.md`; it does not edit `packages/components`.

## 9. Verification (2026-10-19)

- `nub run --filter @gpuixui/tokens test` — 146 files, 5764 cases, all green.
- `nub run --filter @gpuixui/tokens check-types` — clean.
- `nub run check` — green: `check:tests`, lint, fmt and both workspace type
  checks.
- `nub run test` — 146 files, 5764 cases, green.
- Both directions: removing `...nativeSyntaxPairs` from
  `themeContrastFailures` failed *reports a code role that is only
  secondary-strength* (`expected false to be true`); restoring it passed.
