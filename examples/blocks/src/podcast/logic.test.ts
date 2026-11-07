import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { episodes } from "./data.js";
import { clock, episodeOf, transport, waveform } from "./logic.js";

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
    expect(clock(3972)).toBe("1:06:12");
    expect(Option.getOrUndefined(episodeOf(episodes, "greed"))?.title).toBe(
      "Greed Island",
    );
    expect(Option.getOrUndefined(episodeOf(episodes, "nope"))?.title).toBe(
      "The 287th Hunter Exam",
    );
    expect(transport(false)).toBe(true);
  });
});
