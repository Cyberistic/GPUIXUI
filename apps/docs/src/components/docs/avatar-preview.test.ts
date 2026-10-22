import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { initials } from "../../../../../packages/components/src/avatar/logic.js";
import {
  describeRoster,
  initialMembers,
  initialsFor,
  invite,
  presenceCounts,
  presenceStates,
  presenceText,
  visibleMembers,
} from "./avatar-preview";

/**
 * The avatar preview's initials, roster and presence words.
 *
 * The bug this guards: a browser preview that draws its own fallback can teach
 * a rule the shipped component does not have — a code-unit split that tears an
 * emoji in half, or a two-letter fallback on a single name — while the page
 * looks right. Every initials case is compared with the component's own
 * `initials()`, and the geometry the preview draws (the four diameters, the
 * 40% type, the 10px dot and its rim) is read out of the source rather than
 * trusted, so a component change fails here first.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/avatar.tsx",
    import.meta.url,
  ),
  "utf8",
);

const scale = readFileSync(
  new URL("../../../../../packages/tokens/src/scale.ts", import.meta.url),
  "utf8",
);

/** The names the page prints in its fallback table, plus the edges around it. */
const names = [
  "Ada Lovelace",
  "Jean-Luc Picard",
  "J. Robert Oppenheimer",
  "ada",
  "李 小龙",
  "🎨 Artist",
  "  ",
  "Grace Brewster Murray Hopper",
  "  Ada   Lovelace  ",
  "-",
  "🎨🎨 Ada",
] as const;

describe("the avatar preview's initials", () => {
  it("produce the same fallback the shipped component does", () => {
    // The drawing is not the authority: if the two disagree the component is
    // right, and the preview has to move.
    const drift = names
      .map((name) => [name, initialsFor(name), initials(name)] as const)
      .filter(([, preview, shipped]) => preview !== shipped);

    expect(drift).toEqual([]);
  });

  it("keep an astral character whole instead of splitting its surrogate pair", () => {
    // A code-unit read gives the high surrogate, which paints a replacement
    // box. The picture emoji is the case the package's own page prints.
    expect(initialsFor("🎨 Artist")).toBe("🎨A");
    expect(Array.from(initialsFor("🎨 Artist"))).toHaveLength(2);
  });

  it("take the first and the last part, not the second", () => {
    expect(initialsFor("J. Robert Oppenheimer")).toBe("JO");
    expect(initialsFor("Ada Lovelace")).toBe("AL");
    expect(initialsFor("ada")).toBe("A");
    expect(initialsFor("Jean-Luc Picard")).toBe("JP");
  });

  it("never paint a blank disc for a name with no letter", () => {
    expect(initialsFor("  ")).toBe("?");
    expect(initialsFor("-")).toBe("?");
  });
});

describe("the avatar preview's roster", () => {
  it("opens with a member in every presence state and one with none", () => {
    const counts = presenceCounts(initialMembers);

    expect(initialMembers).toHaveLength(5);
    expect(counts).toEqual({ online: 1, away: 1, busy: 1, offline: 1, none: 1 });
  });

  it("leaves only the online members under the filter, and never adds one", () => {
    const online = visibleMembers(initialMembers, true);

    expect(online.map((member) => member.name)).toEqual(["Ada Lovelace"]);
    expect(
      online.every((member) => initialMembers.includes(member)),
    ).toBe(true);
    expect(visibleMembers(initialMembers, false)).toBe(initialMembers);
  });

  it("prints only the states somebody is in", () => {
    expect(describeRoster(initialMembers)).toBe(
      "5 members · 1 online, 1 away, 1 busy, 1 offline",
    );
    expect(
      describeRoster([{ name: "Ada Lovelace", role: "Maintainer" }]),
    ).toBe("1 members · no presence shown");
  });

  it("names every presence state in words, because the dot is colour-only", () => {
    expect(presenceStates).toEqual(["online", "away", "busy", "offline"]);
    expect(presenceStates.map(presenceText)).toEqual([
      "Online",
      "Away",
      "Busy",
      "Offline",
    ]);
    expect(presenceText(undefined)).toBe("No presence shown");
  });
});

describe("the avatar preview's invite", () => {
  it("refuses a blank name instead of drawing an unnamed face", () => {
    expect(invite(initialMembers, "   ")).toEqual({
      kind: "refused",
      reason: "A name is required.",
    });
  });

  it("refuses a name already on the panel, because a face keys on its name", () => {
    // `AvatarGroup` keys a member by name, so a second "Ada Lovelace" would be
    // one face drawn twice rather than a colleague who happens to share it.
    expect(invite(initialMembers, " Ada Lovelace ")).toEqual({
      kind: "refused",
      reason: "Ada Lovelace is already on the panel.",
    });
  });

  it("trims the invited name and leaves the new face with no picture", () => {
    const result = invite(initialMembers, "  Mary   Jackson  ");

    expect(result.kind).toBe("added");
    if (result.kind !== "added") return;
    const added = result.members.at(-1);

    expect(added).toEqual({ name: "Mary Jackson", role: "Invited" });
    expect(added?.src).toBeUndefined();
    expect(initialsFor(added?.name ?? "")).toBe("MJ");
  });
});

describe("the avatar preview's geometry", () => {
  it("takes the four diameters from the token scale", () => {
    // The page prints these numbers, so the read pins what it may print.
    const block = /export const avatarSize[^}]*}/.exec(scale)?.[0] ?? "";
    const value = (step: string): number =>
      Number(new RegExp(`\\b${step}: (\\d+)`).exec(block)?.[1] ?? Number.NaN);

    expect(["xs", "sm", "md", "lg"].map(value)).toEqual([20, 26, 32, 40]);
  });

  it("draws the initials at 40% of the diameter, as the component does", () => {
    expect(component).toContain("Math.round(diameter * 0.4)");
    expect(component).toContain("const diameter = avatarSize[size];");
  });

  it("draws a 10px dot on the rim, inside the strong edge", () => {
    expect(component).toContain("const DOT = 10;");
    expect(component).toContain("right: -1,");
    expect(component).toContain("bottom: -1,");
    expect(component).toContain("borderWidth: theme.borderWidth.strong,");
    expect(component).toContain("borderColor: theme.colors.card,");
  });

  it("keeps the disc clipped and the root unclipped, so the dot is whole", () => {
    // The comment is a premise: a clipped root cuts the dot in half.
    expect(component).toContain("The root is not clipped");
    expect(component).toContain("recipeStyle(AVATAR_DISC, theme)");
    expect(component).toContain("cn(AVATAR_ROOT, className)");
  });

  it("announces the presence as the one node's description", () => {
    expect(component).toContain('role="img"');
    expect(component).toContain("aria-label={name}");
    expect(component).toContain("aria-description={status ?? rest[");
    expect(component).toContain('role="presentation"');
  });

  it("has no image error path, which is the limitation the page states", () => {
    // The v1 contract: a missing file paints nothing and the initials do not
    // return, because the runtime reports no image-load failure.
    expect(component).not.toContain("onError");
    expect(component).toContain("no image-loading or image-error state");
  });
});
