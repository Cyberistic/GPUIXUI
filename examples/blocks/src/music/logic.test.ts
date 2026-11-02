/**
 * The waveform is stable and in range (a re-render must not redraw a different
 * song), the clock pads, and a row press lands on the row.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { tracks } from "./data.js";
import { clock, trackOf, transport, waveform } from "./logic.js";

describe("the player", () => {
  it("draws the same waveform for the same seed, inside its band", () => {
    const first = waveform(7, 40);
    expect(waveform(7, 40)).toEqual(first);
    expect(waveform(11, 40)).not.toEqual(first);
    expect(Arr.every(first, (height) => height >= 6 && height <= 36)).toBe(
      true,
    );
  });

  it("pads the clock and opens the row it is given", () => {
    expect(clock(192)).toBe("3:12");
    expect(clock(7)).toBe("0:07");
    expect(Option.getOrUndefined(trackOf(tracks, "cobalt"))?.title).toBe(
      "Cobalt",
    );
    expect(Option.getOrUndefined(trackOf(tracks, "nope"))?.title).toBe(
      "Snowfall",
    );
    expect(transport(false)).toBe(true);
  });
});
