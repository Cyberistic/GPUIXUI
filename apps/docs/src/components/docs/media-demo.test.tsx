import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  zoomFollow,
  zoomGeometry,
  zoomRest,
} from "@gpuixui/components/image-zoom/logic";
import {
  cropBars,
  cropGuides,
  cropLabel,
  handleBox,
  CROP_HANDLE_SIZE,
} from "@gpuixui/media/crop/logic";
import { progressWidth, timeLabel } from "@gpuixui/media/player/logic";
import { qrPlacement } from "@gpuixui/media/qr/encode";
import { cropStart, CropAreaDemo, CROP_FRAME } from "./crop-area-demo";
import { DropZoneDemo } from "./drop-zone-demo";
import {
  advanceUploads,
  FileUploadDemo,
  initialQueue,
  UPLOAD_FILES,
  UPLOAD_STEP,
} from "./file-upload-demo";
import {
  ImagePreviewDemo,
  PREVIEW_FRAME,
  PreviewFrame,
  previewZoom,
} from "./image-preview-demo";
import {
  frameAt,
  MediaPlayerDemo,
  PLAYER_BUFFERED,
  PLAYER_DURATION,
  PLAYER_QUALITIES,
  PLAYER_RATES,
  PLAYER_TRACK,
  sharesAt,
} from "./media-player-demo";
import {
  modulePath,
  previewSymbol,
  QrCodeDemo,
  QR_INK,
  QR_PAPER,
  QR_SIZE,
  QR_ZONE,
} from "./qr-code-demo";

