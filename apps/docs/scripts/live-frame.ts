import { inflateSync } from "node:zlib";

export const probeText = "GPUix live surface";

export const probeColours = ["#7C5CFF", "#31A05F"] as const;

export const probeBox = { width: 420, height: 200 } as const;
export const probePoint = { x: 210, y: 100 } as const;

export const isolationHeaders = {
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "require-corp",
  "cross-origin-resource-policy": "same-origin",
} as const;

export const probeHtml = (colour: string): string => {
  const fill = JSON.stringify(colour);
  return [
    '<!doctype html><meta charset="utf-8"><title>GPUix live surface</title>',
    '<body style="margin:0">',

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

export const readReport = (dom: string): Readonly<Record<string, string>> => {
  const block = /<pre id="out"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  if (block === null) return {};

  return parseReport(block[1] ?? "");
};

export interface FrameResult {
  readonly colour: string;
  readonly report: Readonly<Record<string, string>>;

  readonly pixel: string | undefined;
}

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

const pixels = (png: Bytes): Bytes | undefined => {
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

  const start = 1 + x * size.channels;
  const [red, green, blue] = [
    previous[start] ?? 0,
    previous[start + 1] ?? 0,
    previous[start + 2] ?? 0,
  ];

  return hex(red, green, blue);
};
