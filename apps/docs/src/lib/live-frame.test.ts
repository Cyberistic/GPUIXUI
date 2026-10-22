import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  fillAt,
  isolationHeaders,
  judge,
  parseReport,
  probeColours,
  probeHtml,
  probePoint,
  probeText,
  readReport,
} from "../../scripts/live-frame";

/**
 * The live-surface probe's judge and its PNG reader.
 *
 * The probe's whole value is that it *cannot* pass on a blank frame. The first
 * version of it did: `--screenshot` produced a white 800×600 image, the file
 * existed, and the run reported a paint. These cases pin the replacement — the
 * frame has to carry the fill the batch set — so a screenshot that captures
 * nothing fails by name instead of passing.
 */

const chunk = (type: string, body: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(body, 8);
  // The CRC is not read; the reader documents that.
  view.setUint32(8 + body.length, 0);
  return out;
};

/** A real PNG of one colour, so the reader is exercised rather than mocked. */
const png = (
  colour: readonly [number, number, number],
  size = 4,
): Uint8Array => {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = [0, ...Array.from({ length: size }, () => colour).flat()];
  const pixels = new Uint8Array(Array.from({ length: size }, () => row).flat());

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [
    signature,
    chunk("IHDR", header),
    chunk("IDAT", new Uint8Array(deflateSync(pixels))),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  parts.forEach((part, index) =>
    out.set(
      part,
      parts.slice(0, index).reduce((sum, earlier) => sum + earlier.length, 0),
    ),
  );

  return out;
};

describe("the live frame's pixel", () => {
  it("is the colour the batch painted", () => {
    expect(fillAt(png([124, 92, 255]), 1, 1)).toBe("#7c5cff");
  });

  it("is not a guess for a frame it cannot read", () => {
    // The negative control that matters: a truncated file must not report a
    // colour, because a colour is what passes the probe.
    expect(fillAt(png([124, 92, 255]).subarray(0, 40), 1, 1)).toBeUndefined();
    expect(fillAt(new Uint8Array(), 0, 0)).toBeUndefined();
    expect(fillAt(png([124, 92, 255]), 99, 99)).toBeUndefined();
  });
});

describe("the live frame's verdict", () => {
  const report = { canvas: "yes", status: "ok", text: probeText };

  it("passes a frame that painted its own fill", () => {
    const verdict = judge({
      colour: probeColours[0],
      pixel: probeColours[0].toLowerCase(),
      report,
    });

    expect(verdict.reasons).toEqual([]);
    expect(verdict.ok).toBe(true);
  });

  it("fails a blank frame that captured and reported itself", () => {
    // Exactly the measured defect: every report is healthy, the pixels are not.
    const verdict = judge({
      colour: probeColours[0],
      pixel: "#ffffff",
      report,
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.reasons).toEqual([
      `the frame painted #ffffff at ${probePoint.x},${probePoint.y}, not ${probeColours[0]}`,
    ]);
  });

  it("fails a frame with no readable pixel", () => {
    const verdict = judge({
      colour: probeColours[0],
      pixel: undefined,
      report,
    });

    expect(verdict.reasons).toEqual([
      `the screenshot at ${probeColours[0]} has no readable pixel`,
    ]);
  });

  it("fails a renderer that never started, a missing canvas and an empty tree", () => {
    const verdict = judge({
      colour: probeColours[0],
      pixel: probeColours[0].toLowerCase(),
      report: { canvas: "no", status: "failed no WebGPU", text: "" },
    });

    expect(verdict.reasons).toHaveLength(3);
    expect(verdict.reasons[0]).toContain("the renderer did not start");
    expect(verdict.reasons[1]).toBe("no canvas was appended to the document");
    expect(verdict.reasons[2]).toContain("does not carry");
  });
});

describe("the probe page", () => {
  it("paints the fill it was given and keeps the report out of the frame", () => {
    const html = probeHtml(probeColours[1]);

    expect(html).toContain(probeColours[1]);
    expect(html).not.toContain(probeColours[0]);
    // A visible report would change the pixels it is meant to vouch for.
    expect(html).toContain('<pre id="out" hidden>');
  });

  it("reports lines the driver can read, and ignores a script that mentions one", () => {
    const dom = [
      '<html><body><pre id="out" hidden>status=ok',
      "canvas=yes",
      "text=GPUix live surface</pre>",
      '<script>const status = "failed";</script>',
      "</body></html>",
    ].join("\n");

    expect(readReport(dom)).toEqual({
      canvas: "yes",
      status: "ok",
      text: probeText,
    });
    expect(parseReport("status=failed no WebGPU").status).toBe(
      "failed no WebGPU",
    );
  });

  it("asks for exactly the isolation the wasm needs", () => {
    expect(isolationHeaders).toEqual({
      "cross-origin-embedder-policy": "require-corp",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-resource-policy": "same-origin",
    });
  });
});
