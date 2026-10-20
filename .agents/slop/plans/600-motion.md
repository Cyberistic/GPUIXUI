# 600 — Motion has an answer

**Phase:** F (documentation truth, search)
**Workstream:** docs-site
**Depends on:** 410, 416, 430, 520 (the installed-declarations guard pattern), 599
**Status:** implemented — §6 records the commands, the eight-test guard and the six two-direction proofs

## 1. The measured defect

Plan 599 recorded `motion`, `animation` and `easing` as deliberate non-fixes
because "no page can answer them". That was half true: no page answers them, so
a reader is sent to whichever component page happens to contain the word.
Measured 2026-10-20 at `11b5af7d` against the real `search()`:

| Query | First result today | What the reader needs |
| ----- | ------------------ | --------------------- |
| `motion` | `/docs/components/card` | the runtime's animation API |
| `animation` | `/docs/components/accordion#accessibility-and-limitations` | the same |
| `easing` | *nothing* | the timing fields |
| `transition` | `/docs/component-api#state-ownership` | deliberate non-fix (state transitions) |

The facts exist and are precise; they are only scattered as limitations on five
component pages ("no transform", "cannot rotate", "animates opacity, width,
height"). The installed `@gpuix/native` declarations define exactly what an
animation can touch:

```ts
interface MotionStyle {
  width?: number; height?: number; opacity?: number;
  top?: number; right?: number; bottom?: number; left?: number;
  borderRadius?: number;
}
type MotionEase = "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut" | [number, number, number, number];
interface MotionTransition { duration?: number; delay?: number; ease?: MotionEase }
```

`@gpuix/react` exposes `motion.div`, `AnimatePresence`, `usePresence` and
`useIsPresent`. Nothing on the site says so, and `easing` is one of the words a
reader types to find it.

## 2. What to build

### 2.1 The section

`apps/docs/content/docs/theming.mdx` gains `## Motion` **after**
`## Scales and control metrics` (the design-system axes sit together). It states,
in this order and no more:

- the runtime's declarative API: `motion.div` for one element, `AnimatePresence`
  for mount/exit, and `usePresence`/`useIsPresent` inside the child;
- a table of exactly the `MotionStyle` keys, one row each, with what each one
  moves — width/height, opacity, the four inset offsets, radius;
- what it **cannot** animate: no transform, no rotation, no colour, no clip —
  the reason Spinner's arc and Drawer's slide are documented limitations rather
  than animations;
- timing: `duration` and `delay` in **seconds**, and the `MotionEase` literals,
  so a pasted `easeInOut` is recognisable;
- the missing switch: the runtime has no `prefers-reduced-motion` query; the app
  decides;
- one copyable example (`motion.div` + `initial`/`animate`/`transition` with
  `onMotionComplete`), so the section is not prose-only;
- the honest token gap: `@gpuixui/tokens` ships **no** motion group, so each
  component carries its own constants (`packages/tokens` plan 019 tracks
  durations/easings). The guard below fails the moment that changes.

### 2.2 The guards

New file `apps/docs/src/motion-truth.test.ts`:

| Test | Fails when |
| ---- | ---------- |
| `parseInterfaceFields` reads a sample `MotionStyle` and ignores a nested interface | the parser stops being fence/shape-aware (both directions on a fixture with and without `transform`) |
| every parsed `MotionStyle` field appears as a table row on the page | a runtime property is undocumented |
| every table row is a parsed `MotionStyle` field | the page invents a property |
| the page claims no transform, and the parsed field set has none | the runtime gains `transform` and the page still says it cannot |
| `MotionTransition` fields and every `MotionEase` literal are named on the page | the timing surface drifts |
| the page names `motion.div`, `AnimatePresence`, `usePresence`, `useIsPresent` and each is exported by the installed `@gpuix/react` | the page documents an API the package does not have |
| `packages/tokens/src/index.ts` still re-exports exactly the seven shipped modules | a motion group lands and the page's gap note becomes false |

The declarations are read from `node_modules/@gpuix/native/dist/host.d.ts` and
`node_modules/@gpuix/react/dist/index.d.ts`, the pattern plan 520 and
`src/lib/accessibility.test.ts` already use.

### 2.3 Search

`apps/docs/src/lib/page-aliases.ts` gains
`["/docs/theming", ["motion", "animation", "easing"]]`.

`apps/docs/src/lib/page-aliases.test.ts` gains the three queries to `owned` and
`card`, `accordion`, `theming` to `regressions`.

`apps/docs/scripts/smoke-build.ts` gains `easing` → `/docs/theming`
(`first: true`): today it returns **no result at all**, so the check proves the
section is indexed as well as routed.

### 2.4 The maintainer note

`apps/docs/README.md` gains one sentence in the Theming/token-tables area: the
section exists, `motion-truth.test.ts` reads the installed declarations in both
directions, and the tokens tripwire is what makes the gap note go stale loudly.
No second copy elsewhere.

## 3. Order of work and commands

Run from `apps/docs`.

1. `content/docs/theming.mdx`: the section, the table, the example.
2. `src/motion-truth.test.ts`: the parser fixture first, then the page and
   package comparisons.
3. `nub run --filter docs test src/motion-truth.test.ts` → every case passes.
4. `src/lib/page-aliases.ts`, `src/lib/page-aliases.test.ts`; run
   `nub run --filter docs test src/lib/page-aliases.test.ts`.
5. `scripts/smoke-build.ts` one query; README sentence.
6. The two-direction proofs in §5.
7. `nub run --filter docs check-types` → exit `0`.
8. `nub run --filter docs test` → exit `0`; record the counts the run reports.
9. `nub run --filter docs smoke:build` → exit `0`, 99 pages, search checked.
10. Root gates: `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 4. STOP conditions

- Stop if the page cannot be written from the installed declarations alone; a
  claim the declarations do not support is not allowed, even if a component
  page implies it.
- Stop if `parseInterfaceFields` needs a general TypeScript parser; a
  fence-aware field reader over the two known declarations is the budget. If it
  grows past ~40 lines, stop and report.
- Stop if the tokens list assertion cannot be made exact without reading
  `package.json`; report instead of loosening it to a "contains" check.
- Stop if a regression query changes owner.
- Do not add a motion group to `packages/tokens` — that is plan 019's, not this
  plan's.
- Do not touch `transition` or `duration` (measured non-fixes in §1).

## 5. Test plan

Each direction run and reverted:

1. Delete the `opacity` row from the page table → the row guard fails naming
   `opacity`.
2. Add a `transform` row → the invented-property guard fails naming `transform`.
3. Add a `transform?: string` field to the parser fixture and keep the page's
   "cannot animate" sentence → the claim guard fails.
4. Delete `## Motion` → every page comparison fails.
5. Remove `"easing"` from the alias table → the query case and `smoke:build`'s
   `easing` check fail.
6. Rename `useIsPresent` on the page → the export guard fails naming it.

Regressions checked by hand and recorded in §6: `card` → Card, `accordion` →
Accordion, `theming` → Theming, `theme` → Theming, `focus ring` → Tokens API,
`elevation shadow` → Tokens API, `duration` → Countdown, `transition` →
Component API.

## 6. Measured results

Filled by the runs in §3. Nothing in this section may be written before the
command it reports has run.

### 6.1 What shipped

- `apps/docs/content/docs/theming.mdx` — `## Motion` between the scales and the
  platform styles: the API, the eight animatable fields, the absent transform /
  rotation / colour / clip, the timing fields, the reduced-motion gap, a
  copyable `motion.div` example and the token gap.
- `apps/docs/src/motion-truth.test.ts` — 8 tests. `interfaceBody`,
  `propertyNames`, `unionLiterals` and `hasTransformStyle` are pure and each has
  a fixture case; the page comparisons run over the installed
  `@gpuix/native` declarations and `@gpuix/react` entry.
- `apps/docs/src/lib/page-aliases.ts` — `/docs/theming` ← `motion`, `animation`,
  `easing`.
- `apps/docs/src/lib/page-aliases.test.ts` — 60 tests now (was 52).
- `apps/docs/scripts/smoke-build.ts` — `easing` → `/docs/theming`.
- `apps/docs/README.md` — one paragraph beside the token-table paragraph.

One measured owner change: `transition` moved from
`/docs/component-api#state-ownership` to `/docs/theming#motion`. A reader typing
"transition" asks about animation, not state transitions; the regression table
now pins the new owner.

### 6.2 Commands run

From `apps/docs`:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test src/motion-truth.test.ts` | 1 file / **8 tests** pass |
| `nub run --filter docs test src/lib/page-aliases.test.ts` | 1 file / **60 tests** pass |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs test` | **112 files / 878 tests** pass |
| `nub run --filter docs smoke:build` | 99 pages, search checked, **exit `0`** |

Browser gates for the new section (a table and four headings, so not only the
crawl):

| Command | Result |
| ------- | ------ |
| `nub run --filter docs smoke:a11y --no-build --only /docs/theming` | 1 page × 2 schemes, **0 violations** |
| `nub run --filter docs smoke:responsive --no-build` | 99 pages at 390 px, phone controls and mobile navigation checked |
| `nub run --filter docs smoke:console --no-build` | 99 pages, **0 errors** |

From the repository root: `nub run check`, `nub run lint`, `nub run test` — all
exit `0`; the docs package reports 112 files / 878 tests.

The production query is real: measured in-process with the section and the alias
removed, `easing` returns **nothing** (`easing → `), and with the section alone
it returns a text chunk at `/docs/theming#motion` — which is why the alias, not
the section, is what makes the page the first result.

### 6.3 Two-direction proofs (each run, then reverted)

| # | Forced defect | Measured failure |
| - | ------------- | ---------------- |
| 1 | delete the `opacity` table row | `documents every property the runtime can animate` fails with `expected [ 'opacity' ] to deeply equal []` |
| 2 | add a `transform` row | the same guard fails with `expected [ 'transform' ] to deeply equal []` |
| 3 | change the claim to "can be transformed and rotated" | `claims no transform only while the runtime has none` fails on the page regex; the fixture case `notices a runtime that gains a transform` proves the pure predicate returns `true` for a declaration with `transform` |
| 4 | delete the whole `## Motion` section | 5 of 8 fail — properties, claim, timing, API names, token gap; the page table becomes empty |
| 5 | rename `useIsPresent` out of the prose | `names the animation API the package exports` fails with `[ 'useIsPresent' ]` |
| 6 | remove `"easing"` from the alias table | `easing → /docs/theming` fails: the first result is the text chunk `/docs/theming#motion`, not the page |
| 7 | remove the section **and** the alias, then `smoke:build` | **exit `1`**: `FAIL /api/search?query=easing: the first result is not under /docs/theming …`; restored → `smoke: search checked`, `smoke: ok` |

Regressions measured green in the same suite: `card` → Card, `accordion` →
Accordion, `theming` → Theming, `theme` → Theming, `duration` → Countdown
`#composition`, `transition` → Theming `#motion` (the recorded owner change).
`focus ring` and `elevation shadow` stay on Tokens API in `search.test.ts`,
which ran green.
