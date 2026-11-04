/**
 * The arithmetic behind the zoom/pan canvas.
 *
 * A view is a scale and a translation from the content's top-left corner.
 * Keeping it here means a wheel, a drag, a button and a fit all move the same
 * numbers, and a unit test can assert the point under the pointer stays put.
 * The component only owns the gesture and the paint.
 */

export interface ZoomView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5;

export const clampScale = (
  scale: number,
  min = MIN_SCALE,
  max = MAX_SCALE,
): number => Math.min(max, Math.max(min, scale));

export const panBy = (view: ZoomView, dx: number, dy: number): ZoomView => ({
  ...view,
  x: view.x + dx,
  y: view.y + dy,
});

/**
 * Zoom to `scale` while holding `point` (in the container's coordinates) still.
 *
 * This is the rule a wheel and a pinch share: the content under the pointer
 * does not slide away as the scale changes.
 */
export const zoomTo = (
  view: ZoomView,
  scale: number,
  point: { readonly x: number; readonly y: number },
  min = MIN_SCALE,
  max = MAX_SCALE,
): ZoomView => {
  const next = clampScale(scale, min, max);
  const ratio = next / view.scale;
  return {
    scale: next,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  };
};

/** The scale at which `content` fits inside `container`, with padding. */
export const fitScale = (
  content: Size,
  container: Size,
  padding = 40,
  min = MIN_SCALE,
  max = MAX_SCALE,
): number => {
  if (content.width <= 0 || content.height <= 0) return 1;
  const available = {
    width: Math.max(1, container.width - padding),
    height: Math.max(1, container.height - padding),
  };
  return clampScale(
    Math.min(
      available.width / content.width,
      available.height / content.height,
    ),
    min,
    max,
  );
};

/** A view that centres `content` in `container` at its fit scale. */
export const fitView = (
  content: Size,
  container: Size,
  padding = 40,
  min = MIN_SCALE,
  max = MAX_SCALE,
): ZoomView => {
  const scale = fitScale(content, container, padding, min, max);
  return {
    scale,
    x: (container.width - content.width * scale) / 2,
    y: (container.height - content.height * scale) / 2,
  };
};

/** A wheel's delta as a multiplicative factor, normalised across devices. */
export const wheelFactor = (deltaY: number, deltaMode = 0): number => {
  const delta =
    deltaMode === 1 ? deltaY * 40 : deltaMode === 2 ? deltaY * 800 : deltaY;
  return Math.exp(-delta * 0.002);
};

export const initialView = (scale: number): ZoomView => ({
  scale: clampScale(scale),
  x: 0,
  y: 0,
});

export const percentOf = (scale: number): number => Math.round(scale * 100);
