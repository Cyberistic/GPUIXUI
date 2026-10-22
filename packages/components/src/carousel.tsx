/**
 * Carousel: discrete slide stepping.
 *
 * `motion` in 0.11.0 animates box geometry (width, height, insets, radius) and
 * opacity only — there is no transform/translate — and scroll snap is
 * unavailable, so a sliding track is not honestly expressible. Every slide stays
 * mounted and only the active one is displayed. That keeps each slide's
 * component state (a form on slide two is not reset by visiting slide three) and
 * needs no positioning trick.
 *
 * The root owns the active index; the track reports its slide count, so the
 * controls and the arrow keys share one clamp and one loop rule.
 */

import type { KeyEvent, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  CAROUSEL_INDICATORS,
  CAROUSEL_ROOT,
  CAROUSEL_SLIDE,
  CAROUSEL_TRACK,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import {
  Children,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Button, actionOnColor } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import {
  activationHandlers,
  isFirst,
  isLast,
  isLeft,
  isRight,
} from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlRing,
  keyboardRing,
  targetSize,
  useTheme,
} from "./internal/theme.js";

/** The rules a carousel part follows; throws outside a {@link Carousel}. */
interface CarouselContextValue {
  readonly active: number;
  readonly count: number;
  readonly loop: boolean;
  readonly step: (delta: 1 | -1) => void;
  readonly goTo: (index: number) => void;
}

const CarouselContext = createContext<CarouselContextValue | undefined>(
  undefined,
);

const SlideIndexContext = createContext<number | undefined>(undefined);

/** The carousel a part belongs to. Throws when there is none. */
const useCarousel = (): CarouselContextValue => {
  const value = useContext(CarouselContext);
  if (value === undefined) {
    throw new Error("Carousel parts must be used inside Carousel");
  }
  return value;
};

/** The count reporter the track uses; separate so the root owns the state. */
const CountContext = createContext<((count: number) => void) | undefined>(
  undefined,
);

/** {@link Carousel} props. */
export interface CarouselProps extends Omit<Props, "children"> {
  /** The controlled active index. `undefined` means uncontrolled. */
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onValueChange?: (value: number) => void;
  /** Wrap at both ends. Default `false`. */
  readonly loop?: boolean;
  /** The carousel's accessible name. */
  readonly label: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The slide container: one active slide, arrow/Home/End stepping. */
export const Carousel = ({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  loop = false,
  label,
  className,
  children,
  style,
  onKeyDown,
  ...rest
}: CarouselProps) => {
  const theme = useTheme();
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [count, setCount] = useState(0);
  assertParts(carouselRoot, children);

  const active = count === 0 ? 0 : Math.min(Math.max(value, 0), count - 1);

  const context = useMemo<CarouselContextValue>(
    () => ({
      active,
      count,
      loop,
      step: (delta) => {
        if (count === 0) return;
        const next = active + delta;
        const target =
          next < 0 || next >= count
            ? loop
              ? (next + count) % count
              : Math.min(Math.max(next, 0), count - 1)
            : next;
        if (target !== active) setValue(target);
      },
      goTo: (index) => {
        if (count === 0) return;
        const target = Math.min(Math.max(index, 0), count - 1);
        if (target !== active) setValue(target);
      },
    }),
    [active, count, loop, setValue],
  );

  return (
    <CarouselContext.Provider value={context}>
      <div
        {...rest}
        role="group"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(event: KeyEvent) => {
          if (isRight(event)) context.step(1);
          else if (isLeft(event)) context.step(-1);
          else if (isFirst(event)) context.goTo(0);
          else if (isLast(event)) context.goTo(count - 1);
          onKeyDown?.(event);
        }}
        style={mergeStyles(
          mergeStyles(
            recipeStyle(cn(CAROUSEL_ROOT, className), theme),
            // The root is a tab stop that owns the arrow keys, so a Tab must show
            // where those keys will act — the runtime paints this outline only
            // after keyboard focus, never after a pointer press.
            keyboardRing(theme),
          ),
          style,
        )}
      >
        <CountContext.Provider value={setCount}>
          {children}
        </CountContext.Provider>
      </div>
    </CarouselContext.Provider>
  );
};

/** {@link CarouselTrack} props. */
export interface CarouselTrackProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The slide container: reports the slide count and gives each slide its index. */
export const CarouselTrack = ({
  className,
  children,
  style,
  ...rest
}: CarouselTrackProps) => {
  const theme = useTheme();
  const reportCount = useContext(CountContext);
  const slides = Children.toArray(children);
  assertParts(carouselTrack, children);

  useLayoutEffect(() => {
    reportCount?.(slides.length);
  }, [reportCount, slides.length]);

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(CAROUSEL_TRACK, className), theme),
        style,
      )}
    >
      {slides.map((slide, index) => (
        <SlideIndexContext.Provider key={index} value={index}>
          {slide}
        </SlideIndexContext.Provider>
      ))}
    </div>
  );
};

/** {@link CarouselSlide} props. */
export interface CarouselSlideProps extends Omit<Props, "children" | "style"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly style?: StateStyle<CarouselSlideState>;
  readonly children?: PartChildren;
}

/** What a slide draws: whether it is on screen and its index. */
export interface CarouselSlideState {
  readonly active: boolean;
  readonly index: number;
}

