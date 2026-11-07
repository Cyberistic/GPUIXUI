import { describe, expect, it } from "vitest";
import { bungeeGum, waterRipple, zetsu } from "./nen.js";
import { liquidMetal, sparkles } from "./pack.js";

const rect = { x: 100, y: 50, w: 200, h: 60 };
const box = { x: 40, y: 20, w: 400, h: 300 };

describe("shader effects", () => {
  it("stays inside the renderer's 64 vec4 uniform", () => {
    expect(
      liquidMetal({ rect, radius: 30, time: 1 }).params.length,
    ).toBeLessThanOrEqual(256);
  });

  it("packs a rect relative to the box it paints", () => {
    const fx = liquidMetal({ rect, radius: 30, time: 1 });
    expect(fx.params.slice(0, 2)).toEqual([
      rect.x - fx.box.x,
      rect.y - fx.box.y,
    ]);
  });

  it("keeps a burst's sparkles waiting until the burst", () => {
    const at = (time: number) =>
      sparkles({ rect, time, burst: 1, count: 12 }).data?.length ?? 0;
    expect(at(0.5)).toBe(0);
    expect(at(1.3)).toBeGreaterThan(0);
  });

  it("gives a frame that depends only on its inputs", () => {
    expect(sparkles({ rect, time: 2, count: 12 })).toEqual(
      sparkles({ rect, time: 2, count: 12 }),
    );
  });

  it("moves backdrop points into the box's space and marks them as reading it", () => {
    const fx = waterRipple({
      box,
      time: 0,
      drops: [
        { age: 1, x: 140, y: 120 },
        { age: 0, x: 0, y: 0 },
        { age: 0, x: 0, y: 0 },
      ],
    });
    expect(fx.readsBackdrop).toBe(true);
    expect(fx.params.slice(0, 3)).toEqual([1, 100, 100]);
    expect(
      bungeeGum({ box, time: 0, from: [40, 20], pull: [5, 6] }).params,
    ).toEqual([0, 0, 5, 6]);
    expect(
      zetsu({ box, time: 0, center: [240, 170], wipe: 0.5 }).params.slice(0, 3),
    ).toEqual([0.5, 200, 150]);
  });
});
