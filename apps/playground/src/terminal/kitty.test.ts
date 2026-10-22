/**
 * The kitty stream decoder's rules.
 *
 * The bug this file catches: every frame of one terminal window reuses image id
 * 1 and one placement, and a repaint arrives as a **new** transfer, not a frame
 * edit. A decoder that replaced its frame list on each completed transfer left
 * the probe holding only the latest paint, so a run whose first page had been
 * replaced by the pressed page read as "no page frame at all" — the failure the
 * `terminal-input` scenario hit before this file existed. A second defect lives
 * here too: an image delete (`a=d,d=A,q=2`) carries **no payload**, so a decoder
 * whose APC grammar required `;<payload>` never saw the terminal restore.
 *
 * Frames are synthesised from the protocol's own grammar — zlib-compressed RGBA
 * in base64, chunked across continuations — not from the decoder.
 */
import { deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { Pixels } from "@gpuixui/testing";
import {
  KittyParseError,
  parseKittyStream,
  type KittyStream,
} from "./kitty.js";

const inflate = (bytes: Uint8Array): Uint8Array =>
  Uint8Array.from(inflateSync(Buffer.from(bytes)));

const red = new Pixels.Rgba({ r: 255, g: 0, b: 0, a: 255 });
const blue = new Pixels.Rgba({ r: 0, g: 0, b: 255, a: 255 });

const solid = (
  width: number,
  height: number,
  colour: Pixels.Rgba,
): Uint8Array => {
  const data = new Uint8Array(width * height * 4);
  for (let at = 0; at < data.length; at += 4) {
    data[at] = colour.r;
    data[at + 1] = colour.g;
    data[at + 2] = colour.b;
    data[at + 3] = colour.a;
  }
  return data;
};

/** A transfer in three chunks, so the decoder has to join them. */
const transfer = (
  width: number,
  height: number,
  data: Uint8Array,
  options: { readonly id?: number; readonly placement?: number } = {},
): string => {
  const encoded = Buffer.from(deflateSync(Buffer.from(data))).toString(
    "base64",
  );
  const size = Math.ceil(encoded.length / 3);
  const chunks = [
    encoded.slice(0, size),
    encoded.slice(size, size * 2),
    encoded.slice(size * 2),
  ];
  return [
    `\x1b_Ga=T,i=${options.id ?? 1},p=${options.placement ?? 1},f=32,o=z,t=d,s=${width},v=${height},C=1,q=2,m=1;${chunks[0]}\x1b\\`,
    `\x1b_Gm=1,q=2;${chunks[1]}\x1b\\`,
    `\x1b_Gm=0,q=2;${chunks[2]}\x1b\\`,
  ].join("");
};

const parse = (text: string) =>
  parseKittyStream(new TextEncoder().encode(text), inflate);

/** A frame the test has already proved exists. */
const frameAt = (stream: KittyStream, index: number) => {
  const frame = stream.frames[index];
  if (frame === undefined) {
    throw new Error(
      `expected a frame at ${index}, measured ${stream.frames.length}`,
    );
  }
  return frame;
};

describe("parseKittyStream", () => {
  it("keeps both frames when one image is replaced", () => {
    const stream = parse(
      `${transfer(2, 1, solid(2, 1, red))}${transfer(2, 1, solid(2, 1, blue))}`,
    );
    expect(stream.frames.length).toBe(2);
    expect(Pixels.pixelAt(frameAt(stream, 0).pixels, 0, 0)).toEqual(red);
    expect(Pixels.pixelAt(frameAt(stream, 1).pixels, 1, 0)).toEqual(blue);
  });

  it("joins a frame's chunks in arrival order", () => {
    // Two pixels, so a decoder that concatenated chunks backwards would paint
    // blue at the first row.
    const stream = parse(
      transfer(1, 2, new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255])),
    );
    expect(stream.frames.length).toBe(1);
    expect(Pixels.pixelAt(frameAt(stream, 0).pixels, 0, 0)).toEqual(red);
    expect(Pixels.pixelAt(frameAt(stream, 0).pixels, 0, 1)).toEqual(blue);
  });

  it("counts an image delete that carries no payload", () => {
    const stream = parse(
      `${transfer(1, 1, solid(1, 1, red))}\x1b_Ga=d,d=A,q=2\x1b\\`,
    );
    expect(stream.handshake.imageDeletes).toBe(1);
    expect(stream.frames.length).toBe(1);
  });

  it("reads the protocols the platform enables and restores", () => {
    const stream = parse(
      [
        "\x1b[?1049h",
        "\x1b[?25l",
        "\x1b[?1003h\x1b[?1006h\x1b[?1016h\x1b[?1004h\x1b[?2004h\x1b[?2048h\x1b[>31u",
        "\x1b]2;GPUIX\x1b\\",
        "\x1b[?2026h\x1b[H",
        transfer(1, 1, solid(1, 1, red)),
        "\x1b[?2026l",
        "\x1b_Ga=d,d=A,q=2\x1b\\",
        "\x1b[<u\x1b[?2048l\x1b[?2004l\x1b[?1016l\x1b[?1003l\x1b[?25h\x1b[?1049l",
      ].join(""),
    );
    const handshake = stream.handshake;
    expect(handshake.alternateScreen).toBe(true);
    expect(handshake.alternateScreenLeft).toBe(true);
    expect(handshake.cursorHidden).toBe(true);
    expect(handshake.cursorShown).toBe(true);
    expect(handshake.mouse).toBe(true);
    expect(handshake.mousePixel).toBe(true);
    expect(handshake.mouseOff).toBe(true);
    expect(handshake.keyboard).toBe(true);
    expect(handshake.keyboardPopped).toBe(true);
    expect(handshake.bracketedPaste).toBe(true);
    expect(handshake.bracketedPasteOff).toBe(true);
    expect(handshake.inBandResize).toBe(true);
    expect(handshake.inBandResizeOff).toBe(true);
    expect(Option.contains(handshake.title, "GPUIX")).toBe(true);
    expect(handshake.syncBatches).toBe(1);
    expect(stream.frames.length).toBe(1);
  });

  it("accepts an uncompressed transfer", () => {
    const encoded = Buffer.from(solid(1, 1, blue)).toString("base64");
    const stream = parse(
      `\x1b_Ga=T,i=1,p=1,f=32,t=d,s=1,v=1,m=0;${encoded}\x1b\\`,
    );
    expect(stream.frames.length).toBe(1);
    expect(Pixels.pixelAt(frameAt(stream, 0).pixels, 0, 0)).toEqual(blue);
  });

  it("refuses a shared-memory transfer it cannot read from the stream", () => {
    expect(() =>
      parse("\x1b_Ga=T,i=1,p=1,f=32,t=s,s=1,v=1,m=0;L2dwdWk\x1b\\"),
    ).toThrow(KittyParseError);
  });

  it("refuses a format that is not RGBA", () => {
    expect(() =>
      parse("\x1b_Ga=T,i=1,p=1,f=24,t=d,s=1,v=1,m=0;AAAA\x1b\\"),
    ).toThrow(KittyParseError);
  });

  it("refuses a payload that does not fill the frame", () => {
    const encoded = Buffer.from(new Uint8Array([1, 2, 3])).toString("base64");
    expect(() =>
      parse(`\x1b_Ga=T,i=1,p=1,f=32,t=d,s=2,v=2,m=0;${encoded}\x1b\\`),
    ).toThrow(/carries 3 bytes, expected 16/);
  });
});