/**
 * The media lane's previews.
 *
 * Each page in `packages/media/docs` mounts a labelled browser approximation.
 * `component-preview.test.ts` holds the registry to the pages and
 * `preview-demo-render.test.tsx` mounts every demo in both palettes; what those
 * cannot see is whether the drawing still runs the package's own arithmetic.
 * These cases read the markup against the logic the component ships: the crop's
 * bars, guides and handles, the QR's module grid, the upload queue's lifecycle
 * and the three states of an image preview.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

describe("the CropArea preview", () => {
  const html = markup(<CropAreaDemo />);
  const crop = cropStart();

  it("paints the bars, guides and handles the package computes", () => {
    const bars = cropBars(crop, CROP_FRAME);

    // The native mask is four finite bars; a preview that painted one veil
    // rectangle would agree with the picture and not with the component.
    expect(bars.length).toBe(4);
    expect(html.match(/class="gx-crop-bar"/g)).toHaveLength(bars.length);
    expect(html).toContain(`data-side="${bars[0]?.side}"`);
    expect(html.match(/class="gx-crop-guide"/g)).toHaveLength(
      cropGuides(crop).length,
    );

    const handle = handleBox(crop, "nw", CROP_HANDLE_SIZE, CROP_FRAME);
    expect(html).toContain(`left:${handle.x}px`);
    expect(html).toContain(`top:${handle.y}px`);
  });

  it("announces the rectangle on every handle, as the component does", () => {
    expect(html).toContain(`aria-valuetext="${cropLabel(crop)}"`);
    expect(html).toContain("Crop area top left handle");
    expect(html).toContain("Crop area bottom right handle");
    // The readout is the same sentence, so the drawing and the sliders agree.
    expect(
      html.match(new RegExp(cropLabel(crop), "g"))?.length,
    ).toBeGreaterThan(1);
  });
});

describe("the QrCode preview", () => {
  const symbol = previewSymbol();

  it("encodes the page's own address into a real symbol", () => {
    expect(Option.isSome(symbol)).toBe(true);
    if (Option.isNone(symbol)) return;
    const placement = qrPlacement(symbol.value, QR_SIZE, QR_ZONE);

    // The symbol is not a picture of a QR code: the version is the encoder's
    // answer for this value, and the quiet zone is inside the painted square.
    expect(symbol.value.version).toBeGreaterThanOrEqual(1);
    expect(placement.cells).toBe(symbol.value.modules + QR_ZONE * 2);
    expect(placement.side).toBeLessThanOrEqual(QR_SIZE);
  });

  it("draws one subpath per dark module, quiet zone included", () => {
    expect(Option.isSome(symbol)).toBe(true);
    if (Option.isNone(symbol)) return;
    const html = markup(<QrCodeDemo />);
    const path = modulePath(symbol.value, QR_ZONE);
    const dark = (path.match(/M\d+ \d+/g) ?? []).length;

    expect(html).toContain(
      `viewBox="0 0 ${symbol.value.modules + QR_ZONE * 2} ${symbol.value.modules + QR_ZONE * 2}"`,
    );
    expect(dark).toBeGreaterThan(100);
    expect(html).toContain(`d="${path}"`);
    expect(html).toContain(
      `version ${symbol.value.version} · level ${symbol.value.level}`,
    );
  });

  it("keeps the component's scanner-safe ink and paper", () => {
    // A symbol is read by a camera, so the pair is deliberately not a theme
    // role. The preview may not drift from the component's own constants.
    const source = readFileSync(
      new URL("packages/media/src/qr-code.tsx", root),
      "utf8",
    );
    const pair = (name: string): string =>
      new RegExp(`export const ${name} = "([^"]+)"`).exec(source)?.[1] ?? "";

    expect(QR_INK).toBe(pair("QR_INK"));
    expect(QR_PAPER).toBe(pair("QR_PAPER"));
  });
});

describe("the ImagePreview preview", () => {
  it("paints the three caller-driven states", () => {
    const loaded = markup(<PreviewFrame status="loaded" />);
    const loading = markup(<PreviewFrame status="loading" />);
    const error = markup(
      <PreviewFrame onRetry={() => undefined} status="error" />,
    );

    expect(loaded).toContain(`alt="The dashboard screenshot"`);
    expect(loaded).toContain("Figure 1");
    expect(loading).toContain(`aria-label="Loading"`);
    expect(loading).not.toContain("<img");
    expect(error).toContain("Could not load image");
    expect(error).toContain(">Retry<");
    expect(error).not.toContain("<img");
  });

  it("paints the box ImageZoom computes for a pointer, not a centre scale", () => {
    // The bug guarded: the drawing's zoom was a `:hover { width:160% }` centre
    // scale, so the spot under the pointer moved instead of staying put. The
    // expected box comes from the component's own rule, never a snapshot.
    const pointer = { x: 180, y: 80 };
    const geometry = zoomGeometry({
      width: Option.some(PREVIEW_FRAME.width),
      height: Option.some(PREVIEW_FRAME.height),
      scale: Option.none(),
    });
    const box = zoomFollow(geometry, { x: 0, y: 0, ...PREVIEW_FRAME }, pointer);
    const html = markup(<PreviewFrame pointer={pointer} status="loaded" />);

    expect(box).toEqual(previewZoom(pointer));
    expect(box.left).toBe(-108);
    expect(box.top).toBe(-48);
    expect(html).toContain(`left:${box.left}px`);
    expect(html).toContain(`top:${box.top}px`);
    expect(html).toContain(`width:${box.width}px`);
    expect(html).toContain(`height:${box.height}px`);
  });

  it("covers the frame exactly at rest", () => {
    const rest = zoomRest(
      zoomGeometry({
        width: Option.some(PREVIEW_FRAME.width),
        height: Option.some(PREVIEW_FRAME.height),
        scale: Option.none(),
      }),
    );
    const html = markup(<PreviewFrame status="loaded" />);

    expect(rest).toEqual({
      left: 0,
      top: 0,
      width: PREVIEW_FRAME.width,
      height: PREVIEW_FRAME.height,
    });
    expect(html).toContain(`width:${rest.width}px`);
    expect(html).toContain(`height:${rest.height}px`);
    expect(html).toContain("left:0");
    expect(html).toContain("top:0");
  });

  it("opens on the loaded state, with the switcher's pressed mark", () => {
    const html = markup(<ImagePreviewDemo />);

    expect(html).toContain(`aria-pressed="true"`);
    expect(html).toContain(">loaded<");
    expect(html).toContain(`alt="The dashboard screenshot"`);
  });

  it("runs the zoom's own rule instead of a hover scale", () => {
    const source = read("apps/docs/src/components/docs/image-preview-demo.tsx");
    const styles = read("apps/docs/src/styles/demos.css");

    expect(source).toContain('from "@gpuixui/components/image-zoom/logic"');
    expect(source).toContain("zoomFollow");
    expect(source).toContain("zoomRest");
    // A second lens would be a centre scale in the style sheet.
    expect(styles).not.toContain(".gx-preview-frame:hover");
  });
});

describe("the FileUpload preview", () => {
  it("seeds the three states a reader needs through the package's queue", () => {
    const queue = initialQueue();
    const statuses = queue.items.map((item) => `${item.id}:${item.status}`);

    expect(statuses).toEqual([
      "screenshot:uploading",
      "report:error",
      "notes:done",
    ]);
    expect(queue.items.find((item) => item.id === "screenshot")?.progress).toBe(
      0.6,
    );
  });

  it("advances only the uploading file, then completes it", () => {
    const once = advanceUploads(initialQueue());
    const twice = advanceUploads(once);

    expect(once.items.find((item) => item.id === "screenshot")?.progress).toBe(
      0.8,
    );
    expect(twice.items.find((item) => item.id === "screenshot")?.status).toBe(
      "done",
    );
    expect(twice.items.find((item) => item.id === "report")?.status).toBe(
      "error",
    );
    // A queue with nothing in flight is returned as it was, so the preview's
    // timer cannot repaint the whole frame for every tick.
    expect(advanceUploads(twice)).toBe(twice);
    expect(UPLOAD_STEP * 2).toBeCloseTo(0.4);
  });

  it("draws the queue's rows with the states and the progress it holds", () => {
    const html = markup(<FileUploadDemo />);

    UPLOAD_FILES.forEach((file) => expect(html).toContain(file.name));
    expect(html).toContain(`aria-valuetext="60%"`);
    expect(html).toContain(`data-status="uploading"`);
    expect(html).toContain(`data-status="error"`);
    expect(html).toContain(`data-status="done"`);
    expect(html).toContain(">Retry<");
    expect(html).toContain("Remove report.pdf");
  });
});

describe("the MediaPlayer preview", () => {
  it("draws Mux's chrome, and the transport the component owns", () => {
    const html = markup(<MediaPlayerDemo />);

    expect(html).toContain(timeLabel(0, PLAYER_DURATION));
    expect(html).toContain('aria-label="Play"');
    expect(html).toContain('aria-label="Seek back one second"');
    expect(html).toContain('aria-label="Seek forward one second"');
    expect(html).toContain('aria-label="Mute"');
    expect(html).toContain('aria-label="Volume"');
    expect(html).toContain('aria-label="Playback rate"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('aria-label="Fullscreen"');
    // The timeline, its rail and the three boxes are the component's anatomy.
    expect(html).toContain("gx-player-timeline");
    expect(html).toContain("gx-player-buffered");
    expect(html).toContain("gx-player-fill");
    expect(html).toContain("gx-player-thumb");
    // The poster is an image drawn per playhead, not a decoded video frame.
    expect(html).toContain("data:image/svg+xml");
  });

  it("paints the buffered and played widths the package computes", () => {
    const shares = sharesAt(0);
    const html = markup(<MediaPlayerDemo />);

    // The drawing is the component's own share rule, scaled to its track.
    expect(shares.played).toBe(progressWidth(0, PLAYER_DURATION, PLAYER_TRACK));
    expect(shares.buffered).toBe(
      progressWidth(PLAYER_BUFFERED, PLAYER_DURATION, PLAYER_TRACK),
    );
    expect(shares.buffered).toBeGreaterThan(shares.played);
    expect(html).toContain(
      `class="gx-player-buffered" style="width:${(shares.buffered / PLAYER_TRACK) * 100}%"`,
    );
    expect(html).toContain(
      `class="gx-player-fill" style="width:${(shares.played / PLAYER_TRACK) * 100}%"`,
    );
  });

  it("offers the component's rates and the page's qualities in its menus", () => {
    const html = markup(<MediaPlayerDemo />);

    expect(html).toContain(">Playback speed<");
    expect(html).toContain(">Quality<");
    PLAYER_RATES.forEach((rate) => expect(html).toContain(`>${rate}×<`));
    PLAYER_QUALITIES.forEach((quality) =>
      expect(html).toContain(`>${quality}<`),
    );
    // The rate the button prints is the resting rate the menus offer.
    expect(html).toContain(`aria-checked="true"`);
  });

  it("picks the caller's frame for the playhead, clamped at both ends", () => {
    const first = frameAt(0);
    const last = frameAt(PLAYER_DURATION);

    expect(first).not.toBe(last);
    expect(frameAt(-100)).toBe(first);
    expect(frameAt(PLAYER_DURATION * 4)).toBe(last);
  });
});

describe("the DropZone preview", () => {
  it("draws the drop target with its pick action and a live readout", () => {
    const html = markup(<DropZoneDemo />);

    expect(html).toContain("Drop files here");
    expect(html).toContain("or pick them from the platform");
    expect(html).toContain(">Choose files<");
    expect(html).toContain("Nothing dropped yet");
    // The picker is the browser's own, and a drop reports names rather than a
    // path the preview could not have.
    expect(html).toContain('type="file"');
    expect(html).toContain("multiple");
    expect(html).not.toContain("data-disabled");
  });
});
