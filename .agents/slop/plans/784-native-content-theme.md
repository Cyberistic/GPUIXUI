# 784 — The content-surface theme: does a token palette reach `<markdown>`, `<code>` and `<diff>`?

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** planned

**Depends on:** `100`, `110`, `120`, `140`, `150`, `161`, `180`, `181`, `197`,
`302`, `518`, `577`, `586`, `674`, `676`, `690`, `697`, `701`, `707`, `713`,
`715`, `722`, `736`, `745`, `754`, `761`, `771`, `773`, `775`, `778`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is edited.

---

## 1. The bug being guarded

`COMPONENTS.md` says of the markdown surface:

> Styling comes from the element's built-in `Theme`; `theme` is the typed prop
> and **only its default was measured**.

That is true of every native content surface, and it is the whole story of how a
rich-text preview, a code block and a diff can join the design system:

- `MarkdownProps`, `CodeProps` and `DiffProps` all publish `theme?: GpuixTheme`
  (`@gpuix/native@0.10.0`, `dist/host.d.ts`);
- **no scenario in either registry passes one** (`grep "<markdown\|<code\|<diff"`
  over `apps/playground/src`: every mount is theme-less);
- the runtime's base is **always dark** — `Theme::from_prop(None)` returns
  `Theme::dark()` — so an unthemed surface inside our *light* palette paints
  Comet's dark colours, and there is no check that could notice.

The consequence is concrete: `MessageScroller`, a changelog pane, a docs preview
or a code block shipped from this library would paint the runtime's palette, not
ours, and the whole suite would stay green. Nothing in `apps/playground` or
`packages/testing` proves that **the design system can own a content surface**.

**Goal:** mount the three surfaces with a `GpuixTheme` derived from
`@gpuixui/tokens`, decode one frame per host, and prove **which fields reach the
paint** — and which do not. Where a field cannot be observed, record it by name
rather than implying it works.

---

## 2. What the runtime actually reads (source-read at the 0.10.0 tag)

`references/gpuix` is at `main`; the pinned binding is `9fcd6288`. The theme
plumbing below is identical in both (`theme.rs`, and the three element modules).

- `Theme::from_prop` starts from `Theme::dark()` (or `Theme::light()` when
  `appearance: "light"`), then applies every supplied override, then **ignores
  an invalid theme entirely** (logs a warning and uses dark).
- `<markdown>` (`custom_elements/markdown.rs`, `markdown/render.rs`) reads
  `text` (prose, headings, links — **links are monochrome**, an underline in
  `text_muted`, not accent), `code_text` (inline code), `code_wash`,
  `text_muted` (quote body), `accent` (bullets at 0.85 alpha, ordered markers,
  the quote rail at 0.6 and its 5 % wash), `border`, `font_sans`, `font_mono`,
  `syntax.*` (fenced code) and `metrics.*`. It **paints no surface**: its
  container has `text_color`, `font_family` and no `bg`; `theme.bg` is read
  **only for its lightness**, to choose the direction of the `ink()` washes.
- `<code>` (`custom_elements/code.rs`) reads `syntax.*` per span, `text` for
  plain runs, `text_faint` for the line-number gutter, `font_mono` and
  `metrics.code_*`. Its doc comment is explicit: **"It paints no surface of its
  own"**, and it ignores `theme.bg` completely.
- `<diff>` (`custom_elements/diff.rs`) is the one surface that **paints
  `theme.bg`** as its content plane, then `diff_add` / `diff_del` as the marker,
  gutter and accent colours, and as a **5.5 % row tint**; `diff_hunk_bg` fills
  the hunk header.
- Defaults a probe must differ from: `text = neutral(0.922) ≈ #E5E5E5`,
  `text_muted ≈ #A0A0A0`, `text_faint ≈ #717171`, `accent = #7C86FF`,
  `code_text ≈ #C4B3FF`, `string ≈ #29B183`, `bg = #060606`.

Our dark tokens are all **more than one tolerance apart** from those defaults
(`foreground #EEF1F5`, `mutedForeground #A1A9B7`, `placeholder #7C8595`,
`primary #A7A9FF`, `success #3BC97F`, `background #11141A`), so a default mount
can be used as the non-vacuity control: it must **not** paint our token.

---

## 3. What is deliberately *not* claimed

- **`border`** (the markdown table hairline) and **`text_dim`** (diff file
  paths). Both are drawn only inside multi-block layouts whose geometry this
  fixture does not need; they are mapped and unit-tested, not pixel-asserted.
- **`font_sans` / `font_mono`.** Glyph advances are already measured for
  `<text>` in `font-family` / `live-font-family`; this probe asserts the fields
  that change **colour**, so a font claim here would only duplicate that work.
