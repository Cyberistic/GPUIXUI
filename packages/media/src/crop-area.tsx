/**
 * `CropArea`: a picture with a draggable crop hole and a painted mask.
 *
 * The mask is **four positioned veil bars** around the hole, because the
 * runtime has no `clip-path`, mask or radial gradient — the mechanism the
 * playground's `crop-overlay` probe measured in a window (37 checks, 0.11.0):
 * a bar paints the veil composited over the bitmap while the hole shows the
 * bitmap, each bar declares `pointerEvents: "none"` so a press reaches the
 * frame beneath it, and a 10×10 corner handle keeps 8 of 8 moves and clamps at
 * the 24-point minimum and the bitmap's edges.
 *
 * The hole is **controlled**: the caller owns the rectangle, so a crop can be
 * restored, applied to the picture and shown in a readout from one value. A
 * press on the picture moves the hole; a corner handle resizes from that
 * corner, by pointer or by the arrow keys (the handle is a focusable
 * `role="slider"` that announces the rectangle). Both gestures begin on the
 * **primary** press — a secondary press is a context-menu gesture, not a drag.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useEffect, useRef, type ReactElement } from "react";
import {
  clampCrop,
  cornerCursor,
  cornerLabel,
  cropBars,
  cropGuides,
  cropLabel,
  CROP_HANDLE_SIZE,
  CROP_MIN_SIZE,
  CropCorner,
  CropRect,
  cropKey,
  gestureCrop,
  handleBox,
  isPrimaryPress,
  sameCrop,
  type CropBounds,
  type CropGesture,
  type CropModifiers,
} from "./crop/logic.js";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import { accessibleName } from "./name.js";

/** The handler side of a gesture, owned by the React wrapper. */
export interface CropAreaSurface {
  readonly onFrameDown: (event: CropPointer) => void;
  readonly onFrameMove: (event: CropPointer) => void;
  readonly onRelease: () => void;
  readonly onHandleDown: (corner: CropCorner, event: CropPointer) => void;
  readonly onHandleKey: (corner: CropCorner, event: CropKey) => void;
}

/** A pointer payload, read structurally so a fixture can supply one. */
export interface CropPointer {
  readonly x?: number | null;
  readonly y?: number | null;
  /** Which button went down; `0` is the primary one. Absent reads as primary. */
  readonly button?: number | null;
  readonly stopPropagation?: () => void;
}

/** A key payload, read structurally so a fixture can supply one. */
export interface CropKey {
  readonly key?: string | null;
  readonly modifiers?: CropModifiers | null;
  readonly preventDefault?: () => void;
}

/** {@link CropArea} props. */
export interface CropAreaProps extends Omit<Props, "children" | "onChange"> {
  /** A path, data URL or http(s) URL for the picture. */
  readonly src: string;
  /** The picture's accessible name. */
  readonly alt: string;
  /** The frame's width in points; the crop's coordinate space. */
  readonly width: number;
  /** The frame's height in points; the crop's coordinate space. */
  readonly height: number;
  /** The hole, in the frame's points. */
  readonly value: CropRect;
  /** Reports the hole a gesture leaves. */
  readonly onChange: (crop: CropRect) => void;
  /** The smallest side a crop may keep, on a resize and on a move. Default `24`; a value that is not a positive number reads as the default. */
  readonly minSize?: number;
  /** A corner handle's side. Default `10`; a value that is not a positive number reads as the default. */
  readonly handleSize?: number;
  /**
   * The hole's width / height. A drag keeps it; a ratio that cannot be read
   * leaves the hole free.
   */
  readonly aspectRatio?: number;
  /** Paint the rule-of-thirds guides inside the hole. Default `false`. */
  readonly guides?: boolean;
  /** The frame's accessible name. Default `"Crop area"`; a blank name reads as the default. */
  readonly label?: string;
  /** Refuse the gestures; the frame keeps painting. */
  readonly disabled?: boolean;
  readonly className?: string;
}

const CORNERS: ReadonlyArray<CropCorner> = ["nw", "ne", "sw", "se"];

const DEFAULT_LABEL = "Crop area";

/** The frame's box, read from the caller's two sides. */
export const cropBounds = (width: number, height: number): CropBounds => ({
  width: Number.isFinite(width) && width > 0 ? width : 0,
  height: Number.isFinite(height) && height > 0 ? height : 0,
});

const absolute = (box: CropRect): StyleDesc => ({
  position: "absolute",
  left: box.x,
  top: box.y,
  width: box.width,
  height: box.height,
});

/**
 * A guide is a one-point line the page colour fills with an ink outline, so one
 * of the two contrasts on any picture: a white line on a dark photo, its dark
 * outline on a white one.
 */
const guideStyle = (theme: Theme, box: CropRect): StyleDesc => ({
  ...absolute(box),
  backgroundColor: theme.colors.background,
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 1,
    color: theme.colors.foreground,
  },
  pointerEvents: "none",
});

const handleStyle = (
  theme: Theme,
  box: CropRect,
  corner: CropCorner,
  disabled: boolean,
): StyleDesc => ({
  ...absolute(box),
  backgroundColor: disabled ? theme.colors.muted : theme.colors.primary,
  borderWidth: theme.borderWidth.thin,
  borderStyle: "solid",
  borderColor: theme.colors.background,
  borderRadius: theme.radius.sm,
  cursor: disabled ? "default" : cornerCursor(corner),
  ...(disabled ? {} : keyboardFocusRing(theme)),
});

