# 498 — The docs code palette clears the contrast floor

**Phase:** F (docs readability and theme truth) · **Owner:** docs-site
**Depends on:** 410 (the site), 416 (the docs identity is the token palette), 446
(the hydrated browser smoke), 495 (every preview page is read hydrated)
**Status:** implemented

## 1. Why this plan exists

The site's primary content is code: every component page includes the real
source, every API section is a generated prop table, and nine non-component
pages are mostly fences. A measured audit of the **production build** (90 pages
× light and dark, every leaf `span` inside `pre`, its computed colour against the
first opaque background above it) found exactly two failing pairs:

| Scheme | Colour | Painted on | Ratio | Occurrences | Where it is used |
| ------ | ------ | ---------- | ----- | ----------- | ---------------- |
| light | `#e36209` | `#ffffff` | **3.49:1** | 2 236 | GitHub Light's `entity.name.tag` / `support.class` — the `undefined`, `string`, prop-name tokens in source and prop tables |
| dark | `#6a737d` | `#191d25` | **3.51:1** | 3 270 | GitHub Dark's comment colour, used verbatim in both schemes by the shipped theme |

Both are below WCAG 2.1 AA for normal text (4.5:1) at the size the site paints
them (13 px). They affect **146 of 180 page-modes** — the component pages with
prop tables almost all hit the light orange, and every source include hits the
dark comment. The rest of the palette clears the floor (the light comment sits at
4.82:1 on white and stays).

The cause is the default pair: Fumadocs' `rehype-code` ships
`themes: { light: "github-light", dark: "github-dark" }`
(`defaultThemes` in `fumadocs-core/dist/utils-*.js`), and the generated prop
tables run a **second** Shiki pipeline (`remarkAutoTypeTable`'s `shiki` option)
with the same defaults. Neither is configured in this app.

MISSION asks for "readable code blocks" and "light/dark docs themes"; the docs
identity is the library's palette, which holds every text role to AA. The code
palette is the one reading surface that does not.

The fix is surgical, not a theme redesign: keep GitHub's familiar hues and
replace the two failing values. Shiki applies `colorReplacements` after
tokenization and accepts them **per theme name**
(`resolveColorReplacements` in `@shikijs/primitive`), so the light replacement
cannot darken a light-mode comment and vice versa.

## 2. Goal and acceptance

| Requirement | Evidence |
| ----------- | -------- |
| Every code leaf on every page clears **4.5:1** in both schemes | `smoke:browser` reads the painted colours and fails below the floor |
| The two pipelines use the same map | `source.config.ts` passes `codeColorReplacements` to both `rehypeCodeOptions` and `remarkAutoTypeTable`'s `shiki` option; a unit test asserts the wiring |
| A future theme/palette change cannot silently regress it | the unit test recomputes each replacement against `lightTheme.colors.card` / `darkTheme.colors.card`; the browser smoke recomputes against what was actually painted |
| The fix is documented for the next maintainer | `apps/docs/README.md` gains a **Code highlighting** section; `contributing.mdx` says `smoke:browser` also proves code contrast |
| No component, token or preview changes | `COMPONENTS.md` is untouched; the change is `apps/docs` only |

Values, chosen as the smallest departure from the shipped theme that clears the
floor with margin (the numbers below are computed in §6):

| Scheme | Replace | With | Ratio on the code background |
| ------ | ------- | ---- | ---------------------------- |
| light | `#e36209` | `#b34700` | 5.50:1 on `#ffffff` |
| dark | `#6a737d` | `#8b949e` | 5.49:1 on `#191d25` |

`#8b949e` is GitHub's own dark-mode muted colour, so the comment keeps its
relative weight. `#b34700` is the same orange family, darkened until it passes.

## 3. Exact changes

### 3.1 Create `apps/docs/src/lib/code-palette.ts`

```ts
import { darkTheme, lightTheme } from "@gpuixui/tokens";

/**
 * The syntax palette the docs paint, and the two corrections it needs
 * (plan 498).
 *
 * Fumadocs highlights with GitHub Light and GitHub Dark by default. Measured
 * in the production build, two of their colours fall below the 4.5:1 text
 * floor on this site's code background (the card role): light `#e36209` at
 * 3.49:1 and dark `#6a737d` at 3.51:1. Shiki's `colorReplacements` maps a
 * colour per theme name, so each correction reaches one scheme only.
 *
 * The generated prop tables run their own Shiki pipeline, so
 * `codeColorReplacements` is passed to both in `source.config.ts`.
 * `code-palette.test.ts` recomputes every ratio and
 * `smoke-browser.ts` re-measures the painted page.
 */
export const codeThemes = {
  light: {
    theme: "github-light",
    background: lightTheme.colors.card,
    replacements: { "#e36209": "#b34700" },
  },
  dark: {
    theme: "github-dark",
    background: darkTheme.colors.card,
    replacements: { "#6a737d": "#8b949e" },
  },
} as const;

/** Shiki's per-theme replacement shape, shared by both highlight pipelines. */
export const codeColorReplacements = {
  [codeThemes.light.theme]: codeThemes.light.replacements,
  [codeThemes.dark.theme]: codeThemes.dark.replacements,
};

/** WCAG 2.1 relative luminance of an opaque `#rrggbb` colour. */
const luminance = (hex: string): number => {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (raw: number): number => {
    const scaled = raw / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255)
  );
};

