/** @jsxImportSource @gpuix/react */
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
import { useMoveTiming } from "./internal/presence.js";
import {
  controlRing,
  keyboardRing,
  targetSize,
  useTheme,
} from "./internal/theme.js";

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

const useCarousel = (): CarouselContextValue => {
  const value = useContext(CarouselContext);
  if (value === undefined) {
    throw new Error("Carousel parts must be used inside Carousel");
  }
  return value;
};

const CountContext = createContext<((count: number) => void) | undefined>(
  undefined,
);

export interface CarouselProps extends Omit<Props, "children"> {
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onValueChange?: (value: number) => void;

  readonly loop?: boolean;

  readonly label: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

  const current = Number.isFinite(active) ? active : 0;

  const context = useMemo<CarouselContextValue>(
    () => ({
      active: current,
      count,
      loop,
      step: (delta) => {
        if (count === 0) return;
        const next = current + delta;
        const target =
          next < 0 || next >= count
            ? loop
              ? (next + count) % count
              : Math.min(Math.max(next, 0), count - 1)
            : next;
        if (target !== current) setValue(target);
      },
      goTo: (index) => {
        if (count === 0) return;
        const target = Math.min(Math.max(index, 0), count - 1);
        if (target !== current) setValue(target);
      },
    }),
    [current, count, loop, setValue],
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

export interface CarouselTrackProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface CarouselSlideProps extends Omit<Props, "children" | "style"> {
  readonly className?: string;
  readonly style?: StateStyle<CarouselSlideState>;
  readonly children?: PartChildren;
}

export interface CarouselSlideState {
  readonly index: number;
}

export const CarouselSlide = ({
  className,
  style,
  children,
  ...rest
}: CarouselSlideProps) => {
  const theme = useTheme();
  const { active: activeIndex } = useCarousel();
  const index = useContext(SlideIndexContext) ?? 0;

  if (index !== activeIndex) return null;

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(CAROUSEL_SLIDE, className), theme),
        resolveStyle(style, { index }),
      )}
    >
      {children}
    </div>
  );
};

export interface CarouselControlProps extends Omit<Props, "children"> {
  readonly direction: "previous" | "next";

  readonly label?: string;
  readonly disabled?: boolean;
}

const CONTROL_VARIANT = "secondary" as const;

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

export interface CarouselIndicatorsProps extends Omit<
  Props,
  "children" | "style"
> {
  readonly label?: string;

  readonly className?: string;

  readonly style?: StateStyle<CarouselIndicatorsState>;
}

export interface CarouselIndicatorsState {
  readonly active: number;
  readonly count: number;
}

const DOT_HEIGHT = 6;
const DOT_REST_WIDTH = 6;
const DOT_ACTIVE_WIDTH = 18;

export const CarouselIndicators = ({
  label,
  className,
  style,
  ...rest
}: CarouselIndicatorsProps) => {
  const { active, count, goTo } = useCarousel();
  const theme = useTheme();
  const move = useMoveTiming("fast");

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
              motion={{
                initial: false,
                animate: {
                  width: selected ? DOT_ACTIVE_WIDTH : DOT_REST_WIDTH,
                },
                transition: move,
              }}
              style={{
                height: DOT_HEIGHT,
                borderRadius: DOT_HEIGHT / 2,

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

export const carouselMeta = {
  name: "Carousel",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the track does not travel between slides: the frame sizes itself to the slide on screen, so a travel would lay every slide out in one box and take its height from the tallest slide",
    "the active indicator grows between the 6px dot and the 18px pill on the runtime's clock (`fast`, 160 ms) through the timing table's `standard` phase, because it moves between two resting states rather than arriving; the two inks change with the selection in the same frame, because `motion` interpolates numbers and has no colour",
    "no swipe gesture (no drag host feature) and no scroll snap",
    "no auto-advance or thumbnails in v1",
    "only the slide on screen is mounted, so a slide's local state does not survive a visit (the pinned renderer ignores `display: none`, so a mounted spare slide would paint and keep its tab stops)",
  ],
  docs: "docs/carousel.mdx",
  example: "examples/carousel.example.tsx",
  testFile: "src/behaviour/carousel.test.tsx",
} as const;
