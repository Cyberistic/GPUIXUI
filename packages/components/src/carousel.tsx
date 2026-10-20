/**
 * Carousel: discrete slide stepping.
 *
 * `motion` in 0.10.0 animates width, left and opacity only — there is no
 * transform/translate — and scroll snap is unavailable, so a sliding track is
 * not honestly expressible. Every slide stays mounted and only the active one is
 * displayed. That keeps each slide's component state (a form on slide two is not
 * reset by visiting slide three) and needs no positioning trick.
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
import {
  Children,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { isFirst, isLast, isLeft, isRight } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useTheme } from "./internal/theme.js";

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
  readonly children?: PartChildren;
}

/** The slide container: one active slide, arrow/Home/End stepping. */
export const Carousel = ({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  loop = false,
  label,
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
          {
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
          },
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
  readonly children?: PartChildren;
}

/** The slide container: reports the slide count and gives each slide its index. */
export const CarouselTrack = ({
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
        {
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        },
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
  style,
  children,
  ...rest
}: CarouselSlideProps) => {
  const { active: activeIndex } = useCarousel();
  const index = useContext(SlideIndexContext) ?? 0;
  const active = index === activeIndex;

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: active ? "flex" : "none",
          flexDirection: "column",
          flexGrow: 1,
        },
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

/** A previous/next control. It is disabled at an edge unless the carousel loops. */
export const CarouselControl = ({
  direction,
  label,
  disabled = false,
  ...rest
}: CarouselControlProps) => {
  const { active, count, loop, step } = useCarousel();
  const atEdge = direction === "next" ? active >= count - 1 : active <= 0;
  const name =
    label ?? (direction === "next" ? "Next slide" : "Previous slide");

  return (
    <Button
      {...rest}
      aria-label={name}
      disabled={disabled || count === 0 || (atEdge && !loop)}
      onClick={() => step(direction === "next" ? 1 : -1)}
    >
      <text>{direction === "next" ? "›" : "‹"}</text>
    </Button>
  );
};

/** Every part, so a misplaced sibling is named. */
const carouselParts: ReadonlyArray<PartComponent> = [
  Carousel,
  CarouselTrack,
  CarouselSlide,
  CarouselControl,
];

const carouselRoot: PartsContract = {
  parent: "Carousel",
  family: carouselParts,
  accepts: [CarouselTrack, CarouselControl],
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
    "no indicator dots or auto-advance in v1",
    "inactive slides stay mounted and are hidden with display: none",
  ],
  docs: "docs/carousel.mdx",
  example: "examples/carousel.example.tsx",
  testFile: "src/behaviour/carousel.test.tsx",
} as const;