/**
 * WCAG 2.1 contrast of two opaque colours. Exported so the browser smoke
 * measures the painted page with the same arithmetic the unit test uses.
 */
export const contrastRatio = (foreground: string, background: string): number => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};
```

### 3.2 `apps/docs/source.config.ts`

Pass the map to both pipelines:

```ts
import { defineConfig } from "fumadocs-mdx/config";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { codeColorReplacements } from "./src/lib/code-palette";
import { generator } from "./src/lib/type-table-generator";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      [remarkAutoTypeTable, { generator, shiki: { colorReplacements: codeColorReplacements } }],
    ],
    rehypeCodeOptions: { colorReplacements: codeColorReplacements },
  },
});
```

### 3.3 `apps/docs/scripts/smoke-browser.ts`

- Extend `DomState` with `codeText: ReadonlyArray<{ colour: string; background: string; text: string }>`.
- In `readDom`, walk every leaf `span` inside `pre`, skip empty text, resolve
  the first ancestor with an opaque `rgb()`/`rgba(…,1)` background, and
  de-duplicate by `colour|background` keeping one example text.
- Add `codeContrastProblems(dom)` using `contrastRatio` from
  `src/lib/code-palette.ts` (already imported by the app; the script may import
  it the way it imports `@gpuixui/tokens`), returning one problem per failing
  pair: `` `<colour> on <background> is 3.49:1, below 4.5:1 (e.g. "undefined")` ``.
- Apply it in the check loop for **every** visited page, not only preview
  surfaces: `const failures = [...check.problems(dom), ...codeContrastProblems(dom)]`.
  Every page the smoke visits is a component page with a source include and a
  prop table, so the map is exercised in both schemes.

### 3.4 Create `apps/docs/src/code-palette.test.ts`

The header comment states the bug being guarded: *the default GitHub pair paints
light `#e36209` at 3.49:1 and dark `#6a737d` at 3.51:1 on the docs code
background; nothing compared a syntax colour to the floor, so both shipped.*

Assertions:

1. **Every replacement clears the floor** — for each mode, `contrastRatio(replacement, theme.background) >= 4.5`.
2. **The map targets only the failing colours** — light replaces exactly `#e36209`, dark exactly `#6a737d` (a theme bump that changes a colour must show up here).
3. **Both pipelines get the map** — import the default export of `source.config.ts` and assert:
   - `mdxOptions.rehypeCodeOptions.colorReplacements` equals `codeColorReplacements`;
   - the `remarkAutoTypeTable` plugin entry's options carry `shiki.colorReplacements` equal to the same object.
4. **The keys are the theme names Fumadocs defaults to** — `Object.keys(codeColorReplacements)` equals `["github-light", "github-dark"]`, because Shiki matches a per-theme map by `theme.name`; a renamed theme would silently drop the corrections.

### 3.5 `apps/docs/README.md`

Add a **Code highlighting** section after **Theme**:

- the defaults are GitHub Light/Dark, and the app overrides two colours;
- the measured values and why (3.49:1 / 3.51:1 below the 4.5:1 floor);
- both pipelines read `src/lib/code-palette.ts`; change the palette there;
- `smoke:browser` proves every painted code leaf clears the floor.

### 3.6 `apps/docs/content/docs/contributing.mdx`

In the `smoke:browser` row, after the platform sentence, add: *"It also reads
every code colour on the pages it visits and fails below the 4.5:1 text floor in
either scheme."* (`docs-checks.test.ts` only requires the script names, so this
is prose truth, not a guard change.)

### 3.7 `TODO.md` and the plan index

- `TODO.md` → **Docs site workstream (plans 410–498)**: add the row
  "**The docs code palette clears the contrast floor (plan 498)**", tick it, and
  update the header count `98/98` → `99/99`.
- `.agents/slop/plans/README.md` → add `498-code-contrast.md` to the docs-site
  table with status `implemented` and the measured evidence.

## 4. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter docs test` | 54+ files pass; the new suite is among them |
| 2 | `nub run --filter docs build` | exits `0`; the generated prop tables and code blocks still render |
| 3 | `nub run --filter docs smoke:browser` | exits `0`; every page prints `checked` |
| 4 | `nub run --filter docs smoke:build` | exits `0`; 90 pages / 109 links |
| 5 | `nub run check` | test quality, lint, format and types pass |
| 6 | `nub run test` | every workspace test passes |

