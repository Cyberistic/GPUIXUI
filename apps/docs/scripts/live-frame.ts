/**
 * What a live-surface frame has to satisfy, and how to read its pixels.
 *
 * `scripts/live-surface-probe.ts` boots the published GPUix wasm renderer in a
 * headless browser and screenshots the frame. A screenshot that exists is not a
 * paint — a blank page writes one too — so the probe reads a pixel out of the
 * PNG and holds it to the fill the mutation batch set.
 *
 * The renderer's own `getPaintedText()` is **not** usable for this: it returned
 * `[]` on a frame that visibly painted (see `docs/preview-strategy.md` §The
 * paint is measured), so the pixels are the only honest report.
 *
 * The scanline walk below is a byte-level PNG reader, so it is index-driven on
 * purpose: this is the boundary that turns a browser's file into a domain value,
 * not domain logic.
 */
import { inflateSync } from "node:zlib";

/** The text the batch sets, and the report must find in the retained tree. */
export const probeText = "GPUix live surface";

/** Two root fills; matching pixels are the proof that the frame is the batch. */
export const probeColours = ["#7C5CFF", "#31A05F"] as const;

/** The frame's box, and the point sampled inside it. */
export const probeBox = { width: 420, height: 200 } as const;
export const probePoint = { x: 210, y: 100 } as const;

/**
 * The headers a document needs before the wasm starts.
 *
 * The glue instantiates `WebAssembly.Memory` with `shared: true`, so
 * `SharedArrayBuffer` must exist: without cross-origin isolation the module
 * never runs. `require-corp` also needs every subresource to be same-origin,
 * which is why the probe serves the wasm itself.
 */
export const isolationHeaders = {
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "require-corp",
  "cross-origin-resource-policy": "same-origin",
} as const;

/** The probe page: one batch, one report, and nothing painted over the frame. */
export const probeHtml = (colour: string): string => {
  const fill = JSON.stringify(colour);
  return [
    '<!doctype html><meta charset="utf-8"><title>GPUix live surface</title>',
    '<body style="margin:0">',
    // Hidden on purpose: a visible report would change the pixels, so a frame
    // could differ from its sibling for the wrong reason.
    '<pre id="out" hidden>pending</pre>',
    '<script type="module">',
    "const lines = [];",
    "const say = (line) => {",
    "  lines.push(line);",
    '  document.getElementById("out").textContent = lines.join("\\n");',
    "};",
    "try {",
    '  const mod = await import("/wasm/gpuix-web.js");',
    '  await mod.default({ module_or_path: "/wasm/gpuix-web_bg.wasm" });',
    "  const renderer = new mod.GpuixRenderer(() => {});",
    "  renderer.init({});",
    "  renderer.applyBatch(JSON.stringify([",
    '    ["createElement", 1, "div"],',
    `    ["setStyle", 1, { width: ${probeBox.width}, height: ${probeBox.height}, padding: 20, backgroundColor: ${fill} }],`,
    '    ["createElement", 2, "text"],',
    `    ["setText", 2, ${JSON.stringify(probeText)}],`,
    '    ["setStyle", 2, { color: "#ffffff", fontSize: 26 }],',
    '    ["appendChild", 1, 2],',
    '    ["setRoot", 1],',
    "  ]));",
    // The renderer lays out and paints on its own frame.
    "  await new Promise((done) => setTimeout(done, 600));",
    '  say("status=ok");',
    '  say("canvas=" + (document.querySelector("canvas") === null ? "no" : "yes"));',
    '  say("text=" + (renderer.getAllText() ?? []).join(","));',
    "} catch (error) {",
    '  say("status=failed " + (error && error.message ? error.message : String(error)));',
    "}",
    "</script>",
  ].join("\n");
};

/** The `key=value` lines the probe page reports. */
export const parseReport = (text: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at), line.slice(at + 1)] as const;
      })
      .filter(([key]) => key.length > 0),
  );

/** The report, read out of the dumped DOM rather than trusted from a script. */
export const readReport = (dom: string): Readonly<Record<string, string>> => {
  const block = /<pre id="out"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  if (block === null) return {};

  return parseReport(block[1] ?? "");
};

/** One probe run: what the page reported, and the pixel at the sample point. */
export interface FrameResult {
  readonly colour: string;
  readonly report: Readonly<Record<string, string>>;
  /** `#rrggbb` at `probePoint`, or `undefined` when the PNG could not be read. */
  readonly pixel: string | undefined;
}

/** Whether a frame is a paint of `colour`, and every reason it is not. */
export const judge = (
  frame: FrameResult,
): { readonly ok: boolean; readonly reasons: ReadonlyArray<string> } => {
  const reasons: Array<string> = [];
  const status = frame.report.status ?? "missing";

  if (status !== "ok")
    reasons.push(`the renderer did not start (status=${status})`);
  if (frame.report.canvas !== "yes")
    reasons.push("no canvas was appended to the document");
  if (frame.report.text !== probeText)
    reasons.push(
      `the retained tree does not carry "${probeText}" (text=${frame.report.text ?? "missing"})`,
    );
  if (frame.pixel === undefined)
    reasons.push(`the screenshot at ${frame.colour} has no readable pixel`);
  else if (frame.pixel.toLowerCase() !== frame.colour.toLowerCase())
    reasons.push(
      `the frame painted ${frame.pixel} at ${probePoint.x},${probePoint.y}, not ${frame.colour}`,
    );

  return { ok: reasons.length === 0, reasons };
};