/** The element `CropArea` renders. Pure in its arguments. */
export const renderCropArea = (
  props: CropAreaProps,
  theme: Theme,
  surface: CropAreaSurface,
): ReactElement => {
  const {
    src,
    alt,
    width,
    height,
    value,
    onChange: _onChange,
    minSize = CROP_MIN_SIZE,
    handleSize = CROP_HANDLE_SIZE,
    aspectRatio,
    guides = false,
    label = DEFAULT_LABEL,
    disabled = false,
    className,
    style,
    ...rest
  } = props;
  const name = accessibleName(label, DEFAULT_LABEL);
  const bounds = cropBounds(width, height);
  const crop = clampCrop(value, bounds, minSize, aspectRatio);
  const bars = cropBars(crop, bounds);

  return (
    <div
      {...rest}
      role="group"
      aria-label={name}
      onMouseDown={(event) => {
        if (!disabled) surface.onFrameDown(event);
      }}
      onMouseMove={(event) => {
        if (!disabled) surface.onFrameMove(event);
      }}
      onMouseUp={() => surface.onRelease()}
      onMouseLeave={() => surface.onRelease()}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn("rounded-sm", className), theme), {
          position: "relative",
          width: bounds.width,
          height: bounds.height,
          backgroundColor: theme.colors.card,
          overflow: "hidden",
          cursor: disabled ? "default" : "move",
        }),
        style,
      )}
    >
      {src.trim().length === 0 ? null : (
        <img
          src={src}
          alt={alt}
          objectFit="fill"
          style={{ width: bounds.width, height: bounds.height }}
        />
      )}
      <>
        {bars.map((bar) => (
          <div
            key={bar.side}
            testId={`crop-bar-${bar.side}` satisfies string}
            style={{
              ...absolute(bar.box),
              backgroundColor: theme.colors.overlay,
              pointerEvents: "none",
            }}
          />
        ))}
      </>
      <>
        {guides
          ? cropGuides(crop).map((guide) => (
              <div
                key={guide.name}
                testId={`crop-guide-${guide.name}`}
                style={guideStyle(theme, guide.box)}
              />
            ))
          : null}
      </>
      <>
        {CORNERS.map((corner) => (
          <div
            key={corner}
            testId={`crop-handle-${corner}`}
            role="slider"
            aria-label={`${name} ${cornerLabel(corner)} handle`}
            aria-valuetext={cropLabel(crop)}
            tabIndex={disabled ? -1 : 0}
            onMouseDown={(event) => {
              if (disabled) return;
              surface.onHandleDown(corner, event);
            }}
            onMouseMove={(event) => {
              if (!disabled) surface.onFrameMove(event);
            }}
            onMouseUp={() => surface.onRelease()}
            onKeyDown={(event) => {
              if (!disabled) surface.onHandleKey(corner, event);
            }}
            style={handleStyle(
              theme,
              handleBox(crop, corner, handleSize, bounds),
              corner,
              disabled,
            )}
          />
        ))}
      </>
    </div>
  );
};

/** A crop frame with a controlled hole, a painted mask and corner handles. */
export const CropArea = (props: CropAreaProps): ReactElement => {
  const theme = useTheme();
  const gesture = useRef<Option.Option<CropGesture>>(Option.none());

  // A drag that was in flight when the frame became disabled cannot finish: the
  // runtime delivers no release while the surface refuses the gesture. Drop it
  // here, so the next hover after re-enabling does not continue the old drag
  // without a press.
  useEffect(() => {
    if (props.disabled === true) gesture.current = Option.none();
  }, [props.disabled]);

  const bounds = cropBounds(props.width, props.height);
  const crop = clampCrop(props.value, bounds, props.minSize, props.aspectRatio);
  const min = props.minSize ?? CROP_MIN_SIZE;
  const point = (event: CropPointer): { x: number; y: number } => ({
    x: event.x ?? 0,
    y: event.y ?? 0,
  });
  /**
   * Ask the caller for a rectangle only when it is not the one already painted.
   * A drag held past the frame's edge computes the clamped hole once and then
   * repeats it on every delivered move; the same is true of an arrow pressed at
   * the minimum or the frame's edge.
   */
  const report = (next: CropRect): void => {
    if (!sameCrop(next, crop)) props.onChange(next);
  };

  const surface: CropAreaSurface = {
    onFrameDown: (event) => {
      if (!isPrimaryPress(event.button)) return;
      if (Option.isSome(gesture.current)) return;
      gesture.current = Option.some({
        kind: "move",
        start: crop,
        ...point(event),
      });
    },
    onFrameMove: (event) => {
      Option.match(gesture.current, {
        onNone: () => undefined,
        onSome: (held) => {
          report(
            gestureCrop(held, point(event), bounds, min, props.aspectRatio),
          );
        },
      });
    },
    onRelease: () => {
      gesture.current = Option.none();
    },
    onHandleDown: (corner, event) => {
      if (!isPrimaryPress(event.button)) return;
      event.stopPropagation?.();
      gesture.current = Option.some({
        kind: "corner",
        corner,
        start: crop,
        ...point(event),
      });
    },
    onHandleKey: (corner, event) => {
      Option.match(
        cropKey(
          crop,
          corner,
          event.key ?? "",
          event.modifiers,
          bounds,
          min,
          props.aspectRatio,
        ),
        {
          onNone: () => undefined,
          onSome: (next) => {
            event.preventDefault?.();
            report(next);
          },
        },
      );
    },
  };

  return renderCropArea(props, theme, surface);
};
