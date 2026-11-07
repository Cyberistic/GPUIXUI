import type { TestElement } from "@gpuix/react/testing";
import { describe, expect, it } from "vitest";
import {
  a11yNodes,
  after,
  settle,
  waitFor,
  renderComponent,
} from "@gpuixui/components/authoring/testing";
import { darkTheme } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";
import { RollingText } from "../rolling-text.js";

const lineHeight = darkTheme.typography.body.lineHeight;

const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

const shown = (
  page: ReturnType<typeof renderComponent>,
): ReadonlyArray<string> => a11yNodes(page.renderer).map((node) => node.name);

const host = (page: ReturnType<typeof renderComponent>): TestElement => {
  const found = page.renderer
    .findByType("text")
    .find((element) => element.text === null);
  if (found === undefined) {
    throw new Error("behaviour: the roll painted no text host");
  }
  return found;
};

const byTestId = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): TestElement => {
  const element = page.renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  return element;
};

const boundsOf = (
  page: ReturnType<typeof renderComponent>,
  element: TestElement,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} => {
  const bounds = page.renderer.getElementBounds(element.id);
  if (bounds === null) {
    throw new Error("behaviour: the element painted no box");
  }
  return bounds;
};

const change = async (
  page: ReturnType<typeof renderComponent>,
  node: React.ReactNode,
): Promise<void> => {
  page.rerender(node);
  await after(0);
  settle(page);
};

const offsetOf = (
  page: ReturnType<typeof renderComponent>,
  id: string,
): number => {
  const box = page.renderer.getElementBounds(byTestId(page, id).id);
  const value = page.renderer.getElementBounds(host(page).id);
  if (box === null || value === null) {
    throw new Error("behaviour: the roll painted no box");
  }
  return value.y - box.y;
};

describe("RollingText", () => {
  it("clips the value to one line of its role", () => {
    const page = renderComponent(<RollingText testId="roll" text="42" />);
    try {
      const box = byTestId(page, "roll");
      expect(box.style.overflow).toBe("hidden");
      expect(box.style.height).toBe(lineHeight);
      expect(page.renderer.getA11yTree).toBeTypeOf("function");
      expect(page.renderer.getAllText()).toEqual(["42"]);
    } finally {
      page.unmount();
    }
  });

  it("keeps the whole value inside its one-line clip", () => {
    const page = renderComponent(
      <RollingText testId="roll" text="Idle" role="display" />,
    );
    try {
      const clip = boundsOf(page, byTestId(page, "roll"));
      const run = page.renderer
        .findByType("text")
        .find((element) => element.text === "Idle");
      if (run === undefined) {
        throw new Error("behaviour: the roll painted no run");
      }
      const value = boundsOf(page, run);

      expect(value.y).toBeGreaterThanOrEqual(clip.y);
      expect(value.y + value.height).toBeLessThanOrEqual(clip.y + clip.height);
    } finally {
      page.unmount();
    }
  });

  it("keeps the outgoing value for the exit half, then paints the new one", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      page.renderer.clockPause();
      await change(page, <RollingText testId="roll" text="second" />);

      expect(painted(page)).toBe("first");
      await waitFor(() => expect(painted(page)).toBe("second"));
    } finally {
      page.unmount();
    }
  });

  it("travels the outgoing value out of the clip before the swap", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      page.renderer.clockPause();
      await change(page, <RollingText testId="roll" text="second" />);

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { opacity: 0, top: -lineHeight },
      });
    } finally {
      page.unmount();
    }
  });

  it("starts the incoming value beyond the far edge and rises it home", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      page.renderer.clockPause();
      await change(page, <RollingText testId="roll" text="second" />);
      await waitFor(() => expect(painted(page)).toBe("second"));

      expect(host(page).customProps?.motion).toMatchObject({
        initial: { opacity: 0, top: lineHeight },
      });
      expect(offsetOf(page, "roll")).toBeCloseTo(lineHeight, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(offsetOf(page, "roll")).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("reverses the travel for a downward roll", async () => {
    const page = renderComponent(
      <RollingText testId="roll" text="first" direction="down" />,
    );
    try {
      page.renderer.clockPause();
      await change(
        page,
        <RollingText testId="roll" text="second" direction="down" />,
      );

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { top: lineHeight },
      });
    } finally {
      page.unmount();
    }
  });

  it("settles to rest once the incoming value has landed", async () => {
    const phases: string[] = [];
    const roll = (text: string) => (
      <RollingText
        testId="roll"
        text={text}
        style={(state) => {
          phases.push(state.phase);
          return {};
        }}
      />
    );
    const page = renderComponent(roll("first"));
    try {
      page.renderer.clockPause();
      await change(page, roll("second"));
      await waitFor(() => expect(painted(page)).toBe("second"));

      settle(page);
      expect(phases.at(-1)).toBe("entering");
      expect(offsetOf(page, "roll")).toBeCloseTo(lineHeight, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(phases.at(-1)).toBe("rest");

      expect(host(page).customProps?.motion).toMatchObject({
        initial: false,
        transition: { duration: 0 },
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the new value at once under the reduced preference", async () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <RollingText testId="roll" text="first" />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      await change(
        page,
        <MotionProvider preference="reduced">
          <RollingText testId="roll" text="second" />
        </MotionProvider>,
      );

      expect(painted(page)).toBe("second");
      expect(host(page).customProps?.motion).toMatchObject({
        transition: { duration: 0 },
      });
    } finally {
      page.unmount();
    }
  });

  it("lands on the newest value when the value changes mid-exit", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      await change(page, <RollingText testId="roll" text="second" />);
      await after(20);
      await change(page, <RollingText testId="roll" text="third" />);

      await waitFor(() => expect(painted(page)).toBe("third"));

      const names = a11yNodes(page.renderer).map((node) => node.name);
      expect(names).toContain("third");
      expect(names).not.toContain("second");
      expect(names).not.toContain("first");
    } finally {
      page.unmount();
    }
  });

  it("keeps swapping while the value keeps changing", async () => {
    const page = renderComponent(
      <RollingText testId="roll" text="v1" level="notice" />,
    );
    try {
      page.renderer.clockPause();
      for (const next of ["v2", "v3", "v4", "v5", "v6"]) {
        await change(
          page,
          <RollingText testId="roll" text={next} level="notice" />,
        );

        await after(60);
      }

      await after(60);
      expect(shown(page)).not.toContain("v1");
      await waitFor(() => expect(shown(page)).toContain("v6"), 1_000);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("reports an empty value for a stored value that was not text", () => {
    const reported: Array<string> = [];
    const page = renderComponent(
      <RollingText
        testId="roll"
        text={null as unknown as string}
        style={(state) => {
          reported.push(state.text);
          return {};
        }}
      />,
    );
    try {
      expect(painted(page)).toBe("");
      expect(reported).toEqual([""]);
    } finally {
      page.unmount();
    }
  });
});
