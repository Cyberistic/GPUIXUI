# 315 — Carousel: discrete slide stepping

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §4 (C1) |
| Status | planned |
| Source | `docs/component-api.md` §8 (planned parts: `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`); `COMPONENTS.md` → Tier 2 → Carousel; plan `205` C1 |

This plan is self-contained. It adds `Carousel` at the Tier 2 bar.

---

## 1. Why

Screenshots, onboarding steps and galleries need previous/next navigation with a
known position. The honest constraint: GPUix `motion` animates width, left and
opacity only — **no transform or translate** — and scroll snap is unavailable
(verified, plan 203). A sliding track is therefore not honestly expressible.

`Carousel` v1 is **discrete**: all slides stay mounted, the active one is
displayed and the others are hidden. This preserves each slide's component
state (a form in slide two is not reset by a visit to slide three) and needs no
positioning trick that `position:"absolute"` would break (plan 112 §1c).

## 2. The target API

```tsx
<Carousel label="Screenshots" defaultValue={0} loop>
  <CarouselTrack>
    <CarouselSlide>…</CarouselSlide>
    <CarouselSlide>…</CarouselSlide>
  </CarouselTrack>
  <div style={{ display: "flex", gap: 8 }}>
    <CarouselControl direction="previous" />
    <CarouselControl direction="next" />
  </div>
</Carousel>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Carousel` | the active index (controlled/uncontrolled), `loop`, keyboard stepping, the labelled region | `value?`, `defaultValue?` (default `0`), `onValueChange?`, `loop?` (default `false`), `label` (required), children |
| `CarouselTrack` | `role="group"`; gives each slide its index; hides the inactive ones | children |
| `CarouselSlide` | one slide container; hidden (`display: "none"`) unless active | `style?: StateStyle<CarouselSlideState>` |
| `CarouselControl` | a previous/next button; disabled at an edge unless `loop` | `direction: "previous" \| "next"`, `label?`, `disabled?` |

`CarouselSlideState` is `{ readonly active: boolean; readonly index: number }`.

### Behaviour contract

- **Active index is clamped** to `0..count-1` by the track when the children
  change; `next` at the end is a no-op, `previous` at the start is a no-op,
  unless `loop`, which wraps both ways.
- **Keyboard:** the root is focusable (`tabIndex={0}`) and `ArrowRight`/`ArrowLeft`
  step; `Home`/`End` go to the first/last slide. The root carries the `label` as
  its accessible name.
- **Controls** are the local `Button` stand-in with `IconButton`-style `label`
  (`"Previous slide"` / `"Next slide"` defaults), rendered as text glyphs `‹`
  and `›` until an icon set lands.
- All slides mount; inactive slides are `display: "none"`. No animation, no
  swipe, no indicators row in v1 — record each as a limitation rather than
  shipping a fake.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/carousel.tsx` | **create** — the four parts, the contexts, `carouselMeta` |
| `packages/components/src/index.ts` | add `export * from "./carousel.js";` |
| `packages/components/src/inventory.ts` | import and list `carouselMeta` |
| `packages/components/src/behaviour/carousel.test.tsx` | **create** — 8 tests (§6) |
| `packages/components/examples/carousel.example.tsx` | **create** — a three-panel gallery with keyboard hints |
| `packages/components/docs/carousel.mdx` | **create** — including why it is discrete |
| `docs/component-api.md` | move Carousel into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 8 native tests, the animation/swipe limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: Carousel 8
nub run --filter @gpuixui/components test             # expected: inventory pass
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- hidden slides are removed from the retained tree by `display: "none"` — then
  they keep state only if mounted; measure `getElement` on an inactive slide and
  record what the runtime does before choosing the hiding mechanism;
- `focus` on the root does not deliver arrow keys — then the controls are the
  only step path and the keyboard promise is dropped from docs and tests;
- a consumer wants animated slides — that needs transform, which 0.10.0 does not
  have; record it, do not fake an animation with opacity.

## 6. Test plan

`src/behaviour/carousel.test.tsx`, real renderer:

1. renders every slide (they stay mounted) and displays only the active one;
2. clicking `next`/`previous` moves the active slide and calls `onValueChange`;
3. `next` at the end and `previous` at the start are no-ops without `loop`;
4. `loop` wraps in both directions;
5. `ArrowRight`/`ArrowLeft` step the focused root; `Home`/`End` jump;
6. controlled `value` renders that slide and does not move on its own;
7. the root is named by `label` and the controls are named buttons; they are
   disabled at the edges without `loop`;
8. a slide `style` callback receives `{ active, index }`; both themes.

**Both directions.** Remove the clamp in the track: test 3 fails. Ignore `loop`:
test 4 fails. Restore after each.

## 7. Acceptance criteria

- Four parts with JSDoc and `CarouselSlideState`.
- Eight native tests, both themes, no literal colours.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.