- **`caret`, `code_wash`, `diff_hunk_bg`.** Mapped, unit-tested, not sampled:
  a caret needs an editor, the inline-code wash has a rounded 4.5 px box around
  a text run, and the hunk header is a single row whose position depends on the
  file header. Each is a deliberately deferred pixel claim, named here.
- **Syntax semantics.** This probe proves the **plumbing** of `syntax.string`
  and `syntax.keyword`, not that every grammar classifies every token. One
  reliable capture per palettes is enough; if the pinned grammar does not
  classify `const` as a keyword the keyword check is dropped with the
  measurement, not softened.
- **Anti-aliased edges.** `scanInk` (the plan-773 metric) counts interior pixels
  within a 6-channel tolerance; a token that differs from the runtime default by
  more than 6 cannot be confused with it.

---

## 4. Deliverables (exact paths)

| File | Action |
| ---- | ------ |
| `apps/playground/src/scenarios/surface-theme-model.ts` | **create** — the mapper, the fixture table, the geometry and the scans |
| `apps/playground/src/scenarios/surface-theme-model.test.ts` | **create** — the pure tests |
| `apps/playground/src/scenarios/surface-theme.tsx` | **create** — the view, `surface-theme` and `live-surface-theme` |
| `apps/playground/src/scenarios/index.ts` | **edit** — import + register (`surface-theme`) |
| `apps/playground/src/live/scenarios.tsx` | **edit** — import the live scenario, wrap it with `view`/`ready`/screenshot, add to `liveScenarios` |
| `apps/playground/README.md` | **edit** — scenario row + registry totals + the measured paragraph |
| `COMPONENTS.md` | **edit** — the Markdown / Code / Diff rows and the `content` capability evidence |
| `TODO.md` | **edit** — tick this unit; add the `primitives` cross-team row |
| `.agents/slop/plans/README.md` | **edit** — add this plan's row |

No other path is touched. The mapper is a playground artifact because
`packages/primitives` (which owns `nativeTextTheme`, `core/style.ts:179`) is
**not** this workstream's path; §9 records the hoist as a cross-team task.

---

## 5. Design

### 5.1 The mapper (`surface-theme-model.ts`)

One pure function; every field is a token, never a literal:

```ts
export const nativeContentTheme = (theme: Theme): GpuixTheme => ({
  appearance: theme.mode,
  bg: theme.colors.background,
  border: theme.colors.border,
  text: theme.colors.foreground,
  textMuted: theme.colors.mutedForeground,
  textFaint: theme.colors.placeholder,
  textDim: theme.colors.mutedForeground,
  accent: theme.colors.primary,
  caret: theme.colors.primary,
  codeText: theme.colors.primary,
  codeWash: theme.colors.muted,
  diffAdd: theme.colors.success,
  diffDel: theme.colors.destructive,
  diffHunkBg: theme.colors.muted,
  fontSans: theme.typography.sans,
  fontMono: theme.typography.mono,
  syntax: syntaxPalette(theme.colors),
});
```

`syntaxPalette` maps all 24 `SyntaxTheme` kinds to roles: `comment`/`operator`/
`punctuation` → `mutedForeground`, `keyword`/`function` → `primary`, `string`/
`constant`/`typeBuiltin` → `success`, `stringSpecial`/`escape`/`functionBuiltin`/
`macroName`/`variableSpecial`/`tag` → `info`, `number`/`boolean`/`type`/
`constructor`/`property`/`attribute`/`label` → `warning`, `variable`/`parameter`
→ `foreground`, `invalid` → `destructive`.

**Measured, not assumed:** `bg: background` (the content plane is the app
canvas) is what makes the `<diff>` plane and the code/markdown *absence* of a
plane distinguishable inside a `card` panel.

### 5.2 The fixture (`surface-theme.tsx`) — one `880 × 580` stage

`surface-stage`, background `dark.background`; every panel is `position:
"absolute"`, `padding: 8`, `display: "flex"`, `flexDirection: "column"`.

