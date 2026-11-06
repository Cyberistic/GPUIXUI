import type { TestElement, TestRoot } from "@gpuix/react/testing";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { nodesWithRole, a11yNodes } from "../internal/a11y.js";
import { requireBounds, sizeOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { AvatarGroup, type AvatarGroupMember } from "../avatar-group.js";
import type { AvatarSize } from "../avatar.js";
import {
  avatarGroupRise,
  avatarOverlap,
  avatarStep,
} from "../avatar-group/logic.js";

const diameter = 32;
const step = avatarStep(diameter, avatarOverlap(diameter, Option.none()));

const members: ReadonlyArray<AvatarGroupMember> = [
  { name: "Ada Lovelace" },
  { name: "Grace Hopper" },
  { name: "Alan Turing" },
  { name: "Katherine Johnson" },
  { name: "Jean Bartik" },
];

const memberAt = (index: number): AvatarGroupMember => {
  const member = members[index];
  if (member === undefined) {
    throw new Error(`behaviour: no member at ${index}`);
  }
  return member;
};

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

      expect(row.width).toBe(diameter + step * 3);
      expect(row.height).toBe(diameter);
    } finally {
      page.unmount();
    }
  });

  it("reads a stored size the scale does not carry as the default row", () => {
    const page = renderComponent(
      <AvatarGroup
        testId="group"
        members={members.slice(0, 4)}
        size={"xl" as AvatarSize}
      />,
    );
    try {
      const row = requireBounds(page, "group");
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

      expect(motions[0]).not.toHaveProperty("transition.delay");
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

      expect(
        a11yNodes(labelled.renderer).map((node) => node.name),
      ).not.toContain("5 avatars");
    } finally {
      labelled.unmount();
    }
  });

  it("paints a group whose stored member list is not a list", () => {
    const page = renderComponent(
      <div>
        <text testId="before">Before</text>
        <AvatarGroup
          testId="group"
          // @ts-expect-error — the list a store wrote where it carried none.
          members={null}
        />
      </div>,
    );
    try {
      expect(page.renderer.getAllText()).toContain("Before");
      expect(page.renderer.findByTestId("avatar-group-disc-0")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("keeps the faces beside a stored entry that names nobody", () => {
    const page = renderComponent(
      <AvatarGroup
        testId="group"
        members={[
          // @ts-expect-error — a deleted record a store left in the list.
          null,
          // @ts-expect-error — a name a store wrote as something else.
          { name: 42 },
          memberAt(0),
        ]}
      />,
    );
    try {
      expect(requireBounds(page, "avatar-group-disc-0")).toBeDefined();
      expect(page.renderer.findByTestId("avatar-group-disc-1")).toBeUndefined();
      expect(
        nodesWithRole(page.renderer, "image").map((node) => node.name),
      ).toEqual(["Ada Lovelace"]);
    } finally {
      page.unmount();
    }
  });
});
