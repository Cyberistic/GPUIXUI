# 631 — Display scale and pixel density have an owner

**Status:** proposed
**Phase:** F
**Depends on:** 410, 413, 419, 431, 568, 574, 598, 607, 608, 610, 625, 626, 629, 630

## 1. The measured gap

The docs document every unit they paint in — spacing steps, radii, control
metrics, logical window sizes — but never say **which unit a "pixel" is, what
happens on a 2× display, or how to pick an asset**. The installed runtime
declares no scale query, no density descriptor and no CSS media query, so the
answer has to be written down rather than looked up.

Measured 2026-10-20 at `69076176`, against the real index (`search(query, 3)`,
first result):

| Query | First result before | Owner the reader meant |
| ----- | ------------------- | ---------------------- |
| `hidpi` | *nothing* | Window |
| `retina` | *nothing* | Window |
| `dpr` | *nothing* | Window |
| `zoom` | *nothing* | Window (the application's zoom, if any) |
| `hi dpi` | `/docs/theming#high-contrast` | Window |
| `high dpi` | `/docs/theming#high-contrast` | Window |
| `display scale` | `/docs/theming#scales-and-control-metrics` | Window |
| `scale factor` | `/docs/theming#scales-and-control-metrics` | Window |
| `ui scale` | `/docs/theming#scales-and-control-metrics` | Window |
| `pixel density` | a Separator `## Sizes` text chunk | Window |
| `device pixel ratio` | a Separator `## Sizes` text chunk | Window |
| `logical pixels` | a Styling `## The supported surface` text chunk | Window |
| `ppi` | `/docs/roadmap` | Window |
| `4k` | `/docs/roadmap` | Window |

They land there because the index compares words: `hi`/`high` prefix *High
contrast*, `scale` is the token scale, and `pixel` appears in a border-width
sentence. No page owns the subject, which is the structural cause — the same
class plans 568 and 630 fixed for other subjects. `zoom` is recorded here as a
**measured non-fix**: the window method `zoomWindow()` is the native
zoom/maximise action (already reached by `maximize`), not a UI-scale control, so
a bare `zoom` must not be claimed by this page.

## 2. What is actually true (from the installed packages)

Every fact below is read from the installed declarations, not from memory:

| Fact | Source |
| ---- | ------ |
| `WindowOptions` sizes are `number`, and `getWindowSize()` is documented as "the paintable size of the window in logical pixels" | `@gpuix/native` `index.d.ts` |
| `StyleDesc` dimensions are a number of logical pixels or a `DimensionValue` | `@gpuix/native/dist/host.d.ts`; already stated on Styling |
| No scale query exists: no `scaleFactor`, `devicePixelRatio`, `pixelRatio`, `backingScaleFactor` or `getScaleFactor` appears in `@gpuix/native`'s or `@gpuix/react`'s declarations | installed declarations, searched in the guard below |
| `ImgProps` is `src`, `objectFit`, `alt`; there is no `srcSet`, `sizes` or density descriptor | `@gpuix/native/dist/host.d.ts` |
| `SvgProps.source` renders raw markup, and `packages/icons/src/Icon.tsx` paints `source` with `width`/`height` from `iconPixels` | installed declarations + package source |
| Fonts are installed families; the pinned release has no `registerFont` | Typography's owner page (link, do not duplicate) |

The honest boundary: **whether the compositor rasterises at 1× or 2× is the
platform's decision and no probe in this repository measures a painted frame at
either scale.** The page states that, and the Performance page already owns the
"what is not measured" rule. Icons are vector markup, so they do not depend on
the answer; raster images are painted from the single file the consumer passes.

## 3. Exact changes

### 3.1 New: `apps/docs/src/lib/display-scale.ts`

One small pure module, so the absence claims are data and a fixture can prove
each rule fails. Shape:

```ts
/** Symbols that would make "no display-scale query exists" false. */
export const scaleQuerySymbol = /scaleFactor|devicePixelRatio|pixelRatio|backingScaleFactor|getScaleFactor/u;

/** Symbols that would make "images have no density descriptor" false. */
export const imageDensitySymbol = /srcSet|srcset|imageSet|highDpi/u;

/** Every way the page's claims can disagree with the installed runtime. */
export const displayScaleViolations = (input: {
  readonly native: string;
  readonly host: string;
  readonly iconSource: string;
}): ReadonlyArray<string> => [ ... ];
```

Rules (one violation message each, naming the symbol found or the claim lost):

1. `native` matches `scaleQuerySymbol` → `"display scale: the page says no scale query exists, but the declarations contain …"`.
2. `host` matches `imageDensitySymbol` → `"image density: … contains …"`.
3. `host` has no `interface ImgProps` → `"ImgProps is not declared"`.
4. `host` has no `interface SvgProps` → `"SvgProps is not declared"`.
5. `iconSource` does not contain `source={icons[name]}` → `"Icon no longer paints SvgProps.source"`.
6. `iconSource` does not contain `width: pixels` → `"Icon no longer sizes its markup from iconPixels"`.

Keep it dependency-free (no `effect`, no `node:fs`) because `window-surface.ts`
imports `scaleQuerySymbol` and that module reaches a client component.

### 3.2 `apps/docs/src/lib/window-surface.ts`

1. Import `scaleQuerySymbol` from `./display-scale`.
2. Append one row to `windowAbsences`:

```ts
{
  subject: "A display scale factor",
  statement:
    "No API reports the display's backing scale. Sizes are logical pixels and the runtime exposes no `devicePixelRatio`, `scaleFactor` or OS zoom query, so an application cannot choose a 2× asset from JavaScript; icons are vector markup and an image paints the one `src` it is given.",
  symbol: scaleQuerySymbol,
},
```

The existing `windowSurfaceViolations` guard already fails when an absence row's
symbol appears in the declarations, so this row is guarded in both directions
with no new plumbing.

3. Extend the file's top doc comment with one sentence naming plan 631.

### 3.3 `apps/docs/content/docs/window.mdx`

1. Extend the frontmatter `description` so the page summary names the subject
   (the rule from plan 574): add "display scale and pixel density" after the
   size clause. Keep the sentence a list of subjects, not a claim.
2. Add a `## Display scale and pixel density` section **after**
   `## Size and insets`, before `## Custom window chrome`. Content, in this
   order:

   - The unit is the logical pixel: `WindowOptions`, `getWindowSize()` and
     `StyleDesc` dimensions all use it, so a layout is written without a scale
     multiplier.
   - **There is no scale query.** The declarations expose no
     `devicePixelRatio`, `scaleFactor`, pixel ratio or OS zoom value; an app
     cannot branch on the backing scale from JavaScript. (The absences table at
     the bottom of the page carries the row.)
   - **Icons stay sharp.** `packages/icons` paints `SvgProps.source` —
     vector markup — sized by `iconPixels`, so an icon has no 1×/2× variant to
     choose.
   - **A raster image is one file.** `img` takes `src`, `objectFit` and `alt`
     (link `/docs/native-elements`), never a `srcSet`; the file is painted into
     the layout box and `objectFit` decides the fit. Pass a larger asset if the
     target displays are dense, and state that no automatic density selection
     exists.
   - **What is not measured.** No probe records a painted 1× or 2× frame; the
     scale is the compositor's. Link `/docs/performance` for the measurement
     rule and `/docs/typography` for fonts (installed families, no
     `registerFont` in 0.10.0) instead of restating them.

   Do not claim the runtime upscales or downscales. Do not call spring/retina a
   supported feature. No code fence is required: this section is a boundary, not
   an API.

3. Add one bullet to `## Related`: Typography (the typeface side of the same
   display question). Keep the existing five.

### 3.4 `apps/docs/src/lib/page-aliases.ts`

Add to the existing `/docs/window` block, exact whole-query terms only:

`display scale`, `scale factor`, `ui scale`, `hidpi`, `hi dpi`, `high dpi`,
`retina`, `retina display`, `device pixel ratio`, `pixel density`,
`pixel ratio`, `dpr`, `ppi`, `4k`, `logical pixels`, `display resolution`.

Do **not** add `zoom`, `high contrast`, `scale`, `pixel` or `resolution` alone:
`zoom` is `zoomWindow()`'s action, `high contrast` belongs to Theming, and a
single word would steal a token-scale or component query. Extend the file's top
doc comment with a "Plan 631" paragraph naming the display-scale subject and
those five exclusions.

### 3.5 `apps/docs/scripts/smoke-build.ts`

Append two rows to the production query table (beside the window rows added by
plan 625):

| query | expected | what |
| ----- | -------- | ---- |
| `hi dpi` | `/docs/window` | the display-scale subject, which reached Theming's high-contrast roles before |
| `retina` | `/docs/window` | the same subject, which returned nothing before |

### 3.6 Bookkeeping

- `TODO.md`: add the plan-631 row at the top of the docs-site section, tick it,
  keep `197/197` → `198/198`.
- `.agents/slop/plans/README.md`: append the plan-631 row to the docs table.
- `PLAN.md` §4: add decision D67 stating that the logical pixel is the unit,
  the scale query is absent, and the page owns the claim with a both-direction
  guard.

## 4. Test plan

### 4.1 New: `apps/docs/src/lib/display-scale.test.ts`

Header comment names the bug guarded: a page claiming a scale query or density
descriptor exists when the installed runtime has none, and the reverse (a
runtime upgrade that adds one leaving the page false).

1. **Fixture, each rule proven to fail** — feed a synthetic `native` containing
   `scaleFactor?: number` and expect the scale violation; a `host` containing
   `srcSet?: string` and expect the density violation; remove `interface
   ImgProps` and expect its violation; remove `interface SvgProps` and expect
   its violation; strip `source={icons[name]}` from a fixture icon source and
   expect that violation; strip `width: pixels` and expect that violation.
2. **Real run** — import `installedNativeDeclarations()` and the installed
   `@gpuix/native/dist/host` text through `native-declarations.testing.ts`'s
   helpers, read `../../packages/icons/src/Icon.tsx`, and expect
   `displayScaleViolations(...)` to equal `[]`. This fails the day the pinned
   runtime gains any of the six symbols.
3. **The page states the subject** — read `content/docs/window.mdx` and assert
   the `## Display scale and pixel density` heading exists, the frontmatter
   description contains `display scale`, and the section names `logical pixel`,
   `getWindowSize`, `srcSet`, `objectFit` and `SvgProps.source`. This is the
   content half; it fails if the section is deleted after the data guard passes.

Use the existing `readFileSync` pattern from other page guards. No `any`, no
assertion that the test itself stubbed.

### 4.2 `apps/docs/src/lib/page-aliases.test.ts`

Add to `owned`:

```
["hidpi", "/docs/window"]
["hi dpi", "/docs/window"]
["high dpi", "/docs/window"]
["retina", "/docs/window"]
["retina display", "/docs/window"]
["device pixel ratio", "/docs/window"]
["pixel density", "/docs/window"]
["dpr", "/docs/window"]
["scale factor", "/docs/window"]
["display scale", "/docs/window"]
["ui scale", "/docs/window"]
["ppi", "/docs/window"]
["4k", "/docs/window"]
["logical pixels", "/docs/window"]
```

Add to `regressions`:

```
["high contrast", "/docs/theming#high-contrast"]
["scales", "/docs/theming#scales-and-control-metrics"]
```

The existing table guards (every key a page, no component page, no shared or
shadowing term, whole-query only) run over the new rows automatically.

### 4.3 Two-direction proofs to run and record in §7

1. Add `scaleFactor?: number` to a fixture `native` string → the new test fails
   by name (the real run still passes).
2. Rename the section heading in `window.mdx` → the content test fails by name;
   restore it.
3. Remove `hidpi` from the window alias block → `page-aliases.test.ts` reports
   the query's new first result; restore it.
4. Remove `high contrast` from `regressions` and add it to the window block as a
   temporary probe → the regression row fails, proving a shorter word cannot be
   stolen; revert.
5. Production: `smoke:build` fails by query when the alias is removed (build
   once, `--no-build` for the re-run).

## 5. Commands and expected results

```sh
cd apps/docs
nub run --filter docs check-types
# expected: exit 0, no diagnostics
nub run --filter docs test -- src/lib/display-scale.test.ts src/lib/page-aliases.test.ts
# expected: all pass; the display-scale real run reports the installed runtime
nub run --filter docs test
# expected: exit 0; test-file count 149 → 150
nub run --filter docs smoke:build
# expected: exit 0, every sitemap page, both new queries first
```

Root gates before the merge, not while iterating: `nub run check`,
`nub run lint`, `nub run test`.

## 6. STOP conditions

Stop and report instead of improvising if:

- the installed declarations already contain a scale query or a density
  descriptor (the premise is false; record the finding and do not write the
  absence claim);
- `windowAbsences`' symbol guard already fails for the new row (the row is
  wrong, not the runtime);
- adding the aliases makes any existing `regressions` row fail
  (`high contrast`, `scales`, `zoom`, `scale`, `pixel`) — report the collision
  rather than deleting the older row;
- the page section would need to claim upscaling, a supported zoom control or a
  measured frame — those are not measured; leave the absence sentence instead;
- `smoke:build` cannot start (exit `2`) — report unverified, never pass.

## 7. Acceptance criteria

- `/docs/window` owns display scale: `hidpi`, `retina`, `hi dpi`, `high dpi`,
  `display scale`, `scale factor`, `pixel density`, `device pixel ratio`,
  `dpr`, `ppi`, `4k` and `logical pixels` return it first; `high contrast` and
  `scales` keep Theming.
- The page states the logical-pixel unit, the absent scale query, the vector
  icon path, the single-image rule and the unmeasured boundary, with links to
  Native elements, Performance and Typography instead of duplication.
- `display-scale.test.ts` fails on each of the six fixtures and passes on the
  installed runtime; the page content check fails if the section is removed.
- `smoke:build` proves two of the queries against the production index.
- `check-types`, the docs suite and the built-site smoke are green; the results
  and the measured before/after are recorded in §8 of this plan.

## 8. Results

*(filled in after implementation)*