| Panel `testId` | left/top | size | Panel bg | Child `testId` | Child |
| -------------- | -------- | ---- | -------- | -------------- | ----- |
| `st-md-text-card` | 16/16 | 420×64 | `card` | `st-md-text` | `<markdown source="# AaAaAa" theme={themed}>` |
| `st-md-text-default-card` | 444/16 | 420×64 | `card` | `st-md-text-default` | same source, **no theme** |
| `st-md-code-card` | 16/88 | 420×44 | `card` | `st-md-code` | `<markdown source="\`tokenCode\`" theme={themed}>` |
| `st-md-code-default-card` | 444/88 | 420×44 | `card` | `st-md-code-default` | same, **no theme** |
| `st-md-link-card` | 16/140 | 420×40 | `card` | `st-md-link` | `<markdown source="[docs](https://example.test)" theme={themed}>` |
| `st-md-list-card` | 444/140 | 420×40 | `card` | `st-md-list` | `<markdown source="- a" theme={themed}>` |
| `st-md-light-card` | 16/188 | 200×56 | **`light.card`** | `st-md-light` | `<markdown source="# AaAa" theme={{ appearance: "light" }}>` |
| `st-md-dark-card` | 228/188 | 200×56 | **`light.card`** | `st-md-dark` | `<markdown source="# AaAa" theme={{ appearance: "dark" }}>` |
| `st-code-card` | 16/252 | 420×140 | `card` | `st-code` | `<code code={CODE} language="ts" showLineNumbers theme={themed} style={{ fontSize: 30, lineHeight: 40 }}>` |
| `st-code-default-card` | 444/252 | 420×140 | `card` | `st-code-default` | same, **no theme** |
| `st-diff-card` | 16/400 | 420×152 | `card` | `st-diff` | `<diff patch={PATCH} theme={themed}>` |

`const themed = nativeContentTheme(palettes.dark)` is one module-level value, so
every themed panel shares one object (and a mutation of the mapper moves all of
them together).

The two `appearance` panels sit on a **light** card on purpose: their inks are
`#222222` and `#E5E5E5`, so on white the *darkest* pixel in each panel is the
ink in both cases (`0.13` vs `0.78` luminance) and neither can be mistaken for
the plane.

The code sample is three lines and contains one guaranteed string capture:

```ts
export const CODE_SAMPLE = [
  "const total = rows * 2;",
  'const label = "new";',
  "return total;",
].join("\n");
```

The patch is a plain modified file, so `file_notices` is empty and the row
sequence is exactly `FileHeader, HunkHeader, Context, Del, Add`:

```ts
export const PATCH = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,2 +1,2 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
].join("\n");
```

### 5.3 The geometry (default metrics, source-read)

- markdown `md_line_height = 22`; a single-item list starts at the element's
  content origin, its marker is `min_w 18`, `h = line_height`,
  `items_center`, and the disc is `ml 1`, `w 5`, `h 5` →
  **bullet centre = (3.5, 11)** relative to the element box.
- diff rows: `36` file header, `28` hunk header, `21` per line, `8` bottom pad;
  the container paints `bg` and each line row paints its tint over it →
  with `box` = the diff element's box,
  **context y = box.y + 74, del y = box.y + 95, add y = box.y + 116**, all at
  `x = box.x + box.width - 24` (past the short line text).
- the fence's alpha is `0.055` (source: `add_bg.a = 0.055`), composited in
  straight sRGB channels — the plan-701 rule, so `Pixels.blendOver`.

### 5.4 The scans (`surface-theme-model.ts`)

Reuse the plan-773 `scanInk` shape and `INK_TOLERANCE = 6` (import it from
`text-ink-model.ts`; do not fork the constant). Add:

```ts
export interface DarkestScan { sampled: number; darkest: Pixels.Rgba; luminance: number }
export const scanDarkest = (frame, window, box): DarkestScan
export const luminanceOf = (colour: Pixels.Rgba): number  // 0..1, sRGB weights
export const bulletPoint = (box: Smoke.Bounds) => ({ x: box.x + 3.5, y: box.y + 11 })
export const bulletPaint = (colors: ThemeColors): Pixels.Rgba // blendOver(primary, 0.85, card)
export const diffRowPoints = (box: Smoke.Bounds) => ({ context, deleted, added })
export const diffTint = (over: Pixels.Rgba, plane: Pixels.Rgba): Pixels.Rgba // blendOver(over, 0.055, plane)
```

`scanDarkest` walks device pixels with `Pixels.frameScale` exactly as `scanInk`
does; a frame/window mismatch returns `sampled: 0` so a caller cannot pass by
sampling nothing.

### 5.5 The checks (one frame per host)

The scenario follows `text-ink.tsx`: a `FrameReader` driver (`readSync` /
`readAsync`, `captureHeadless` / `captureLive`) and one shared
`surfaceThemeChecks`. Labels are final; each is one check.

1. `the frame's device scale is an integer`
2. `the themed document paints the theme's text token` — near `cardForeground`
   ≥ 32 in `st-md-text`
3. `the default document does not paint the theme's text token` — near 0 in
   `st-md-text-default`
