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
 * `role="slider"` that announces the rectangle).
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useRef, type ReactElement } from "react";
import {
  clampCrop,
  cornerLabel,
  cropBars,
  cropLabel,
  CROP_MIN_SIZE,
  CropCorner,
  CropRect,
  gestureCrop,
  handleBox,
  keyboardCrop,
  type CropBounds,
  type CropGesture,
} from "./crop/logic.js";
import { recipeStyle, useTheme, type Theme } from "./internal.js";

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
  readonly stopPropagation?: () => void;
}

/** A key payload, read structurally so a fixture can supply one. */
export interface CropKey {
  readonly key?: string | null;
  readonly modifiers?: { readonly shift?: boolean } | null;
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
  /** The smallest side a resize may leave. Default `24`. */
  readonly minSize?: number;
  /** A corner handle's side. Default `10`. */
  readonly handleSize?: number;
  /** The frame's accessible name. Default `"Crop area"`. */
  readonly label?: string;
  /** Refuse the gestures; the frame keeps painting. */
  readonly disabled?: boolean;
  readonly className?: string;
}

const DEFAULT_HANDLE = 10;
const CORNERS: ReadonlyArray<CropCorner> = ["nw", "ne", "sw", "se"];

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

const handleStyle = (
  theme: Theme,
  box: CropRect,
  disabled: boolean,
): StyleDesc => ({
  ...absolute(box),
  backgroundColor: disabled ? theme.colors.muted : theme.colors.primary,
  borderWidth: theme.borderWidth.thin,
  borderStyle: "solid",
  borderColor: theme.colors.background,
  borderRadius: theme.radius.sm,
  cursor: disabled ? "default" : "nwse-resize",
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
    handleSize = DEFAULT_HANDLE,
    label = "Crop area",
    disabled = false,
    className,
    style,
    ...rest
  } = props;
  const bounds = cropBounds(width, height);
  const crop = clampCrop(value, bounds, minSize);
  const bars = cropBars(crop, bounds);

  return (
    <div
      {...rest}
      role="group"
      aria-label={label}
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
        {CORNERS.map((corner) => (
          <div
            key={corner}
            testId={`crop-handle-${corner}`}
            role="slider"
            aria-label={`${label} ${cornerLabel(corner)} handle`}
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
              handleBox(crop, corner, handleSize),
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

  const bounds = cropBounds(props.width, props.height);
  const crop = clampCrop(props.value, bounds, props.minSize);
  const min = props.minSize ?? CROP_MIN_SIZE;
  const point = (event: CropPointer): { x: number; y: number } => ({
    x: event.x ?? 0,
    y: event.y ?? 0,
  });

  const surface: CropAreaSurface = {
    onFrameDown: (event) => {
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
          props.onChange(gestureCrop(held, point(event), bounds, min));
        },
      });
    },
    onRelease: () => {
      gesture.current = Option.none();
    },
    onHandleDown: (corner, event) => {
      event.stopPropagation?.();
      gesture.current = Option.some({
        kind: "corner",
        corner,
        start: crop,
        ...point(event),
      });
    },
    onHandleKey: (corner, event) => {
      const step = event.modifiers?.shift === true ? 8 : 1;
      Option.match(
        keyboardCrop(crop, corner, event.key ?? "", step, bounds, min),
        {
          onNone: () => undefined,
          onSome: (next) => {
            event.preventDefault?.();
            props.onChange(next);
          },
        },
      );
    },
  };

  return renderCropArea(props, theme, surface);
};