/** One slide. It stays mounted while inactive and is hidden with `display`. */
export const CarouselSlide = ({
  className,
  style,
  children,
  ...rest
}: CarouselSlideProps) => {
  const theme = useTheme();
  const { active: activeIndex } = useCarousel();
  const index = useContext(SlideIndexContext) ?? 0;
  const active = index === activeIndex;

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(CAROUSEL_SLIDE, className), theme), {
          display: active ? "flex" : "none",
        }),
        resolveStyle(style, { active, index }),
      )}
    >
      {children}
    </div>
  );
};

/** {@link CarouselControl} props. */
export interface CarouselControlProps extends Omit<Props, "children"> {
  /** `"previous"` moves back, `"next"` moves forward. */
  readonly direction: "previous" | "next";
  /** The accessible name; defaults to "Previous slide" / "Next slide". */
  readonly label?: string;
  readonly disabled?: boolean;
}

/**
 * The controls' fill, pinned rather than left to `Button`'s default so the
 * chevron's on-colour and the fill it sits on are one decision. The pair is
 * `secondaryForeground` on `secondary`, which `contrastPairs` measures in every
 * shipped style.
 */
const CONTROL_VARIANT = "secondary" as const;

/** A previous/next control. It is disabled at an edge unless the carousel loops. */
export const CarouselControl = ({
  direction,
  label,
  disabled = false,
  ...rest
}: CarouselControlProps) => {
  const { active, count, loop, step } = useCarousel();
  const theme = useTheme();
  const atEdge = direction === "next" ? active >= count - 1 : active <= 0;
  const name =
    label ?? (direction === "next" ? "Next slide" : "Previous slide");

  return (
    <Button
      {...rest}
      variant={CONTROL_VARIANT}
      aria-label={name}
      disabled={disabled || count === 0 || (atEdge && !loop)}
      onClick={() => step(direction === "next" ? 1 : -1)}
    >
      <Icon
        name={direction === "next" ? "chevron-right" : "chevron-left"}
        size="md"
        color={actionOnColor(theme, CONTROL_VARIANT)}
      />
    </Button>
  );
};

/** {@link CarouselIndicators} props. */
export interface CarouselIndicatorsProps extends Omit<
  Props,
  "children" | "style"
> {
  /** The group's accessible name. Default "Choose a slide". */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the active slide and the count. */
  readonly style?: StateStyle<CarouselIndicatorsState>;
}

/** What the indicators draw: the active slide and how many there are. */
export interface CarouselIndicatorsState {
  readonly active: number;
  readonly count: number;
}

/**
 * The drawn dot: a circle at rest, a pill on the active slide.
 *
 * The drawing is smaller than the target that carries it, and the **width** is
 * what makes the active state readable beyond colour — a dot that differs only
 * in hue is a dot a reader who cannot separate the two hues is told nothing by.
 * Both inks are mark roles (`indicatorRoles`): `primary` for the active dot and
 * `mutedForeground` for the rest, each measured at the mark floor on the page.
 */
const DOT_HEIGHT = 6;
const DOT_REST_WIDTH = 6;
const DOT_ACTIVE_WIDTH = 18;

/**
 * One press target per slide, marking the active one.
 *
 * The dots are a **second** route to `goTo` beside the controls and the arrow
 * keys, so a reader can jump three slides without stepping through them. Each
 * target reserves the 24px press floor around a smaller drawing, the group holds
 * one roving tab stop on the active dot, and `aria-selected` carries the state
 * because `0.11.0` has no `aria-current` — the substitution Pagination, Stepper
 * and Breadcrumb use.
 */
export const CarouselIndicators = ({
  label,
  className,
  style,
  ...rest
}: CarouselIndicatorsProps) => {
  const { active, count, goTo } = useCarousel();
  const theme = useTheme();

  if (count === 0) return null;

  return (
    <div
      {...rest}
      role="group"
      aria-label={label ?? "Choose a slide"}
      style={mergeStyles(
        recipeStyle(cn(CAROUSEL_INDICATORS, className), theme),
        resolveStyle(style, { active, count }),
      )}
    >
      {Arr.makeBy(count, (index) => {
        const selected = index === active;
        return (
          <div
            key={index}
            role="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            testId={
              rest.testId === undefined ? undefined : `${rest.testId}-${index}`
            }
            onClick={() => goTo(index)}
            {...activationHandlers(() => goTo(index))}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: targetSize.minimum,
              height: targetSize.minimum,
              flexShrink: 0,
              cursor: "pointer",
              ...controlRing(theme),
            }}
          >
            <div
              style={{
                width: selected ? DOT_ACTIVE_WIDTH : DOT_REST_WIDTH,
                height: DOT_HEIGHT,
                borderRadius: DOT_HEIGHT / 2,
                // The target is the press: a drawing that took the pointer would
                // swallow a press on the middle of the dot (`0.11.0` runs the
                // innermost handler, and a child with none runs nothing).
                pointerEvents: "none",
                backgroundColor: selected
                  ? theme.colors.primary
                  : theme.colors.mutedForeground,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
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
  hint: "Put CarouselTrack and CarouselControl directly inside Carousel.",
};

const carouselTrack: PartsContract = {
  parent: "CarouselTrack",
  family: carouselParts,
  accepts: [CarouselSlide],
  hint: "Put CarouselSlide directly inside CarouselTrack.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const carouselMeta = {
  name: "Carousel",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "discrete stepping only: motion has no transform and scroll snap is unavailable",
    "no swipe gesture (no drag host feature) and no slide animation",
    "no auto-advance or thumbnails in v1",
    "inactive slides stay mounted and are hidden with display: none",
  ],
  docs: "docs/carousel.mdx",
  example: "examples/carousel.example.tsx",
  testFile: "src/behaviour/carousel.test.tsx",
} as const;
