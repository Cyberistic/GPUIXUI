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
