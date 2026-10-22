/**
 * AvatarGroup in the real GPUix renderer.
 *
 * The bugs these guard: a row whose width disagrees with where its discs sit, so
 * the page reflows as the group animates; a cap that hides the front of the list
 * instead of the tail; a chip a reader hears as "+2" and nothing else; an
 * arrival that is already at rest when it mounts; a stagger counted per disc or
 * handed to the runtime in milliseconds; an appended face that replays the whole
 * row, and a removed one that remounts the faces after it; and a reduced run
 * that still travels.
 *
 * The motion clock is paused before the group mounts, so the first frame is the
 * declared target rather than wherever the frame loop had got. A headless tree
 * reports bounds, not paint, so the rise is the observable half of the
 * fade-and-offset pair.
 */

import type { TestElement, TestRoot } from "@gpuix/react/testing";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { nodesWithRole, a11yNodes } from "../internal/a11y.js";
import { requireBounds, sizeOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { AvatarGroup, type AvatarGroupMember } from "../avatar-group.js";
import {
  avatarGroupRise,
  avatarOverlap,
  avatarStep,
} from "../avatar-group/logic.js";

/** The md face is 32px, so the house overlap is 8px and a disc advances 24. */
const diameter = 32;
const step = avatarStep(diameter, avatarOverlap(diameter, Option.none()));

/** Five faces, so a cap always has a tail to hide. */
const members: ReadonlyArray<AvatarGroupMember> = [
  { name: "Ada Lovelace" },
  { name: "Grace Hopper" },
  { name: "Alan Turing" },
  { name: "Katherine Johnson" },
  { name: "Jean Bartik" },
];

/** One face, failing on a missing index rather than casting it away. */
const memberAt = (index: number): AvatarGroupMember => {
  const member = members[index];
  if (member === undefined) {
    throw new Error(`behaviour: no member at ${index}`);
  }
  return member;
};

/** One element by test id, failing rather than casting. */
const byTestId = (
  renderer: TestRoot["renderer"],
  testId: string,
): TestElement => {
  const element = renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  return element;
};

/** Mount a group under a paused motion clock, so its first frame is exact. */
const mountFrozen = (node: ReactNode) => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  const show = (next: ReactNode): void => {
    page.rerender(next);
    page.renderer.flush();
  };
  show(node);
  return { page, show };
};

