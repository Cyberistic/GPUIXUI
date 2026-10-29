import {
  zoomFollow,
  zoomGeometry,
  zoomRest,
  type ZoomBox,
  type ZoomGeometry,
  type ZoomPointer,
} from "@gpuixui/components/image-zoom/logic";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useEffect, useRef, useState, type MouseEvent } from "react";

/**
 * Browser preview for the ImagePreview page.
 *
 * The native surface is caller-driven by design — the runtime's `<img>` host
 * reports neither load completion nor failure, so `status` is the caller's —
 * and the preview shows exactly that: three states a reader can set, the
 * retry action the error state offers, and the pointer zoom the shipped
 * `ImageZoom` composes. The picture is an illustration of the bytes a caller
 * hands the frame; the lens is the package's own arithmetic.
 */

export type PreviewStatus = "loading" | "loaded" | "error";

/** The three states, in the order the switcher offers them. */
export const PREVIEW_STATUSES: ReadonlyArray<PreviewStatus> = [
  "loaded",
  "loading",
  "error",
];

/** The frame the preview draws, matching `ImagePreview`'s own default. */
export const PREVIEW_FRAME = { width: 240, height: 160 } as const;

const frame = { x: 0, y: 0, ...PREVIEW_FRAME };

/** The geometry `ImageZoom` resolves for this frame at its default magnification. */
const geometry: ZoomGeometry = zoomGeometry({
  width: Option.some(PREVIEW_FRAME.width),
  height: Option.some(PREVIEW_FRAME.height),
  scale: Option.none(),
});

/** The box the picture paints for a pointer over the frame, by the zoom's rule. */
export const previewZoom = (pointer: ZoomPointer): ZoomBox =>
  zoomFollow(geometry, frame, pointer);

const pictureBox = (pointer: ZoomPointer | undefined): ZoomBox =>
  pointer === undefined ? zoomRest(geometry) : previewZoom(pointer);

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="#191D25"/><path d="M0 132 L48 110 L96 122 L144 74 L192 92 L240 52 L240 160 L0 160 Z" fill="#2E2370"/><path d="M0 132 L48 110 L96 122 L144 74 L192 92 L240 52" fill="none" stroke="#A7A9FF" stroke-width="2"/><circle cx="48" cy="110" r="2.5" fill="#E0E3FF"/><circle cx="144" cy="74" r="2.5" fill="#E0E3FF"/><circle cx="192" cy="92" r="2.5" fill="#E0E3FF"/></svg>`,
)}`;

/** One frame in a named state; pure, so a test can mount every state. */
export const PreviewFrame = ({
  status,
  pointer,
  onPointerMove,
  onPointerLeave,
  onRetry,
}: {
  readonly status: PreviewStatus;
  readonly pointer?: ZoomPointer | undefined;
  readonly onPointerMove?: (pointer: ZoomPointer) => void;
  readonly onPointerLeave?: () => void;
  readonly onRetry?: () => void;
}) => {
  const follow = (event: MouseEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    onPointerMove?.({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    });
  };
  const box = pictureBox(pointer);

  return (
    <div className="gx-preview">
      <div
        className="gx-preview-frame"
        data-status={status}
        onMouseLeave={onPointerLeave}
        onMouseMove={follow}
        style={{ height: PREVIEW_FRAME.height, width: PREVIEW_FRAME.width }}
      >
        {Match.value(status).pipe(
          Match.when("loading", () => (
            <span aria-label="Loading" className="gx-spinner" />
          )),
          Match.when("error", () => (
            <div className="gx-preview-error">
              <span aria-hidden="true" className="gx-preview-error-mark">
                !
              </span>
              <p className="gx-preview-error-text">Could not load image</p>
              {onRetry === undefined ? null : (
                <button
                  className="gx-btn gx-btn-secondary gx-btn-sm"
                  onClick={onRetry}
                  type="button"
                >
                  Retry
                </button>
              )}
            </div>
          )),
          Match.when("loaded", () => (
            <img
              alt="The dashboard screenshot"
              className="gx-preview-picture"
              src={PICTURE}
              style={{
                height: box.height,
                left: box.left,
                top: box.top,
                width: box.width,
              }}
            />
          )),
          Match.exhaustive,
        )}
      </div>
      <p className="gx-preview-caption">Figure 1 — the revenue dashboard</p>
    </div>
  );
};

export const ImagePreviewDemo = () => {
  const [status, setStatus] = useState<PreviewStatus>("loaded");
  const [pointer, setPointer] = useState<ZoomPointer | undefined>(undefined);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (retry.current !== undefined) clearTimeout(retry.current);
    },
    [],
  );

  return (
    <div className="gx-demo-column gx-preview-demo">
      <div className="gx-demo-row" role="group" aria-label="Preview status">
        {PREVIEW_STATUSES.map((state) => (
          <button
            aria-pressed={status === state}
            className="gx-btn gx-btn-secondary gx-btn-sm"
            key={state}
            onClick={() => {
              setPointer(undefined);
              setStatus(state);
            }}
            type="button"
          >
            {state}
          </button>
        ))}
      </div>
      <PreviewFrame
        onPointerLeave={() => setPointer(undefined)}
        onPointerMove={setPointer}
        onRetry={() => {
          setStatus("loading");
          retry.current = setTimeout(() => setStatus("loaded"), 900);
        }}
        pointer={pointer}
        status={status}
      />
    </div>
  );
};

export const imagePreviewDemoSource = `import { ImagePreview } from "@gpuixui/media";

<ImagePreview
  src={bytesReady ? "data:image/png;base64,…" : ""}
  alt="The dashboard screenshot"
  status={fetchFailed ? "error" : bytesReady ? "loaded" : "loading"}
  caption="Figure 1 — the revenue dashboard"
  onRetry={() => refetch()}
/>;`;
