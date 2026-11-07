/** @jsxImportSource @gpuix/react */
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
import { accessibleName, PICTURE_NAME } from "./name.js";

export interface CropAreaSurface {
  readonly onFrameDown: (event: CropPointer) => void;
  readonly onFrameMove: (event: CropPointer) => void;
  readonly onRelease: () => void;
  readonly onHandleDown: (corner: CropCorner, event: CropPointer) => void;
  readonly onHandleKey: (corner: CropCorner, event: CropKey) => void;
}

export interface CropPointer {
  readonly x?: number | null;
  readonly y?: number | null;

  readonly button?: number | null;
  readonly stopPropagation?: () => void;
}

export interface CropKey {
  readonly key?: string | null;
  readonly modifiers?: CropModifiers | null;
  readonly preventDefault?: () => void;
}

export interface CropAreaProps extends Omit<Props, "children" | "onChange"> {
  readonly src: string;

  readonly alt: string;

  readonly width: number;

  readonly height: number;

  readonly value: CropRect;

  readonly onChange: (crop: CropRect) => void;

  readonly minSize?: number;

  readonly handleSize?: number;

  readonly aspectRatio?: number;

  readonly guides?: boolean;

  readonly label?: string;

  readonly disabled?: boolean;
  readonly className?: string;
}

const CORNERS: ReadonlyArray<CropCorner> = ["nw", "ne", "sw", "se"];

const DEFAULT_LABEL = "Crop area";

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

  const pictureName = accessibleName(alt, PICTURE_NAME);

  const picture = typeof src === "string" ? src.trim() : "";
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
      {picture.length === 0 ? null : (
        <img
          src={picture}
          alt={pictureName}
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

export const CropArea = (props: CropAreaProps): ReactElement => {
  const theme = useTheme();
  const gesture = useRef<Option.Option<CropGesture>>(Option.none());

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
