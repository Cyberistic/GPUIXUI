/**
 * `ImagePreview`: an `<img>` surface with a loading state, an error state, a
 * caption and a pointer zoom.
 *
 * The zoom is the shipped `ImageZoom` (`@gpuixui/components/image-zoom`) — never
 * a second magnifier — so the preview's `width`/`height`/`scale`/`radius` are the
 * zoom frame's own. The runtime's `<img>` host reports neither load completion
 * nor failure (there is no `onLoad`/`onError`), so `status` is caller-driven:
 * a caller that is still producing the bytes passes `"loading"`, one whose fetch
 * failed passes `"error"`. The one failure the component detects itself is a
 * blank `src`, which it paints as the error state.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { ImageZoom } from "@gpuixui/components/image-zoom";
import { Icon } from "@gpuixui/icons";
import { Spinner } from "@gpuixui/primitives";
import { Button } from "@gpuixui/primitives/button";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import * as Str from "effect/String";
import type { ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";

/** What the preview is painting right now. */
export type ImagePreviewStatus = "loading" | "loaded" | "error";

/** {@link ImagePreview} props. */
export interface ImagePreviewProps extends Omit<Props, "children"> {
  /** A filesystem path, data URL or http(s) URL for the picture. */
  readonly src: string;
  /** The picture's accessible name. */
  readonly alt: string;
  /** A line under the frame. */
  readonly caption?: string;
  /** Default: `"error"` for a blank `src`, else `"loaded"`. */
  readonly status?: ImagePreviewStatus;
  /** The loading state's announced name. Default `"Loading"`. */
  readonly loadingLabel?: string;
  /** The error state's message. Default `"Could not load image"`. */
  readonly errorLabel?: string;
  /** The error state's retry action label. Default `"Retry"`. */
  readonly retryLabel?: string;
  /** Shown in the error state; omit for no retry action. */
  readonly onRetry?: () => void;
  /** The frame's width. Default `240`. */
  readonly width?: number;
  /** The frame's height. Default `160`. */
  readonly height?: number;
  /** Compose the shipped `ImageZoom`. Default `true`. */
  readonly zoom?: boolean;
  /** The magnification, held to `1…4`; `1` turns the zoom off. */
  readonly scale?: number;
  /** The frame's corner radius. Default `theme.radius.md`. */
  readonly radius?: number;
  readonly className?: string;
}

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 160;

const isBlank = (src: string): boolean => Str.isEmpty(Str.trim(src));

const resolveStatus = (
  src: string,
  status?: ImagePreviewStatus,
): ImagePreviewStatus => status ?? (isBlank(src) ? "error" : "loaded");

const frameStyle = (theme: Theme): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.muted,
});

/** The element `ImagePreview` renders. Pure in its arguments. */
export const renderImagePreview = (
  props: ImagePreviewProps,
  theme: Theme,
): ReactElement => {
  const {
    src,
    alt,
    caption,
    status: statusProp,
    loadingLabel = "Loading",
    errorLabel = "Could not load image",
    retryLabel = "Retry",
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
  const status = resolveStatus(src, statusProp);
  const boxWidth = width < 1 ? DEFAULT_WIDTH : width;
  const boxHeight = height < 1 ? DEFAULT_HEIGHT : height;
  const corner = radius ?? theme.radius.md;

  const body = Match.value(status).pipe(
    Match.when("loading", () => (
      <Spinner label={loadingLabel} testId="image-preview-loading" />
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
        <text style={{ color: theme.colors.mutedForeground }}>
          {errorLabel}
        </text>
        {onRetry === undefined ? null : (
          <Button variant="secondary" size="sm" onActivate={() => onRetry()}>
            {retryLabel}
          </Button>
        )}
      </div>
    )),
    Match.when("loaded", () =>
      zoom ? (
        <ImageZoom
          src={src}
          alt={alt}
          width={boxWidth}
          height={boxHeight}
          scale={scale}
          radius={radius}
        />
      ) : (
        <img
          src={src}
          alt={alt}
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
      {caption === undefined ? null : (
        <text style={{ color: theme.colors.mutedForeground }}>{caption}</text>
      )}
    </div>
  );
};

/** An image with a loading and an error state, a caption and a pointer zoom. */
export const ImagePreview = (props: ImagePreviewProps): ReactElement =>
  renderImagePreview(props, useTheme());