## 5. STOP conditions

- **STOP** if `colorReplacements` does not reach the painted page: if the
  rebuilt site still paints `#e36209` or `#6a737d`, do not add a CSS override or
  a `!important`. Either the option shape is wrong for this Fumadocs version
  (read `rehype-code`'s `RehypeCodeOptions` in the installed package and correct
  the plan) or the theme names differ (read `theme.name`), and the plan must be
  amended before continuing.
- **STOP** if any replacement clears 4.5:1 against the card role but a third
  colour appears on a page type not audited. Re-run the full audit, extend the
  map, and record the new pair in this plan.
- **STOP** if `smoke:browser` cannot run (exit `2`): report it as unverified;
  never call it a pass.
- **STOP** if the fix requires touching `packages/`, `COMPONENTS.md` or any
  component. The palette is docs-owned; a token change is another workstream's
  task and must be recorded in `TODO.md` instead.

## 6. Test plan (each test can fail)

| Test | Catches | Two-direction proof |
| ---- | ------- | ------------------- |
| `code-palette.test.ts` → every replacement clears the floor | a future edit that darkens/lightens a replacement until it stops passing | replace `#b34700` with `#e36209` → the light case fails with 3.49 < 4.5 |
| `code-palette.test.ts` → the map targets the failing colours | a GitHub theme bump that changes the failing token | add an extra entry or rename a key → the equality assertion fails |
| `code-palette.test.ts` → both pipelines receive the map | dropping `rehypeCodeOptions` or the `shiki` option from `source.config.ts` | delete either property → the wiring assertion fails |
| `code-palette.test.ts` → theme keys are the defaults | renaming a theme in the map | rename `github-light` to `light` → the key assertion fails |
| `smoke:browser` → every painted code leaf ≥ 4.5:1 | the option not reaching the renderer, a CSS override, a theme change | run the smoke on the pre-fix build → it exits `1` and names `#e36209 on #ffffff, 3.49:1` and `#6a737d on #191d25, 3.51:1` |

Baseline measured before the fix (production build, 2026-10-18): **2 failing
pairs across 146 of 180 page-modes** — light `rgb(227, 98, 9)` on
`rgb(255, 255, 255)` 3.49:1 (2 236 spans) and dark `rgb(106, 115, 125)` on
`rgb(25, 29, 37)` 3.51:1 (3 270 spans). After the fix the same audit must report
**0 failing pairs**.

Arithmetic the replacements rely on:

```
#e36209 on #ffffff = 3.49:1   → #b34700 = 5.50:1
#6a737d on #191d25 = 3.51:1   → #8b949e = 5.49:1
#6a737d on #ffffff = 4.82:1   (light comments pass; leave the light map alone)
```

## 7. Results

Implemented 2026-10-18.

- **The palette landed** — `src/lib/code-palette.ts` exports the two theme
  entries, the Shiki replacement map, the theme names and `contrastRatio`;
  `source.config.ts` passes the same `{ themes, colorReplacements }` object to
  `rehypeCodeOptions` and to `remarkAutoTypeTable`'s `shiki` option. The themes
  had to be named explicitly: `rehypeCodeOptions`'s type requires a theme, and
  naming them is what keeps the per-theme replacement keys honest.
- **The unit suite pins the wiring** — `src/code-palette.test.ts` (7 tests)
  asserts the original colour fails the floor and the replacement clears it,
  pins the replaced colours and the theme keys, reads both colour shapes the
  callers pass, and imports the real `source.config.ts` to prove both pipelines
  receive the themes and the map. The suite is now 55 files / 361 tests (was
  54 / 354).
- **The painted page was re-measured** — the full audit (90 pages × 2 schemes)
  that found 2 failing pairs across 146 of 180 page-modes reports **0** after
  the rebuild. `smoke:browser` now reads every distinct code colour on each page
  it visits, so the release gate owns the claim instead of the plan.
- **Two-direction proof, measured** — with the pre-fix `source.config.ts`
  restored and rebuilt, `smoke:browser` exits `1` with **100 problems** (50
  pages × 2 schemes), naming `rgb(227, 98, 9) on rgb(255, 255, 255) is 3.49:1`
  and `rgb(106, 115, 125) on rgb(25, 29, 37) is 3.51:1`; with the fix it exits
  `0` over **101 checks** (98 preview checks + 3 platform URLs). The same
  two-direction proof holds for the unit suite: reverting a replacement fails
  the ratio assertion by name, and deleting either pipeline option fails the
  wiring assertion.
- Docs: `apps/docs/README.md` gains **Code highlighting**, and the
  `smoke:browser` row on Contributing now says it also proves the code floor.
  No component, token or inventory row changed.

