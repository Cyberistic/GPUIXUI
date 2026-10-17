/**
 * Avatar initials: the bugs these guard are a code-unit split that tears an
 * emoji in half, a dropped second initial in a hyphenated or spaced name, and an
 * avatar rendered blank instead of showing its placeholder.
 *
 * Every case is a literal input and its expected output, so a change to the rule
 * fails the test rather than moving with it.
 */

import { describe, expect, it } from "vitest";
import { initials } from "./logic.js";

describe("initials", () => {
  it("takes the first letter of the first and last part", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
  });

  it("keeps a second initial from a hyphenated name", () => {
    expect(initials("Jean-Luc Picard")).toBe("JP");
  });

  it("gives one letter for a single-part name", () => {
    expect(initials("ada")).toBe("A");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initials("  Grace   Hopper  ")).toBe("GH");
  });

  it("answers a name with no letter with a visible placeholder", () => {
    expect(initials("  ")).toBe("?");
  });

  it("keeps a CJK name whole", () => {
    expect(initials("李 小龙")).toBe("李小");
  });

  it("does not split an astral character", () => {
    expect(initials("🎨 Artist")).toBe("🎨A");
  });

  it("uses the last part, not the second", () => {
    expect(initials("J. Robert Oppenheimer")).toBe("JO");
  });
});
