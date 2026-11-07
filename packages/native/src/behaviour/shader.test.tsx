/** @jsxImportSource @gpuix/react */
// The native binary paints through paint_shader, and selecting it leaves other napi-rs packages alone.
import { createTestRoot } from "@gpuix/react/testing";
import { Pixels } from "@gpuixui/testing";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { expect, test } from "vitest";
import { Shader } from "../shader.js";

const SIDE = 40;
const dir = mkdtempSync(join(tmpdir(), "gpuixui-shader-"));

const frameOf = (
  view: Parameters<ReturnType<typeof createTestRoot>["render"]>[0],
) => {
  const { render, renderer, unmount } = createTestRoot({
    width: SIDE,
    height: SIDE,
  });
  render(view);
  renderer.flush();
  const path = join(dir, "frame.png");
  renderer.captureScreenshot(path);
  unmount();
  const frame = Pixels.decodePng(readFileSync(path), inflateSync);
  if (frame instanceof Pixels.PngDecodeError) throw frame;
  return frame;
};

const box = {
  position: "absolute",
  left: 0,
  top: 0,
  width: SIDE,
  height: SIDE,
} as const;
const green = "fn shade(p: vec2f) -> vec4f { return vec4f(0., 1., 0., 1.); }";
const backdropSwizzled =
  "fn shade(p: vec2f) -> vec4f { return vec4f(backdrop_at(p).bgr, 1.); }";

test("selecting the binary does not leave the napi-rs override set", () => {
  expect(process.env["NAPI_RS_NATIVE_LIBRARY_PATH"]).toBeUndefined();
});

test("a shader paints between the elements around it", () => {
  const frame = frameOf(
    <div style={box}>
      <div style={{ ...box, backgroundColor: "#ff0000" }} />
      <Shader source={green} style={box} />
      <div
        style={{ ...box, left: 20, width: 20, backgroundColor: "#0000ff" }}
      />
    </div>,
  );
  const scale = frame.width / SIDE;
  expect(Pixels.pixelAt(frame, 10 * scale, 20 * scale)).toMatchObject({
    r: 0,
    g: 255,
    b: 0,
  });
  expect(Pixels.pixelAt(frame, 30 * scale, 20 * scale)).toMatchObject({
    r: 0,
    g: 0,
    b: 255,
  });
});

test("a shader reads the elements painted before it", () => {
  const frame = frameOf(
    <div style={box}>
      <div style={{ ...box, backgroundColor: "#ff0000" }} />
      <Shader source={backdropSwizzled} readsBackdrop style={box} />
    </div>,
  );
  const scale = frame.width / SIDE;
  expect(Pixels.pixelAt(frame, 20 * scale, 20 * scale)).toMatchObject({
    r: 0,
    g: 0,
    b: 255,
  });
});
