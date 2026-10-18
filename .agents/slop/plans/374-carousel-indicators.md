# 374 — Carousel indicators: a named, pressable dot per slide

**Phase.** F — integration and polish (a shipped Tier 2 component closing a
documented gap).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 117, 315, 323, 365.
**Status.** done 2026-10-18 — 3 native tests (Carousel 15, behaviour 545); the
press and keyboard cases fail when the dot's `goTo` wiring is removed.

## 1. Why this plan exists

`Carousel` documents "no indicator dots, auto-advance or thumbnails in v1"
(`docs/carousel.mdx` Limitations, `carouselMeta.limitations`, `COMPONENTS.md`).
Auto-advance and thumbnails need a timer and image work the runtime does not
justify here; **indicator dots need nothing the runtime lacks**:

- the root already owns `active`, `count` and `goTo(index)` in
  `CarouselContext` (`src/carousel.tsx`);
- a dot is a `div` with a width, a height, `radius.full` and a fill — all in
  `StyleDesc`;
- press and keyboard activation already exist as `internal/activate.ts`
  (`Enter` on press, `Space` on release, one activation per keystroke).

So the gap is a missing part, not a missing capability. A reader who wants to
jump to slide 4 currently must press Next three times or use the arrow keys.

## 2. What will change

1. New `CarouselIndicators` part, rendered as a named `group` of one pressable
   dot per slide. The active dot is wider and uses the `primary` role; the rest
   use `border`; the caller can restyle each dot with a state function.
2. The dot press and keyboard paths call the root's `goTo`, so they share the
   existing clamp/loop rule and controlled/uncontrolled state.
3. Three native tests, both themes via the existing style-callback test pattern.
4. Docs, example, inventory record, `COMPONENTS.md` and the parts table in
   `docs/component-api.md` name the new part and the real test count.

No public API change to existing parts. Auto-advance and thumbnails remain
documented as absent.

## 3. Exact implementation

### 3.1 `packages/components/src/carousel.tsx`

Import `Arr` (already an Effect-first file) and `activationHandlers`:

```ts
import * as Arr from "effect/Array";
import { activationHandlers } from "./internal/activate.js";
```

Add beside `CarouselControl`:

```tsx
/** {@link CarouselIndicators} props. */
export interface CarouselIndicatorsProps extends Omit<Props, "children"> {
  /** The group's accessible name. Default `"Choose slide"`. */
  readonly label?: string;
  /** A style for every dot, or a function of its state. */
  readonly indicatorStyle?: StateStyle<CarouselIndicatorState>;
}

/** What a dot draws: whether it is the active slide and its index. */
export interface CarouselIndicatorState {
  readonly active: boolean;
  readonly index: number;
}

/**
 * One pressable dot per slide. The active dot is wider and uses `primary`; the
 * dots share the root's `goTo`, including its clamp and controlled value.
 */
export const CarouselIndicators = ({
  label = "Choose slide",
  indicatorStyle,
  style,
  onKeyDown,
  onKeyUp,
  ...rest
}: CarouselIndicatorsProps) => {
  const theme = useTheme();
  const { active, count, goTo } = useCarousel();

  return (
    <div
      role="group"
      aria-label={label}
      {...rest}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
        },
        style,
      )}
    >
      {Arr.map(Arr.range(0, Math.max(0, count - 1)), (index) => {
        const isActive = index === active;
        const state: CarouselIndicatorState = { active: isActive, index };
        return (
          <div
            key={index}
            role="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={isActive}
            tabIndex={0}
            testId={`carousel-indicator-${index}`}
            {...activationHandlers(() => goTo(index))}
            onClick={() => goTo(index)}
            style={mergeStyles(
              {
                width: isActive ? 18 : 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: isActive
                  ? theme.colors.primary
                  : theme.colors.border,
                cursor: "pointer",
              },
              resolveStyle(indicatorStyle, state),
            )}
          />
        );
      })}
    </div>
  );
};
```

Notes:

- `count === 0` renders an empty group; `Arr.range(0, Math.max(0, count - 1))`
  avoids a negative range.
- The dot is `role="button"`, not `role="tab"`: there is no `tablist`/`tabpanel`
  relationship to declare, and 0.10.0 has no `aria-controls`. `aria-selected`
  is the runtime's supported way to convey the active dot (Pagination's current
  page uses the same attribute for the same reason).
- `activationHandlers` returns `onKeyDown`/`onKeyUp`; the group's caller handlers
  stay on the group, so a consumer's key handler still sees every keystroke once.
- Do **not** stop the root's ArrowLeft/ArrowRight: a focused dot and the root
  share the same stepping rule, exactly as the controls do.

Add the part to the contract:

```ts
const carouselParts: ReadonlyArray<PartComponent> = [
  Carousel,
  CarouselTrack,
  CarouselSlide,
  CarouselControl,
  CarouselIndicators,
];

const carouselRoot: PartsContract = {
  parent: "Carousel",
  family: carouselParts,
  accepts: [CarouselTrack, CarouselControl, CarouselIndicators],
  hint: "Put CarouselTrack, CarouselControl and CarouselIndicators directly inside Carousel.",
};
```

