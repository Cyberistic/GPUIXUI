/**
 * Carousel: discrete slide stepping.
 *
 * `motion` in 0.10.0 animates width, left and opacity only — there is no
 * transform/translate — and scroll snap is unavailable, so a sliding track is
 * not honestly expressible. Every slide stays mounted and only the active one is
 * painted: an inactive slide is `visibility: hidden` with a collapsed box,
 * because 0.10.0 ignores `display: none` (plan 365). That keeps each slide's
 * component state (a form on slide two is not reset by visiting slide three).
 *
 * The root owns the active index; the track reports its slide count, so the
 * controls, the indicator dots and the arrow keys share one clamp and one loop
 * rule.
 */

import {
  useGpuix,
  type EventPayload,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Children,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { slideIndex } from "./carousel/logic.js";
import { activationHandlers } from "./internal/activate.js";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { isFirst, isLast, isLeft, isRight } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { focusRing, useTheme } from "./internal/theme.js";

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
  ref,
  onKeyDown,
  onFocus,
  onBlur,
  autoFocus = false,
  ...rest
}: CarouselProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const root = useRef<PublicInstance | null>(null);
  const setRoot = useMergedRef<PublicInstance | null>(root, ref);
  const [focused, setFocused] = useState(autoFocus);
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [count, setCount] = useState(0);
  assertParts(carouselRoot, children);

  const active = slideIndex(value, count);

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
        ref={setRoot}
        role="group"
        aria-label={label}
        autoFocus={autoFocus}
        tabIndex={0}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onKeyDown={(event: EventPayload) => {
          // A key that bubbles from a control in a slide belongs to that
          // control, so the root steps only while it is the focused element
          // (plan 614); the caller still sees every key.
          if (
            root.current !== null &&
            renderer?.getFocusedElementId?.() === root.current.id
          ) {
            if (isRight(event)) context.step(1);
            else if (isLeft(event)) context.step(-1);
            else if (isFirst(event)) context.goTo(0);
            else if (isLast(event)) context.goTo(count - 1);
          }
          onKeyDown?.(event);
        }}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
            ...(focused ? focusRing(theme) : {}),
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

/**
 * An inactive slide: no paint, no hit test, no layout space. `display: "none"`
 * is ignored by GPUix 0.10.0, so visibility is the measured mechanism (plan 365;
 * the playground measured the same property in plan 177).
 */
const hiddenSlide = {
  visibility: "hidden",
  pointerEvents: "none",
  width: 0,
  height: 0,
  overflow: "hidden",
  flexGrow: 0,
  flexShrink: 0,
} as const;

/** The active slide: it fills the track. */
const shownSlide = {
  visibility: "visible",
  pointerEvents: "auto",
  flexGrow: 1,
} as const;

/**
 * One slide. It stays mounted while inactive so its state survives, and it is
 * hidden with visibility rather than `display`.
 */
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
          display: "flex",
          flexDirection: "column",
          ...(active ? shownSlide : hiddenSlide),
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
  onClick,
  ...rest
}: CarouselControlProps) => {
  const theme = useTheme();
  const { active, count, loop, step } = useCarousel();
  const atEdge = direction === "next" ? active >= count - 1 : active <= 0;
  const name =
    label ?? (direction === "next" ? "Next slide" : "Previous slide");

  return (
    <Button
      {...rest}
      aria-label={name}
      disabled={disabled || count === 0 || (atEdge && !loop)}
      onClick={(event) => {
        onClick?.(event);
        step(direction === "next" ? 1 : -1);
      }}
    >
      <Icon
        name={direction === "next" ? "chevron-right" : "chevron-left"}
        color={theme.colors.mutedForeground}
        size="md"
      />
    </Button>
  );
};

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
  const indexes = count === 0 ? Arr.empty<number>() : Arr.range(0, count - 1);
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );

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
      {Arr.map(indexes, (index) => {
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
            onFocus={() => setFocusedIndex(Option.some(index))}
            onBlur={() => setFocusedIndex(Option.none())}
            style={mergeStyles(
              {
                width: isActive ? 18 : 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: isActive
                  ? theme.colors.primary
                  : theme.colors.border,
                cursor: "pointer",
                ...(Option.contains(focusedIndex, index)
                  ? focusRing(theme)
                  : {}),
              },
              resolveStyle(indicatorStyle, state),
            )}
          />
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
  hint: "Put CarouselTrack, CarouselControl and CarouselIndicators directly inside Carousel.",
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
  focusable: true,
  limitations: [
    "discrete stepping only: motion has no transform and scroll snap is unavailable",
    "no swipe gesture (no drag host feature) and no slide animation",
    "no auto-advance or thumbnails",
    "inactive slides stay mounted and are hidden with visibility: hidden and a collapsed box",
  ],
  docs: "docs/carousel.mdx",
  example: "examples/carousel.example.tsx",
  testFile: "src/behaviour/carousel.test.tsx",
} as const;
