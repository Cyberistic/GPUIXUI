import { targetSize } from "@gpuixui/tokens";

/**
 * The carousel preview's stepping arithmetic and its drawing metrics.
 *
 * A carousel is a fixed set of slides and three routes to the same index:
 * previous/next controls, the arrow keys and one press target per slide. The
 * component keeps one clamp and one loop rule for all three, so the preview must
 * too — a drawing whose dots wrap while its controls stop is a picture of a
 * component nobody ships.
 *
 * The drawing is the component's own: a 6px dot that becomes an 18px pill on the
 * active slide, inside the shared 24px press floor. The widths are constants in
 * `packages/components/src/carousel.tsx`; `carousel-preview.test.ts` reads them
 * out of that file, so a preview cannot carry numbers the component does not
 * paint.
 */

/** The dot's height: one drawing size for rest and active. */
export const dotHeight = 6;

/** The dot at rest. */
export const dotRestWidth = 6;

/** The active slide's pill: the state is a shape, not only a hue. */
export const dotActiveWidth = 18;

/** The press target each 6px drawing sits in, from the library's shared floor. */
export const dotTarget = targetSize.minimum;

/** A direction a control or a key can ask for. */
export type SlideStep = 1 | -1;

/** What a step has to know: the current slide, how many there are, and the rule. */
export interface StepInput {
  readonly active: number;
  readonly count: number;
  readonly delta: SlideStep;
  readonly loop: boolean;
}

/**
 * The active index the component resolves before it paints.
 *
 * `Carousel` clamps a controlled value into the slide range, so a caller whose
 * value survives a slide being removed paints the last slide rather than a blank
 * carousel. An empty track has no slide to clamp to and resolves to zero.
 */
export const resolveActive = (active: number, count: number): number =>
  count === 0 ? 0 : Math.min(Math.max(active, 0), count - 1);

/**
 * The slide one step from the active one.
 *
 * A step past an end **wraps** only when `loop` is on; otherwise it stays on the
 * end it reached, which is why a control there is disabled. This is the
 * component's own expression, not a second opinion about it.
 */
export const stepIndex = ({
  active,
  count,
  delta,
  loop,
}: StepInput): number => {
  if (count === 0) return 0;
  const current = resolveActive(active, count);
  const next = current + delta;
  if (next >= 0 && next < count) return next;
  return loop ? (next + count) % count : Math.min(Math.max(next, 0), count - 1);
};

/** The slide a dot names, clamped the same way the root clamps a value. */
export const goToIndex = (index: number, count: number): number =>
  resolveActive(index, count);

/** `Home` and `End` are the two ends of the set, whatever the loop rule is. */
export const firstIndex = (): number => 0;
export const lastIndex = (count: number): number =>
  resolveActive(count - 1, count);

/** Whether a control would leave the set by asking to go further. */
export const atEdge = (
  active: number,
  count: number,
  direction: SlideStep,
): boolean => {
  const current = resolveActive(active, count);
  return direction === 1 ? current >= count - 1 : current <= 0;
};

/**
 * Whether a control is disabled.
 *
 * An empty track has nothing to step to; an edge disables the control unless the
 * carousel loops. The component adds `disabled` and `count === 0` to the same
 * answer, so a preview that ignored either would paint a press that does
 * nothing.
 */
export const controlDisabled = ({
  active,
  count,
  delta,
  loop,
}: StepInput): boolean =>
  count === 0 || (!loop && atEdge(active, count, delta));

/** Which dot is the group's one tab stop: the active slide's. */
export const rovingStop = (active: number): number => active;

/** The width a dot's drawing takes, which is how the active state reads. */
export const dotWidth = (selected: boolean): number =>
  selected ? dotActiveWidth : dotRestWidth;

/** The accessible name of a dot. `0.11.0` has no `aria-current`. */
export const dotLabel = (index: number): string => `Go to slide ${index + 1}`;

/** The line a workflow preview prints under its carousel. */
export const describeSlide = (
  active: number,
  count: number,
  loop: boolean,
): string =>
  count === 0
    ? "No slides"
    : `Slide ${resolveActive(active, count) + 1} of ${count} · ${
        loop ? "wraps at both ends" : "stops at the ends"
      }`;