4. `the themed inline code paints the codeText token` — near `primary` ≥ 32 in
   `st-md-code`
5. `the default inline code does not paint the codeText token` — near 0 in
   `st-md-code-default`
6. `the themed bullet paints the accent token at 85% over the card` —
   `pixelAtPoint(bulletPoint(st-md-list box))` vs `bulletPaint(dark)`
7. `the themed link underline paints the muted token` — near
   `mutedForeground` ≥ 32 in `st-md-link`
8. `the themed link does not paint the accent token` — near `primary` == 0 in
   `st-md-link` (links are monochrome; the underline is `text_muted`)
9. `the light appearance paints dark ink` — `scanDarkest(st-md-light).luminance
   < 0.35`
10. `the dark appearance paints light ink` — `scanDarkest(st-md-dark).luminance
    > 0.7`
11. `the themed code paints the string token` — near `success` ≥ 32 in
    `st-code`
12. `the default code does not paint the string token` — near 0 in
    `st-code-default`
13. `the themed code paints the gutter token` — near `placeholder` ≥ 32 in the
    left 28 px of `st-code`
14. `the themed code paints the keyword token` — near `primary` ≥ 32 in
    `st-code` (**drop with the measurement if the grammar does not classify
    `const`/`return`; see §3**)
15. `the code box paints no content plane` — the pixel at
    `(box.x + box.width - 2, box.y + 2)` is `card`, not `background`
16. `the markdown box paints no content plane` — the same corner of
    `st-md-text` is `card`, not `background`
17. `the diff paints the content plane` — `diffRowPoints(...).context` is
    `background` exactly
18. `the diff tints an added row with diffAdd` — `added` vs
    `diffTint(success, background)`
19. `the diff tints a deleted row with diffDel` — `deleted` vs
    `diffTint(destructive, background)`
20. `the two diff tints are distinct` — `Pixels.rgbaNear(add, del, 6)` is
    `false` (a swapped mapping must fail, not merely differ)

Every box is read through `paintedBox`, so a fixture that does not mount fails by
name before a pixel is sampled. One frame per host is captured — no second
capture, because the whole point is that the A/B pair is in **one** paint.

---

## 6. Commands and expected results

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only surface-theme        # 1/1, 20 checks
nub apps/playground/dist/live/run.js --only live-surface-theme    # 1/1, 20 checks
nub run --filter playground test                                  # +model tests
nub apps/playground/dist/smoke/run.js                             # 117/117 (end-of-task)
nub run check && nub run lint && nub run test
```

- The registry moves **116 → 117** headless and **105 → 106** live; the
  headless check total moves by +20 (the exact number comes from the run;
  `surface-theme` reports its own count in the report).
- `packages/testing` is **not** changed: the PNG decoder, `Pixels.blendOver`,
  `rgbaNear`, `frameScale` and `framePoint` already exist (plans `674`, `701`).
- No new capability is registered: the scenario uses `capability: "content"`,
  so `apps/docs/src/lib/capabilities.ts` (another workstream) needs no row and
  the plan-653 coverage guard stays green because `live-surface-theme` mounts
  `content`.

---

## 7. Mutation proofs (observed red, then reverted)

| # | Mutation | Check that must fail |
| - | -------- | -------------------- |
| M1 | drop `theme` from `st-md-text` | 2 (`the themed document paints the theme's text token`) |
| M2 | map `codeText` to `foreground` instead of `primary` | 4 (the inline-code scan) |
| M3 | map `accent` to `mutedForeground` | 6 (the bullet sample) |
| M4 | omit `appearance` from the mapper and pass `{ appearance: "dark" }` in the light panel | 9 (light ink) |
| M5 | swap `diffAdd` and `diffDel` in the mapper | 18 and 19 (both tints), 20 (distinctness) |
| M6 | give the code element `style={{ …, backgroundColor: background }}` | 15 (`the code box paints no content plane`) |
| M7 (unit) | map `syntax.string` to `foreground` | the syntax-palette test |

Record each failure's exact text in §10.

---

## 8. STOP conditions

- **A fixture has no painted bounds** → stop; a pixel claim needs a box.
- **A themed field paints the default's value** → that is a measured limitation
  of the pinned runtime: record which field, flip the check to the measured
  behaviour only if it is a real assertion (never a widened tolerance), and add
  a cross-team row. Do not "fix" the runtime here.
- **The bullet sample misses the disc** → re-read the element box and the
  measured disc position with a debug print; if the disc is not at
  `(3.5, 11)`, write down the measured point and update §5.3. Do not widen
  `TOLERANCE`.
- **The diff's row geometry is not 36/28/21** → measure the row bands, update
  §5.3 and this plan before asserting; a guessed band is not evidence.
