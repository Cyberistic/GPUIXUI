# 365 — Carousel hides inactive slides in the real runtime

**Phase.** F — integration and polish (a measured runtime defect in a shipped
Tier 2 component).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 117, 315, 326, 338.
**Status.** planned 2026-10-18.

## 1. Why this plan exists

`Carousel` keeps every slide mounted and hides the inactive ones with
`display: active ? "flex" : "none"` (`src/carousel.tsx`, `CarouselSlide`).

**GPUix 0.10.0 ignores `display: none`.** The pinned source
(`packages/native/src/renderer.rs`, `apply_styles`) maps `display` only for
`"flex"` and `"grid"`; anything else falls through. The playground measured this
first in plan `177` §8 (a hidden workspace pane still laid out, painted its text
and stole a click). Plan `347` §2.2 therefore expects the Carousel to be
"asserted as the current limitation and recorded for `components`".

Measured in this worktree on 2026-10-18 (throwaway probe, deleted), rendering a
three-slide gallery at `value={1}` in the real `TestRenderer`:

| Probe | Result on the current code |
| ----- | -------------------------- |
| `getPaintedText()` | `["One", "Two", "Three"]` — **all three slides paint** |
| bounds of `slide-0` / `slide-1` / `slide-2` | `155` / `155` / `168` px wide, side by side |
| click at the track's left edge (where slide 0 sits) | ran the **inactive** slide's row handler |

So a consumer sees three slides at once and can press controls on a slide they
cannot legitimately see. The behaviour suite did not catch it because it asserted
the **authored** `style.display` value (`["none", "flex", "none"]`), which is
true even when the runtime ignores it — a test that cannot fail for the bug it
claims to guard.

## 2. What will change

1. Hide an inactive slide with the mechanism the playground measured:
   `visibility: "hidden"` + `pointerEvents: "none"`, collapsed to zero size so it
   takes no layout space. The slide stays mounted, so its component state
   survives (the reason the track keeps every slide mounted at all).
2. Replace the authored-style assertions with **painted/measured** assertions,
   and add a hit-test case that fails on the current code.
3. Correct the claims in `docs/carousel.mdx`, `examples/carousel.example.tsx`,
   `COMPONENTS.md` and `carouselMeta.limitations` that name `display: none`.
4. Update the documented native-test count.

No public API changes. `CarouselSlideState` is unchanged.

## 3. Exact implementation

### 3.1 `packages/components/src/carousel.tsx`

In `CarouselSlide`, replace the base style object (keep the surrounding
`mergeStyles` and `resolveStyle` calls):

```tsx
const hidden = {
  visibility: "hidden",
  pointerEvents: "none",
  width: 0,
  height: 0,
  overflow: "hidden",
  flexGrow: 0,
  flexShrink: 0,
} as const;

const shown = {
  visibility: "visible",
  pointerEvents: "auto",
  flexGrow: 1,
} as const;

// inside the component
style={mergeStyles(
  {
    display: "flex",
    flexDirection: "column",
    ...(active ? shown : hidden),
  },
  resolveStyle(style, { active, index }),
)}
```

Why each rule:

- `visibility: "hidden"` is the measured paint/hit-test switch; it also takes the
  subtree out of the native tab order (plan `177` §2.1 step 6).
- `pointerEvents: "none"` is belt-and-braces for the hit test; the playground
  measured the pair together.
- `width: 0`, `height: 0`, `flexGrow: 0`, `flexShrink: 0` stop a hidden slide
  occupying a third of the row. Without them the active slide would paint in the
  first third with two blank gaps.
- `overflow: "hidden"` stops a descendant that authors `visibility: "visible"`
  from painting out of a zero-size box.
- The active slide keeps `flexGrow: 1`, so it fills the track exactly as today.

Do **not** unmount inactive slides: state retention is the component's documented
contract and is now proven by a test (§4.1 test 4).

Update the file header comment ("only the active one is displayed") and the
`CarouselSlide` JSDoc to name visibility, not `display`.

Update `carouselMeta.limitations`: replace
`"inactive slides stay mounted and are hidden with display: none"` with
`"inactive slides stay mounted and are hidden with visibility: hidden and a collapsed box"`.

### 3.2 `packages/components/src/behaviour/carousel.test.tsx`

Delete the `displays()` helper and its four assertions. Add:

```tsx
/** The slide labels the renderer actually painted. */
const paintedSlides = (root: ComponentTestRoot): ReadonlyArray<string> =>
  Arr.filter(["One", "Two", "Three"], (label) =>
    root.renderer.getPaintedText().some((line) => line.includes(label)),
  );
```

(`import * as Arr from "effect/Array";` — the suite is Effect-first like the rest
of the package.)