Update the file header ("controls, indicator dots and the arrow keys share one
clamp and one loop rule") and `carouselMeta.limitations`: delete
`"no indicator dots or auto-advance in v1"` and replace it with
`"no auto-advance or thumbnails"`.

### 3.2 `packages/components/src/behaviour/carousel.test.tsx`

Import `CarouselIndicators`. Add a controlled fixture and a stateful wrapper:

```tsx
const IndicatorGallery = ({
  value,
  onValueChange,
}: {
  readonly value: number;
  readonly onValueChange?: (value: number) => void;
}) => (
  <div style={{ width: 480 }}>
    <Carousel
      testId="carousel"
      label="Screenshots"
      value={value}
      onValueChange={onValueChange}
    >
      <CarouselTrack testId="track">
        <CarouselSlide testId="slide-0">
          <text>One</text>
        </CarouselSlide>
        <CarouselSlide testId="slide-1">
          <text>Two</text>
        </CarouselSlide>
        <CarouselSlide testId="slide-2">
          <text>Three</text>
        </CarouselSlide>
      </CarouselTrack>
      <CarouselIndicators testId="indicators" />
    </Carousel>
  </div>
);

const StatefulIndicators = ({ initial = 0 }: { readonly initial?: number }) => {
  const [value, setValue] = useState(initial);
  return <IndicatorGallery value={value} onValueChange={setValue} />;
};
```

Three tests (the suite is **12** today, so it becomes **15**):

| # | Test | Must fail on the old code because |
| - | ---- | --------------------------------- |
| 1 | **one named dot per slide, active marked** — three `carousel-indicator-*` nodes, names `Go to slide 1..3`, only the active one has `aria-selected`, its width is `18`, the others `8`, and the active fill is `darkTheme.colors.primary` | `CarouselIndicators` does not exist |
| 2 | **a press jumps to that slide** — click `carousel-indicator-2`; `paintedSlides` is `["Three"]` and only dot 2 is selected | the same |
| 3 | **Enter and Space activate a focused dot** — focus dot 0, `simulateKeystrokes("enter")` paints `["Two"]`; focus dot 2, `simulateKeystrokes("space")` paints `["Three"]` | the same |

Update the suite header to add the new bug: a slide that could only be reached
by repeated stepping.

### 3.3 `packages/components/docs/carousel.mdx`

- Opening: "previous/next controls and the arrow keys" → add the indicator dots.
- Usage: import and render `CarouselIndicators` after the track.
- Behaviour table: add `indicator press` / `Enter`/`Space` on a focused dot →
  `goTo` that slide.
- API table: `CarouselIndicators` row — `role="group"` with `aria-label`,
  children none, `label?` (default "Choose slide"),
  `indicatorStyle?: StateStyle<CarouselIndicatorState>`.
- `CarouselIndicatorState` is `{ active, index }`.
- Theming: name the active `primary` / inactive `border` fills and the widths.
- Accessibility: the dots are named buttons; the active one is `aria-selected`;
  each is a tab stop. No `aria-current`/`aria-controls` in 0.10.0.
- Limitations: remove "No indicator dots"; keep "No auto-advance or thumbnails".
- Verification: **15 tests**, naming the dot count/selection, the press jump and
  the keyboard activation.

### 3.4 `packages/components/examples/carousel.example.tsx`

Render `CarouselIndicators` under the track, next to the controls, and say in the
header comment that a dot jumps straight to its slide.

### 3.5 `COMPONENTS.md`

Carousel row: replace the "no indicator dots or auto-advance" clause with "one
named dot per slide, active marked and pressable (press, Enter or Space); no
auto-advance or thumbnails"; change **12** to **15** native behaviour tests.

### 3.6 `docs/component-api.md`

The Carousel row in §8 gains `CarouselIndicators`:

`| Carousel | `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`, `CarouselIndicators` | — | plan 315/374 |`

### 3.7 Indexes

- `.agents/slop/plans/README.md` — add the `374` row.
- `TODO.md` — add and tick under "Tier 2 hardening after the inventory closed":
  *Carousel indicator dots: one named, pressable dot per slide — plan 374; 3
  native tests (Carousel 15)*.

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/carousel.test.tsx
```

Expected: **Carousel 15/15 green**. Before §3.1 the three new tests fail to
import/render `CarouselIndicators`.

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
```

Expected: both exit `0`; the inventory check reads 15 once §3.3 is updated.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: behaviour **545** (542 + 3), unit **357**, and all three commands exit
`0`.

## 5. STOP conditions

Stop and report with the measurement instead of improvising if:

1. A dot cannot take focus or receives no `Enter`/`Space` after
   `renderer.focusElement` — do not replace the button with a click-only div.
2. `Arr.range` is not exported by the pinned `effect` version (the package
   already uses it in `pagination/logic.ts`; if that changed, use `Arr.makeBy`).
3. The indicator group breaks `nodesWithRole(gallery.renderer, "group")` in
   "names the region and both controls" — the assertion is `toContain`, so it
   should not; if it does, investigate rather than weakening the old test.
4. `nub run check` fails in a file outside §3. Record it in `TODO.md` instead of
   editing another workstream's file.

## 6. Acceptance

- Three new native tests pass; the suite reports 15.
- Dots are named buttons, the active one is visually and semantically marked,
  and press/Enter/Space all jump to the right slide (clamped by the root).
- Auto-advance and thumbnails remain explicitly absent.
- Docs, example, inventory record, `COMPONENTS.md` and the parts table name the
  part and the real count.
- Plan indexed and the `TODO.md` task ticked.

## 7. Result

Executed on this host, 2026-10-18.

- `src/behaviour/carousel.test.tsx`: **15/15 green**.
- Both directions: replacing the dot's `goTo(index)` with `undefined` (press and
  keyboard wiring removed, rendering intact) gives **2 failed / 13 passed** — the
  press test stays on `One`, and the keyboard test stays on `Two`; with the fix,
  **15/15**.
- Full behaviour suite: **545 passed** (was 542; +3 cases) across 47 files; unit
  **357 passed**; `check`, `lint` and workspace `test` exit `0`.
- Docs, example, inventory record, `COMPONENTS.md` and the §8 parts table name
  `CarouselIndicators` and the real count (15).
- Auto-advance and thumbnails remain explicitly absent.
