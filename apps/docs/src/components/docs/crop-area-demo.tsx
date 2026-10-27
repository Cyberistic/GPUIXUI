import {
  clampCrop,
  cornerCursor,
  cornerLabel,
  cropBars,
  cropGuides,
  cropKey,
  cropLabel,
  CROP_HANDLE_SIZE,
  CROP_MIN_SIZE,
  CropRect,
  gestureCrop,
  handleBox,
  isPrimaryPress,
  type CropCorner,
  type CropGesture,
} from "@gpuixui/media/crop/logic";
import * as Option from "effect/Option";
import { useRef, useState, type MouseEvent } from "react";

/**
 * Browser preview for the CropArea page.
 *
 * The native frame paints a controlled hole with four veil bars around it and
 * four corner handles; the run of this preview is the package's own
 * `crop/logic` — the bars, the guides, the handle boxes, the drag and the arrow
 * step are the component's — so the drawing stands in for the paint, not for
 * the arithmetic. The picture is a labelled illustration of the bitmap the
 * native frame is handed.
 */

/** The frame's coordinate space, in points. */
export const CROP_FRAME = { width: 320, height: 200 } as const;

/** The hole the page opens on, held to the square the page documents. */
export const cropStart = (): CropRect =>
  clampCrop(
    new CropRect({ x: 60, y: 40, width: 120, height: 120 }),
    CROP_FRAME,
    CROP_MIN_SIZE,
    1,
  );

const picture = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#20242E"/><path d="M0 160 L70 120 L140 138 L210 84 L280 104 L320 78 L320 200 L0 200 Z" fill="#2E2370"/><circle cx="250" cy="46" r="18" fill="#A7A9FF"/><path d="M0 160 L70 120 L140 138 L210 84 L280 104 L320 78" fill="none" stroke="#A7A9FF" stroke-width="2"/></svg>`,
)}`;

const CORNERS: ReadonlyArray<CropCorner> = ["nw", "ne", "sw", "se"];

/** The arrow a browser key names, in the package's spelling. */
const arrowOf = (key: string): string =>
  key.startsWith("Arrow") ? key.slice("Arrow".length).toLowerCase() : "";

const box = (rect: CropRect) => ({
  left: `${rect.x}px`,
  top: `${rect.y}px`,
  width: `${rect.width}px`,
  height: `${rect.height}px`,
});

export const CropAreaDemo = () => {
  const [crop, setCrop] = useState(cropStart);
  const frame = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Option.Option<CropGesture>>(Option.none());

  const at = (event: MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = frame.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  const moveTo = (clientX: number, clientY: number): void => {
    const rect = frame.current?.getBoundingClientRect();
    const point = {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
    Option.match(drag.current, {
      onNone: () => undefined,
      onSome: (gesture) =>
        setCrop(gestureCrop(gesture, point, CROP_FRAME, CROP_MIN_SIZE, 1)),
    });
  };

  /**
   * Start a drag and follow it on the window.
   *
   * A drag that ends at the frame's edge used to stop the moment the pointer
   * left the picture, which is exactly where a corner drag goes; the listeners
   * are the window's for the length of the gesture.
   */
  const begin = (gesture: CropGesture): void => {
    drag.current = Option.some(gesture);
    const onMove = (event: globalThis.MouseEvent): void =>
      moveTo(event.clientX, event.clientY);
    const onUp = (): void => {
      drag.current = Option.none();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="gx-crop">
      <div
        aria-label="Crop the thumbnail"
        className="gx-crop-frame"
        onMouseDown={(event) => {
          if (!isPrimaryPress(event.button)) return;
          event.preventDefault();
          begin({ kind: "move", start: crop, ...at(event) });
        }}
        ref={frame}
        role="group"
      >
        <img
          alt="A thumbnail of the harbour chart"
          className="gx-crop-picture"
          src={picture}
        />
        {cropBars(crop, CROP_FRAME).map((bar) => (
          <div
            className="gx-crop-bar"
            data-side={bar.side}
            key={bar.side}
            style={box(bar.box)}
          />
        ))}
        {cropGuides(crop).map((guide) => (
          <div
            className="gx-crop-guide"
            data-guide={guide.name}
            key={guide.name}
            style={box(guide.box)}
          />
        ))}
        {CORNERS.map((corner) => (
          <div
            aria-label={`Crop area ${cornerLabel(corner)} handle`}
            aria-valuetext={cropLabel(crop)}
            className="gx-crop-handle"
            data-corner={corner}
            key={corner}
            onKeyDown={(event) => {
              const key = arrowOf(event.key);
              if (key === "") return;
              Option.match(
                cropKey(
                  crop,
                  corner,
                  key,
                  { shift: event.shiftKey, alt: event.altKey },
                  CROP_FRAME,
                  CROP_MIN_SIZE,
                  1,
                ),
                {
                  onNone: () => undefined,
                  onSome: (next) => {
                    event.preventDefault();
                    setCrop(next);
                  },
                },
              );
            }}
            onMouseDown={(event) => {
              if (!isPrimaryPress(event.button)) return;
              event.preventDefault();
              event.stopPropagation();
              begin({ kind: "corner", corner, start: crop, ...at(event) });
            }}
            role="slider"
            style={{
              ...box(handleBox(crop, corner, CROP_HANDLE_SIZE, CROP_FRAME)),
              cursor: cornerCursor(corner),
            }}
            tabIndex={0}
          />
        ))}
      </div>
      <p className="gx-crop-readout">{cropLabel(crop)}</p>
    </div>
  );
};

export const cropAreaDemoSource = `import { useState } from "react";
import { CropArea, CropRect } from "@gpuixui/media";

const [crop, setCrop] = useState(
  new CropRect({ x: 60, y: 40, width: 100, height: 100 }),
);

<CropArea
  src={picture}
  alt="The picture being cropped"
  width={240}
  height={160}
  value={crop}
  onChange={setCrop}
  aspectRatio={1}
  guides
  label="Crop the thumbnail"
/>;`;