| # | Test | Must fail on the old code because |
| - | ---- | --------------------------------- |
| 1 | **paints only the active slide** — `paintedSlides(gallery)` is `["Two"]` at `value={1}` | the old code paints all three |
| 2 | **gives an inactive slide no layout box** — `Option.isNone(boundsOf(gallery, "slide-0"))`, and the active slide's width is the track's width (± 2 px for the 1 px border) | the old code measures 155 px for `slide-0` |
| 3 | **an inactive slide cannot take the click** — a gallery whose slides each carry a clickable row (counters by index): a click at the track's left edge +20 px reports `"1"` (the active slide fills the track); the old code reports `"0"` | the old code hit-tests the inactive slide |
| 4 | **keeps an inactive slide mounted** — a slide-local counter: click it while active, step to the next slide and back, the counter still reads `1` (`getAllText()` still contains all three slides) | would fail if a later change switched to unmounting |
| 5 | **both themes** — the existing style-callback test keeps its `{ active, index }` assertions and adds `visibility` (`"visible"` / `"hidden"`) read from the measured *painted* tree only through tests 1–2; the light-theme case asserts `paintedSlides` is `["One"]` | — |

Tests 1–3 are the regression guard: they fail on `display`, pass on visibility.
Test 4 guards the mechanism chosen over unmounting. Do not assert
`style.display` anywhere after this change.

The documented count in the suite's header comment and every docs page becomes
**13 native behaviour tests** (9 existing + 4 new; test 5 strengthens an existing
one rather than adding a case).

### 3.3 `packages/components/docs/carousel.mdx`

- Opening paragraph: "only the active one is displayed" → "only the active one
  is painted and hit-testable; the rest keep their state but leave the layout and
  the tab order".
- API table: `CarouselSlide` "`display` toggled" → "hidden with `visibility` and
  a collapsed box".
- Accessibility bullet: replace "Inactive slides stay in the tree with
  `display: none`; a screen reader does not announce them" with the measured
  truth: they stay in the tree (state survives) but are `visibility: hidden`,
  paint nothing and are outside the tab order; 0.10.0 ignores `display: none`,
  which is why the mechanism is visibility.
- Limitations: keep "many heavy slides cost render time"; note that inactive
  slides are still reconciled.
- Verification: state 13 tests and name the new painted/bounds/hit-test cases.

### 3.4 `packages/components/examples/carousel.example.tsx`

Header comment: "only the active one is displayed" → "only the active one is
painted; the others keep their state".

### 3.5 `COMPONENTS.md`

Carousel row: append the measured fact and the test count (13). Keep the
GPUix-support column at `partial` — the limitation is now honest, not gone.

### 3.6 Indexes

- `.agents/slop/plans/README.md` — add the `365` row to the components table.
- `TODO.md` — add and tick one task under "Tier 2 hardening after the inventory
  closed": *Carousel hides inactive slides with the runtime's visibility
  mechanism — plan 365*; record the cross-team evidence line for the playground
  (`347` no longer needs to assert this limitation).

## 4. Exact commands and expected results

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/carousel.test.tsx
```

Expected: `Carousel` 13/13 green. On the unfixed `display` code, tests 1–3 fail
with "painted three slides" / "slide-0 has bounds" / "click ran slide 0".

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
```

Expected: both exit `0`; unit tests unchanged except any docs-count check
(`src/inventory.test.ts` checks the stated count).

```sh
nub run check
nub run lint
```

Expected: both exit `0`. `nub run test` (workspace) runs the non-native suites;
the behaviour suite is the separate command above.

## 5. STOP conditions

Stop and report with the measurement instead of improvising if:

1. `visibility: "hidden"` + zero size still appears in `getPaintedText()` or
   still receives the click. Try `opacity: 0` **only after** measuring, and
   record which property the runtime honours.
2. The active slide no longer fills the track (its width is not the track width)
   or the track's height changes between slides that are the same content height.
3. A hidden slide keeps a focusable descendant in the tab order (plan `177`
   measured it does not; if that changes, the component needs an explicit
   `tabIndex={-1}` sweep and the plan is amended before continuing).
4. `nub run check` fails in a file outside this plan's §3 list. Do not fix an
   unrelated workstream's file; record it in `TODO.md`.

## 6. Acceptance

- `Carousel` paints exactly one slide in the real renderer, the inactive slides
  have no bounds, cannot take a click, and keep their state.
- The four new tests fail on the pre-fix code and pass after it (run both
  directions; paste the two runs' summaries into the plan's status line).
- Docs, example, inventory record and `COMPONENTS.md` name the mechanism and the
  real test count.
- The plan is indexed and the `TODO.md` task is ticked.

## 7. Result

_To be filled after execution._
