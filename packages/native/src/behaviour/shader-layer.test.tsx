/** @jsxImportSource @gpuix/react */
import { createTestRoot } from "@gpuix/react/testing";
import { ShaderLayer, waterRipple, zetsu } from "@gpuixui/fx/shader-layer";
import { Pixels } from "@gpuixui/testing";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import type { ReactNode } from "react";
import { expect, test } from "vitest";

const SIDE = 40,
  box = { x: 0, y: 0, w: SIDE, h: SIDE };
const dir = mkdtempSync(join(tmpdir(), "gpuixui-layer-"));
const centre = (view: ReactNode) => {
  const { render, renderer, unmount } = createTestRoot({
    width: SIDE,
    height: SIDE,
  });
  render(
    <div
      style={{
        width: SIDE,
        height: SIDE,
        position: "relative",
        backgroundColor: "#ff0000",
      }}
    >
      {view}
    </div>,
  );
  renderer.flush();
  const path = join(dir, "frame.png");
  renderer.captureScreenshot(path);
  unmount();
  const frame = Pixels.decodePng(readFileSync(path), inflateSync);
  if (frame instanceof Pixels.PngDecodeError) throw frame;
  const pixel = Pixels.pixelAt(
    frame,
    Math.trunc(frame.width / 2),
    Math.trunc(frame.height / 2),
  );
  if (pixel === null) throw new Error("no centre pixel");
  return pixel;
};

test("a drop that has not fallen leaves the backdrop alone", () => {
  const idle = { age: -1, x: 20, y: 20 };
  const pixel = centre(
    <ShaderLayer
      fx={waterRipple({ box, time: 0, drops: [idle, idle, idle] })}
    />,
  );
  expect(pixel.r).toBeGreaterThan(240);
  expect(pixel.g).toBeLessThan(15);
});

test("water tints what it covers and leaves the air above alone", () => {
  const under = centre(
    <ShaderLayer fx={waterRipple({ box, time: 0, drops: [], level: 5 })} />,
  );
  const over = centre(
    <ShaderLayer fx={waterRipple({ box, time: 0, drops: [], level: 35 })} />,
  );
  expect(under.b).toBeGreaterThan(over.b + 30);
  expect(over.r).toBeGreaterThan(240);
});

test("a finished dissolve replaces the backdrop with black", () => {
  const pixel = centre(
    <ShaderLayer fx={zetsu({ box, time: 0, center: [20, 20], wipe: 2 })} />,
  );
  expect(pixel.r).toBeLessThan(15);
});
