import { Match } from "effect";
import { useEffect, useRef, useState } from "react";

/**
 * Browser preview for the ImagePreview page.
 *
 * The native surface is caller-driven by design — the runtime's `<img>` host
 * reports neither load completion nor failure, so `status` is the caller's —
 * and the preview shows exactly that: three states a reader can set, the
 * retry action the error state offers, and the pointer zoom the shipped
 * `ImageZoom` composes. The picture is an illustration of the bytes a caller
 * hands the frame.
 */

export type PreviewStatus = "loading" | "loaded" | "error";

/** The three states, in the order the switcher offers them. */
export const PREVIEW_STATUSES: ReadonlyArray<PreviewStatus> = [
  "loaded",
  "loading",
  "error",
];

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="#191D25"/><path d="M0 132 L48 110 L96 122 L144 74 L192 92 L240 52 L240 160 L0 160 Z" fill="#2E2370"/><path d="M0 132 L48 110 L96 122 L144 74 L192 92 L240 52" fill="none" stroke="#A7A9FF" stroke-width="2"/><circle cx="48" cy="110" r="2.5" fill="#E0E3FF"/><circle cx="144" cy="74" r="2.5" fill="#E0E3FF"/><circle cx="192" cy="92" r="2.5" fill="#E0E3FF"/></svg>`,
)}`;

/** One frame in a named state; pure, so a test can mount every state. */
export const PreviewFrame = ({
  status,
  onRetry,
}: {
  readonly status: PreviewStatus;
  readonly onRetry?: () => void;
}) => (
  <div className="gx-preview">
    <div className="gx-preview-frame" data-status={status}>
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
          />
        )),
        Match.exhaustive,
      )}
    </div>
    <p className="gx-preview-caption">Figure 1 — the revenue dashboard</p>
  </div>
);

export const ImagePreviewDemo = () => {
  const [status, setStatus] = useState<PreviewStatus>("loaded");
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
            onClick={() => setStatus(state)}
            type="button"
          >
            {state}
          </button>
        ))}
      </div>
      <PreviewFrame
        onRetry={() => {
          setStatus("loading");
          retry.current = setTimeout(() => setStatus("loaded"), 900);
        }}
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