- **The live and headless frames disagree** → stop and report both samples.
- **More than one frame per host is needed** → stop; the A/B pair is designed to
  share one paint, and a second capture doubles the cost for no new witness.
- **The keyword capture is absent** → keep the string and gutter checks, drop
  check 14 and record the grammar's measurement in §10.

---

## 9. Cross-team follow-up (recorded in `TODO.md`, not edited here)

`@gpuixui/primitives` already owns `nativeTextTheme` for `<input>`/`<textarea>`
(`packages/primitives/src/core/style.ts:179`). The mapper this plan measures
belongs beside it — one `nativeContentTheme` for `<code>`, `<diff>` and
`<markdown>` — so a consumer does not copy the mapping. Until then the
playground's copy is the only implementation.

---

## 10. Results

**Landed 2026-10-20.** One decoded frame per host, eleven fixtures, **50 checks
each** (`surface-theme` headless, `live-surface-theme` in a real window). The
draft predicted 20 checks; the difference is the `paintedBox` / `pixelAtPoint`
preconditions, which are recorded checks too (an unpainted fixture must fail by
name before a pixel is read).

| Claim | Measured |
| ----- | -------- |
| themed markdown text | `foreground #EEF1F5` present in `st-md-text` |
| default markdown text | `0/43632` pixels near the token; closest **`#E5E5E5`** — the runtime's `neutral(0.922)` base, exactly as the source predicted |
| themed inline code | `primary` present in `st-md-code` |
| default inline code | `0/35552` near the token; closest `#CFD2D7` (the runtime's violet, anti-aliased) |
| bullet | **`#9294DE`** at `(3.5, 11)` — `primary` at 85 % over `card`, exactly |
| link | `mutedForeground` present (the underline) and **no** `primary`: links are monochrome |
| appearance | `light` → darkest ink **`#222222`**, luminance **0.13**; `dark` → **`#E5E5E5`**, **0.90** |
| code syntax | the string token (`success`) and the keyword token (`primary`) both paint; the default twin paints neither |
| code gutter | `placeholder` present in the left 28 px band |
| planes | `<code>` and `<markdown>` corners are `card #191D25` (no surface); `<diff>`'s context row is `background #11141A` |
| diff tints | added/deleted rows are the 5.5 % blends over `background`, distinct from each other |

**Mutation proofs, observed red and reverted:**

- **M1** — `theme` removed from `st-md-text`:
  `expected at least 32 pixels near #eef1f5ff, got 0/43632 pixels, closest
  #e5e5e5ff`.
- **M2** — `codeText` mapped to `foreground`:
  `expected at least 32 pixels near #a7a9ffff, got 0/35552 pixels, closest
  #cfd2d7ff`.
- **M3** — `accent` mapped to `mutedForeground`:
  `expected #9294deff, got #8d94a1ff` (the bullet geometry is right; the fill
  is not).
- **M4** — the light panel given `appearance: "dark"`:
  `expected a luminance below 0.35, got #e5e5e5ff luminance 0.90 over 19872 px`.
- **M5** — `diffAdd`/`diffDel` swapped:
  `expected #131e20ff, got #1e191eff` on the added row.
- **M6** — `backgroundColor: background` added to the code element's `style`:
  `expected #191d25ff, got #11141aff` (the code box painted a plane).
- **M7 (unit)** — `syntax.string` mapped to `foreground`:
  `expected '#EEF1F5' to be '#3BC97F'`.

The unit run also caught a defect in the new test itself before it shipped:
`luminanceOf(#FFFFFF)` is `0.9999999999999999`, so the exact-`1` assertion was
changed to `toBeCloseTo(1, 10)` rather than weakening the model.

**Verification.**

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only surface-theme      # 1/1, 50 checks, 8.9 s
nub apps/playground/dist/live/run.js --only live-surface-theme  # 1/1, 50 checks, 7.0 s
nub run --filter playground test                                # 580 tests (19 new)
```

The live artifact is `apps/playground/.artifacts/live/live-surface-theme.png`
(2200 × 1440, device scale 2): the themed/default pairs are visible side by side
— the token heading, the primary inline code, the underlined monochrome link,
the small bullet disc, the light/dark appearance pair on a white card, the two
code blocks with their different syntax hues, and the diff's red/green rows on
its darker plane.

**Deferred fields** (mapped and unit-tested, not sampled): `border`, `textDim`,
`caret`, `codeWash`, `diffHunkBg`; `font_sans`/`font_mono` advances are already
covered by `font-family`. The diff row bands assume the default 36/28/21
metrics.

