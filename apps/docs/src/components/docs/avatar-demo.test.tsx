import { avatarSize } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvatarStatesBody, AvatarWorkflowBody } from "./avatar-demo";

/**
 * The avatar previews, as they render.
 *
 * The drawings are the only place a reader sees the four presence words, the
 * four diameters and the fallback edges beside the faces. A demo that dropped
 * the word beside a state, resized a disc without the token scale, or printed a
 * fallback the component does not derive would still build; these cases hold
 * the markup to the model and the style sheet to the roles the component
 * paints.
 */

const workflow = renderToStaticMarkup(<AvatarWorkflowBody />);
const states = renderToStaticMarkup(<AvatarStatesBody />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the style sheet. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the avatar roster preview", () => {
  it("opens with one member in every presence state and one with none", () => {
    const rows = (workflow.match(/class="gx-avatar-roster-row"/g) ?? []).length;
    expect(rows).toBe(5);
    expect(workflow).toContain(
      "5 members · 1 online, 1 away, 1 busy, 1 offline",
    );
    for (const word of [
      "Online",
      "Away",
      "Busy",
      "Offline",
      "No presence shown",
    ]) {
      expect(workflow).toContain(word);
    }
  });

  it("names every face and prints the fallback it derives", () => {
    for (const [name, initials] of [
      ["Ada Lovelace", "AL"],
      ["Grace Hopper", "GH"],
      ["Alan Turing", "AT"],
      ["Katherine Johnson", "KJ"],
      ["Jean Bartik", "JB"],
    ] as const) {
      expect(workflow).toContain(`aria-label="${name}"`);
      expect(workflow).toContain(`>${initials}<`);
    }
    // The card is one node per face, not a decorative box beside it.
    expect((workflow.match(/role="img"/g) ?? []).length).toBe(5);
  });

  it("describes the presence on the node, because a dot is colour-only", () => {
    expect(workflow).toContain('aria-description="online"');
    expect(workflow).toContain('aria-description="offline"');
    expect((workflow.match(/class="gx-avatar-dot"/g) ?? []).length).toBe(4);
  });
});

describe("the avatar states preview", () => {
  it("draws the four diameters from the token scale, not a literal", () => {
    for (const step of ["xs", "sm", "md", "lg"] as const) {
      expect(states).toContain(`width:${avatarSize[step]}px`);
      expect(states).toContain(`height:${avatarSize[step]}px`);
      expect(states).toContain(`${step} · ${avatarSize[step]}px`);
    }
  });

  it("prints the initials at the sizes the component computes", () => {
    for (const step of ["xs", "sm", "md", "lg"] as const) {
      expect(states).toContain(
        `font-size:${Math.round(avatarSize[step] * 0.4)}px`,
      );
    }
  });

  it("keeps the astral and empty fallbacks the component derives", () => {
    // The three edges the preview draws: a middle name is ignored, a lone
    // separator is no letter, and two astral parts stay whole.
    expect(states).toContain(">GH<");
    expect(states).toContain(">?<");
    expect(states).toContain(">🎨A<");
  });

  it("paints the disc, the ink, the dot and its rim from the roles", () => {
    expect(block(".gx-avatar-disc")).toContain("background: var(--muted)");
    expect(block(".gx-avatar-initials")).toContain("color: var(--foreground)");
    expect(block(".gx-avatar-dot")).toContain("border: 2px solid var(--card)");
    expect(block('.gx-avatar-dot[data-status="online"]')).toContain(
      "var(--success)",
    );
    expect(block('.gx-avatar-dot[data-status="away"]')).toContain(
      "var(--warning-soft-foreground)",
    );
    expect(block('.gx-avatar-dot[data-status="busy"]')).toContain(
      "var(--destructive)",
    );
    expect(block('.gx-avatar-dot[data-status="offline"]')).toContain(
      "var(--muted-foreground)",
    );
  });

  it("draws the picture path as decoration, not a second labelled node", () => {
    expect(states).toContain('<img alt=""');
    expect(block(".gx-avatar-photo")).toContain("object-fit: cover");
  });
});
