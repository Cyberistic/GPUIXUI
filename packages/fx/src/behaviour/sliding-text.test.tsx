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
import { SlidingText } from "../sliding-text.js";

const lineHeight = darkTheme.typography.body.lineHeight;

const width = 200;

const slide = (text: string, extra: { readonly back?: boolean } = {}) => (
  <SlidingText
    testId="slide"
    text={text}
    direction={extra.back === true ? "back" : "forward"}
    style={{ width }}
  />
);

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
    throw new Error("behaviour: the slide painted no text host");
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

const change = async (
  page: ReturnType<typeof renderComponent>,
  node: React.ReactNode,
): Promise<void> => {
  page.rerender(node);
  await after(0);
  settle(page);
};

const offsetOf = (page: ReturnType<typeof renderComponent>): number => {
  const box = page.renderer.getElementBounds(byTestId(page, "slide").id);
  const value = page.renderer.getElementBounds(host(page).id);
  if (box === null || value === null) {
    throw new Error("behaviour: the slide painted no box");
  }
  return value.x - box.x;
};

describe("SlidingText", () => {
  it("clips the value to one line of its role and the width it is given", () => {
    const page = renderComponent(slide("42"));
    try {
      settle(page);
      const box = byTestId(page, "slide");
      expect(box.style.overflow).toBe("hidden");
      expect(box.style.height).toBe(lineHeight);
      expect(box.style.width).toBe(width);
      expect(page.renderer.getAllText()).toEqual(["42"]);
    } finally {
      page.unmount();
    }
  });

  it("keeps the outgoing value for the exit half, then paints the new one", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));

      expect(painted(page)).toBe("first");
      await waitFor(() => expect(painted(page)).toBe("second"));
    } finally {
      page.unmount();
    }
  });

  it("travels the outgoing value out of the clip before the swap", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { opacity: 0, left: -width },
      });
    } finally {
      page.unmount();
    }
  });

  it("starts the incoming value beyond the far edge and slides it home", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));
      await waitFor(() => expect(painted(page)).toBe("second"));

      expect(host(page).customProps?.motion).toMatchObject({
        initial: { opacity: 0, left: width },
      });
      expect(offsetOf(page)).toBeCloseTo(width, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(offsetOf(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("reverses the travel for a back slide", async () => {
    const page = renderComponent(slide("first", { back: true }));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second", { back: true }));

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { left: width },
      });
    } finally {
      page.unmount();
    }
  });

  it("fades in place before the box has reported its width", async () => {
    const page = renderComponent(slide("first"));
    try {
      page.renderer.clockPause();
      page.rerender(slide("second"));
      await after(0);
      page.renderer.flush();

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { opacity: 0, left: 0 },
      });
    } finally {
      page.unmount();
    }
  });

  it("settles to rest once the incoming value has landed", async () => {
    const phases: string[] = [];
    const slide = (text: string) => (
      <SlidingText
        testId="slide"
        text={text}
        style={(state) => {
          phases.push(state.phase);
          return { width };
        }}
      />
    );
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));
      await waitFor(() => expect(painted(page)).toBe("second"));
      settle(page);
      expect(phases.at(-1)).toBe("entering");
      expect(offsetOf(page)).toBeCloseTo(width, 1);

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
      <MotionProvider preference="reduced">{slide("first")}</MotionProvider>,
    );
    try {
      settle(page);
      page.renderer.clockPause();
      await change(
        page,
        <MotionProvider preference="reduced">{slide("second")}</MotionProvider>,
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
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      await change(page, slide("second"));
      await after(20);
      await change(page, slide("third"));

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
      <SlidingText testId="slide" text="v1" level="notice" style={{ width }} />,
    );
    try {
      page.renderer.clockPause();
      await settle(page);
      for (const next of ["v2", "v3", "v4", "v5", "v6"]) {
        await change(
          page,
          <SlidingText
            testId="slide"
            text={next}
            level="notice"
            style={{ width }}
          />,
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
      <SlidingText
        testId="slide"
        text={null as unknown as string}
        style={(state) => {
          reported.push(state.text);
          return { width };
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