describe("AvatarGroup", () => {
  it("overlaps the faces by the step and sizes the row to them", () => {
    const page = renderComponent(
      <AvatarGroup testId="group" members={members.slice(0, 4)} />,
    );
    try {
      const row = requireBounds(page, "group");
      const first = requireBounds(page, "avatar-group-disc-0");
      const second = requireBounds(page, "avatar-group-disc-1");
      const last = requireBounds(page, "avatar-group-disc-3");

      expect(second.x - first.x).toBe(step);
      expect(last.x - first.x).toBe(step * 3);
      // The row reserves exactly the discs plus the advances between them, so an
      // absolutely positioned arrival cannot reflow the page.
      expect(row.width).toBe(diameter + step * 3);
      expect(row.height).toBe(diameter);
    } finally {
      page.unmount();
    }
  });

  it("hides the tail behind a chip that counts and names it", () => {
    const page = renderComponent(
      <AvatarGroup testId="group" members={members} max={3} />,
    );
    try {
      expect(Option.isNone(sizeOf(page, "avatar-group-disc-3"))).toBe(true);
      const chip = requireBounds(page, "avatar-group-overflow");
      const third = requireBounds(page, "avatar-group-disc-2");

      // The chip is the fourth disc in the row, and the only text it adds.
      expect(chip.x - third.x).toBe(step);
      expect(page.renderer.getAllText()).toEqual(["AL", "GH", "AT", "+2"]);

      const images = nodesWithRole(page.renderer, "image").map(
        (node) => node.name,
      );
      expect(images).toEqual([
        "Ada Lovelace",
        "Grace Hopper",
        "Alan Turing",
        "2 more: Katherine Johnson, Jean Bartik",
      ]);
    } finally {
      page.unmount();
    }
  });

  it("starts every disc below its resting place and rises it in", () => {
    const { page } = mountFrozen(
      <AvatarGroup testId="group" members={members.slice(0, 3)} />,
    );
    try {
      const row = requireBounds(page, "group");
      const first = requireBounds(page, "avatar-group-disc-0");
      expect(first.y - row.y).toBeCloseTo(avatarGroupRise, 1);

      page.renderer.clockFastForward(1_000);
      page.renderer.flush();

      expect(requireBounds(page, "avatar-group-disc-0").y - row.y).toBeCloseTo(
        0,
        1,
      );
    } finally {
      page.unmount();
    }
  });

  it("staggers the arrivals by the step, in seconds the runtime reads", () => {
    const { page } = mountFrozen(<AvatarGroup members={members.slice(0, 3)} />);
    try {
      const motions = [0, 1, 2].map(
        (index) =>
          byTestId(page.renderer, `avatar-group-disc-${index}`).customProps
            ?.motion,
      );

      expect(motions[0]).toMatchObject({ transition: { delay: 0 } });
      expect(motions[1]).toMatchObject({ transition: { delay: 0.04 } });
      expect(motions[2]).toMatchObject({ transition: { delay: 0.08 } });
    } finally {
      page.unmount();
    }
  });

  it("keeps the row's box still while the discs travel", () => {
    const { page } = mountFrozen(
      <AvatarGroup testId="group" members={members.slice(0, 4)} />,
    );
    try {
      const moving = requireBounds(page, "group");

      page.renderer.clockFastForward(1_000);
      page.renderer.flush();

      expect(requireBounds(page, "group")).toEqual(moving);
    } finally {
      page.unmount();
    }
  });

  it("adds a face without remounting the ones already there", () => {
    const { page, show } = mountFrozen(
      <AvatarGroup testId="group" members={members.slice(0, 2)} />,
    );
    try {
      page.renderer.clockFastForward(1_000);
      page.renderer.flush();
      const ada = byTestId(page.renderer, "avatar-group-disc-0").id;
      const grace = byTestId(page.renderer, "avatar-group-disc-1").id;

      show(<AvatarGroup testId="group" members={members.slice(0, 3)} />);

      expect(byTestId(page.renderer, "avatar-group-disc-0").id).toBe(ada);
      expect(byTestId(page.renderer, "avatar-group-disc-1").id).toBe(grace);
      // The appended face is the one that arranges, at its own place in the row.
      expect(
        byTestId(page.renderer, "avatar-group-disc-2").customProps?.motion,
      ).toMatchObject({ transition: { delay: 0.08 } });
    } finally {
      page.unmount();
    }
  });

  it("keeps a face mounted when an earlier one leaves", () => {
    const { page, show } = mountFrozen(
      <AvatarGroup testId="group" members={members.slice(0, 3)} />,
    );
    try {
      page.renderer.clockFastForward(1_000);
      page.renderer.flush();
      const alan = byTestId(page.renderer, "avatar-group-disc-2").id;

      // A member's key is its name, so Alan moves to index 1 without remounting
      // and does not replay the arrival the reader already saw.
      show(<AvatarGroup testId="group" members={[memberAt(0), memberAt(2)]} />);

      const moved = byTestId(page.renderer, "avatar-group-disc-1");
      expect(moved.id).toBe(alan);
      expect(requireBounds(page, "group").width).toBe(diameter + step);
    } finally {
      page.unmount();
    }
  });

  it("paints the resting row under the reduced preference", () => {
    const { page } = mountFrozen(
      <MotionProvider preference="reduced">
        <AvatarGroup testId="group" members={members.slice(0, 3)} />
      </MotionProvider>,
    );
    try {
      const row = requireBounds(page, "group");
      const second = byTestId(page.renderer, "avatar-group-disc-1");

      expect(second.customProps?.motion).toMatchObject({
        transition: { duration: 0 },
      });
      expect(second.customProps?.motion).not.toHaveProperty("transition.delay");
      expect(requireBounds(page, "avatar-group-disc-1").y - row.y).toBeCloseTo(
        0,
        1,
      );
    } finally {
      page.unmount();
    }
  });

  it("names the group by its size unless the caller names it", () => {
    const page = renderComponent(
      <AvatarGroup testId="named" members={members.slice(0, 3)} />,
    );
    try {
      const groups = nodesWithRole(page.renderer, "group").map(
        (node) => node.name,
      );
      expect(groups).toEqual(["3 avatars"]);
    } finally {
      page.unmount();
    }

    const labelled = renderComponent(
      <AvatarGroup testId="named" members={members} label="Project team" />,
    );
    try {
      expect(
        nodesWithRole(labelled.renderer, "group").map((node) => node.name),
      ).toEqual(["Project team"]);
      // The default name is not painted twice beside the caller's.
      expect(
        a11yNodes(labelled.renderer).map((node) => node.name),
      ).not.toContain("5 avatars");
    } finally {
      labelled.unmount();
    }
  });
});