const signature = [137, 80, 78, 71, 13, 10, 26, 10] as const;

/** Any byte buffer: the reader's input comes from a browser, not from us. */
type Bytes = Uint8Array<ArrayBufferLike>;

const u32 = (bytes: Bytes, at: number): number =>
  ((bytes[at] ?? 0) << 24) |
  ((bytes[at + 1] ?? 0) << 16) |
  ((bytes[at + 2] ?? 0) << 8) |
  (bytes[at + 3] ?? 0);

const ascii = (bytes: Bytes, at: number, length: number): string =>
  Array.from({ length }, (_, offset) =>
    String.fromCharCode(bytes[at + offset] ?? 0),
  ).join("");

const join = (chunks: ReadonlyArray<Bytes>): Bytes => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;

  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }

  return out;
};

interface Header {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
}

/** The IHDR fields this reader supports, or `undefined` for anything else. */
const header = (bytes: Bytes): Header | undefined => {
  if (!signature.every((byte, at) => bytes[at] === byte)) return undefined;
  if (ascii(bytes, 12, 4) !== "IHDR") return undefined;

  const depth = bytes[24] ?? 0;
  const colourType = bytes[25] ?? 0;
  const interlace = bytes[28] ?? 0;
  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;

  if (depth !== 8 || channels === 0 || interlace !== 0) return undefined;

  return { width: u32(bytes, 16), height: u32(bytes, 20), channels };
};

/** The concatenated `IDAT` payload, which is the one zlib stream. */
const data = (bytes: Bytes): Bytes => {
  const chunks: Array<Bytes> = [];
  let at = 8;

  while (at + 8 <= bytes.length) {
    const length = u32(bytes, at);
    const type = ascii(bytes, at + 4, 4);
    if (type === "IDAT") chunks.push(bytes.subarray(at + 8, at + 8 + length));
    if (type === "IEND") break;
    at += 12 + length;
  }

  return join(chunks);
};

/** A scanline byte, or zero outside it — byte 0 is the filter, never a pixel. */
const byteAt = (row: Bytes, index: number): number =>
  index >= 1 && index < row.length ? (row[index] ?? 0) : 0;

const paeth = (left: number, up: number, corner: number): number => {
  const estimate = left + up - corner;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toCorner = Math.abs(estimate - corner);

  return toLeft <= toUp && toLeft <= toCorner
    ? left
    : toUp <= toCorner
      ? up
      : corner;
};

/** Undo one scanline's filter, in place, against the row above it. */
const unfilter = (row: Bytes, previous: Bytes, channels: number): void => {
  const filter = row[0] ?? 0;
  const at = (index: number): number => byteAt(row, index);

  for (let index = 1; index < row.length; index += 1) {
    const left = at(index - channels);
    const up = byteAt(previous, index);
    const value =
      filter === 1
        ? at(index) + left
        : filter === 2
          ? at(index) + up
          : filter === 3
            ? at(index) + ((left + up) >> 1)
            : filter === 4
              ? at(index) + paeth(left, up, byteAt(previous, index - channels))
              : at(index);
    row[index] = value & 0xff;
  }
};

/** The inflated scanlines, or `undefined` when the zlib stream is not whole. */
const pixels = (png: Bytes): Bytes | undefined => {
  // A truncated or non-PNG file makes the inflater throw; "cannot measure" is
  // the answer here, and a throw is not a measurement.
  try {
    return inflateSync(data(png));
  } catch {
    return undefined;
  }
};

const hex = (red: number, green: number, blue: number): string =>
  `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

/**
 * The pixel at `(x, y)` of an 8-bit, non-interlaced RGB or RGBA PNG.
 *
 * `undefined` rather than a guess: a frame this reader cannot measure must fail
 * the probe, not pass it. CRC and ancillary chunks are ignored — Chrome writes
 * the frame, and the point is the colour, not the file's integrity.
 */
export const fillAt = (
  png: Bytes,
  x: number,
  y: number,
): string | undefined => {
  const size = header(png);
  if (size === undefined) return undefined;
  if (x < 0 || y < 0 || x >= size.width || y >= size.height) return undefined;

  const inflated = pixels(png);
  if (inflated === undefined) return undefined;

  const stride = size.width * size.channels + 1;
  if (inflated.length < stride * (y + 1)) return undefined;

  let previous: Bytes = new Uint8Array(stride);
  for (let row = 0; row <= y; row += 1) {
    const line = inflated.subarray(row * stride, (row + 1) * stride);
    unfilter(line, previous, size.channels);
    previous = line;
  }

  // `previous` is the last row's slice, so the offset is row-relative.
  const start = 1 + x * size.channels;
  const [red, green, blue] = [
    previous[start] ?? 0,
    previous[start + 1] ?? 0,
    previous[start + 2] ?? 0,
  ];

  return hex(red, green, blue);
};
