/** @jsxImportSource @gpuix/react */
import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { ImageZoom } from "@gpuixui/components/image-zoom";
import { Icon } from "@gpuixui/icons";
import { Spinner } from "@gpuixui/primitives";
import { Button } from "@gpuixui/primitives/button";
import { visibleCopy } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import type { ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import { accessibleName, PICTURE_NAME } from "./name.js";

export const ImagePreviewStatus = Schema.Literals([
  "loading",
  "loaded",
  "error",
]);

export type ImagePreviewStatus = typeof ImagePreviewStatus.Type;

const isStatus = Schema.is(ImagePreviewStatus);

export interface ImagePreviewProps extends Omit<Props, "children"> {
  readonly src: string;

  readonly alt: string;

  readonly caption?: string;

  readonly status?: ImagePreviewStatus;

  readonly loadingLabel?: string;

  readonly errorLabel?: string;

  readonly retryLabel?: string;

  readonly onRetry?: () => void;

  readonly width?: number;

  readonly height?: number;

  readonly zoom?: boolean;

  readonly scale?: number;

  readonly radius?: number;
  readonly className?: string;
}

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 160;

const isBlank = (src: string): boolean => Str.isEmpty(Str.trim(src));

const frameSide = (value: number, fallback: number): number =>
  Number.isFinite(value) && value >= 1 ? value : fallback;

const cornerRadius = (value: number | undefined, theme: Theme): number =>
  value === undefined || !Number.isFinite(value) || value < 0
    ? theme.radius.md
    : value;

const resolveStatus = (
  src: string,
  status?: ImagePreviewStatus,
): ImagePreviewStatus =>
  isStatus(status) ? status : isBlank(src) ? "error" : "loaded";

const frameStyle = (theme: Theme): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.muted,
});

export const renderImagePreview = (
  props: ImagePreviewProps,
  theme: Theme,
): ReactElement => {
  const {
    src,
    alt,
    caption,
    status: statusProp,
    loadingLabel,
    errorLabel,
    retryLabel,
    onRetry,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    zoom = true,
    scale,
    radius,
    className,
    style,
    ...rest
  } = props;
  const loading = accessibleName(loadingLabel, "Loading");
  const error = accessibleName(errorLabel, "Could not load image");
  const retry = accessibleName(retryLabel, "Retry");

  const pictureName = accessibleName(alt, PICTURE_NAME);

  const captionText = visibleCopy(caption);

  const source = typeof src === "string" ? src : "";
  const status = resolveStatus(source, statusProp);
  const boxWidth = frameSide(width, DEFAULT_WIDTH);
  const boxHeight = frameSide(height, DEFAULT_HEIGHT);
  const corner = cornerRadius(radius, theme);

  const body = Match.value(status).pipe(
    Match.when("loading", () => (
      <Spinner label={loading} testId="image-preview-loading" />
    )),
    Match.when("error", () => (
      <div
        testId="image-preview-error"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <Icon name="error" color={theme.colors.destructive} />
        <text style={{ color: theme.colors.mutedForeground }}>{error}</text>
        {onRetry === undefined ? null : (
          <Button variant="secondary" size="sm" onActivate={() => onRetry()}>
            {retry}
          </Button>
        )}
      </div>
    )),
    Match.when("loaded", () =>
      zoom ? (
        <ImageZoom
          src={source}
          alt={pictureName}
          width={boxWidth}
          height={boxHeight}
          scale={scale}
          radius={corner}
        />
      ) : (
        <img
          src={source}
          alt={pictureName}
          objectFit="contain"
          style={{ width: "100%", height: "100%" }}
        />
      ),
    ),
    Match.exhaustive,
  );

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn("flex flex-col gap-2", className), theme),
        style,
      )}
    >
      <div
        style={{
          ...frameStyle(theme),
          width: boxWidth,
          height: boxHeight,
          borderRadius: corner,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {body}
      </div>
      {captionText === undefined ? null : (
        <text style={{ color: theme.colors.mutedForeground }}>
          {captionText}
        </text>
      )}
    </div>
  );
};

export const ImagePreview = (props: ImagePreviewProps): ReactElement =>
  renderImagePreview(props, useTheme());
