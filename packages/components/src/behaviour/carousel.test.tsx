import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  disabledAction,
} from "@gpuixui/tokens";
import { motionLevels } from "@gpuixui/motion/timing";
import { useState } from "react";
import {
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselSlide,
  CarouselTrack,
} from "../carousel.js";
import {
  clickCentreOf,
  focusedTestId,
  settle,
  sizeOf,
  waitFor,
} from "../internal/interaction.js";
import { MotionProvider } from "../motion.js";
import { darkTheme, lightTheme, targetSize } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { nodesWithRole } from "../internal/a11y.js";

const Gallery = ({
  value,
  onValueChange,
  loop = false,
}: {
  readonly value: number;
  readonly onValueChange?: (value: number) => void;
  readonly loop?: boolean;
}) => (
  <div style={{ width: 480 }}>
    <Carousel
      testId="carousel"
      label="Screenshots"
      value={value}
      onValueChange={onValueChange}
      loop={loop}
    >
      <CarouselTrack>
        <CarouselSlide testId="slide-0">
          <text>One</text>
        </CarouselSlide>
        <CarouselSlide testId="slide-1">
          <text>Two</text>
        </CarouselSlide>
        <CarouselSlide testId="slide-2">
          <text>Three</text>
        </CarouselSlide>
      </CarouselTrack>
      <div style={{ display: "flex", gap: 8 }}>
        <CarouselControl direction="previous" testId="prev" />
        <CarouselControl direction="next" testId="next" />
      </div>
      <CarouselIndicators testId="dots" />
    </Carousel>
  </div>
);

const StatefulGallery = ({
  initial = 0,
  loop = false,
  onValueChange,
}: {
  readonly initial?: number;
  readonly loop?: boolean;
  readonly onValueChange?: (value: number) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <Gallery
      value={value}
      loop={loop}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    />
  );
};

const mounted = (root: ComponentTestRoot): ReadonlyArray<number> =>
  Arr.filter(
    [0, 1, 2],
    (index) => root.renderer.findByTestId(`slide-${index}`) !== undefined,
  );

const dotted = (root: ComponentTestRoot, testId: string) => {
  const target = root.renderer.findByTestId(testId);
  const drawn = target?.children
    .map((id) => root.renderer.getElement(id))
    .find((element) => element?.type === "div");
  if (drawn === undefined) {
    throw new Error(`behaviour: "${testId}" drew no dot`);
  }
  return drawn;
};

const dotWidth = (root: ComponentTestRoot, testId: string): number => {
  const bounds = root.renderer.getElementBounds(dotted(root, testId).id);
  if (bounds === null) {
    throw new Error(`behaviour: "${testId}" drew no box`);
  }
  return bounds.width;
};

const delay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

const DOT_REST = 6;
const DOT_ACTIVE = 18;

describe("Carousel", () => {
  it("mounts only the slide on screen", () => {
    const gallery = renderComponent(<Gallery value={1} />);

    expect(gallery.renderer.getAllText()).toEqual(["Two"]);
    expect(mounted(gallery)).toEqual([1]);

    gallery.unmount();
  });

  it("steps with the controls and reports the new index", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );

    clickCentreOf(gallery, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(mounted(gallery)).toEqual([1]);

    clickCentreOf(gallery, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(2);

    clickCentreOf(gallery, "prev");
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    gallery.unmount();
  });

  it("stops at both edges without loop", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery initial={2} onValueChange={onValueChange} />,
    );

    clickCentreOf(gallery, "next");
    expect(onValueChange).not.toHaveBeenCalled();

    const disabled = disabledAction(darkTheme);
    expect(gallery.renderer.findByTestId("next")?.style.backgroundColor).toBe(
      disabled.backgroundColor,
    );
    expect(gallery.renderer.findByTestId("next")?.style.color).toBe(
      disabled.color,
    );

    gallery.unmount();

    const first = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );
    clickCentreOf(first, "prev");
    expect(onValueChange).not.toHaveBeenCalled();
    first.unmount();
  });

  it("wraps in both directions with loop", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery initial={2} loop onValueChange={onValueChange} />,
    );

    clickCentreOf(gallery, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(0);

    clickCentreOf(gallery, "prev");
    expect(onValueChange).toHaveBeenLastCalledWith(2);

    gallery.unmount();
  });

  it("steps with arrows and jumps with Home/End", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );
    gallery.renderer.focusElement(
      gallery.renderer.findByTestId("carousel")?.id ?? -1,
    );
    expect(focusedTestId(gallery)).toEqual(Option.some("carousel"));

    gallery.renderer.simulateKeystrokes("right");
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    gallery.renderer.simulateKeystrokes("end");
    expect(onValueChange).toHaveBeenLastCalledWith(2);

    gallery.renderer.simulateKeystrokes("left");
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    gallery.renderer.simulateKeystrokes("home");
    expect(onValueChange).toHaveBeenLastCalledWith(0);

    gallery.unmount();
  });

  it("keeps a controlled carousel on the caller's slide", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <Gallery value={1} onValueChange={onValueChange} />,
    );

    clickCentreOf(gallery, "next");

    expect(onValueChange).toHaveBeenCalledWith(2);
    expect(mounted(gallery)).toEqual([1]);

    gallery.unmount();

    const unreadable = renderComponent(
      <Gallery value={Number.NaN} onValueChange={onValueChange} />,
    );

    expect(mounted(unreadable)).toEqual([0]);

    clickCentreOf(unreadable, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(1);

    unreadable.unmount();
  });

  it("names the region and both controls", () => {
    const gallery = renderComponent(<Gallery value={0} />);

    const regions = nodesWithRole(gallery.renderer, "group");
    expect(regions.map((node) => node.name)).toContain("Screenshots");
    expect(gallery.renderer.findByTestId("prev")?.customProps).toMatchObject({
      role: "button",
      "aria-label": "Previous slide",
    });
    expect(gallery.renderer.findByTestId("next")?.customProps).toMatchObject({
      "aria-label": "Next slide",
    });

    gallery.unmount();
  });

  it("hands the slide's position to a style callback, in both themes", () => {
    const gallery = renderComponent(
      <Carousel testId="carousel" label="Screenshots" value={1}>
        <CarouselTrack testId="track">
          <CarouselSlide
            testId="slide-0"
            style={(state) => ({ opacity: state.index + 1 })}
          >
            <text>One</text>
          </CarouselSlide>
          <CarouselSlide
            testId="slide-1"
            style={(state) => ({ opacity: state.index + 1 })}
          >
            <text>Two</text>
          </CarouselSlide>
        </CarouselTrack>
        <CarouselControl direction="next" testId="next" />
      </Carousel>,
    );

    expect(gallery.renderer.findByTestId("slide-0")).toBeUndefined();
    expect(gallery.renderer.findByTestId("slide-1")?.style.opacity).toBe(2);
    expect(gallery.renderer.findByTestId("track")?.style.backgroundColor).toBe(
      darkTheme.colors.card,
    );

    gallery.unmount();

    const light = renderComponent(
      <Carousel testId="carousel" label="Screenshots" value={0}>
        <CarouselTrack testId="track">
          <CarouselSlide
            testId="slide-0"
            style={(state) => ({ opacity: state.index + 1 })}
          >
            <text>One</text>
          </CarouselSlide>
          <CarouselSlide testId="slide-1">
            <text>Two</text>
          </CarouselSlide>
        </CarouselTrack>
        <CarouselControl direction="next" testId="next" />
      </Carousel>,
      "light",
    );
    expect(light.renderer.findByTestId("carousel")).toBeDefined();
    expect(light.renderer.findByTestId("slide-0")?.style.opacity).toBe(1);
    light.unmount();
  });

  it("paints the chevron in the control's own label role", () => {
    Arr.forEach(
      [
        ["dark", darkTheme],
        ["light", lightTheme],
      ] as const,
      ([mode, theme]) => {
        const gallery = renderComponent(<Gallery value={0} />, mode);

        try {
          const control = gallery.renderer.findByTestId("next");
          const glyph = control?.children
            .map((id) => gallery.renderer.getElement(id))
            .find((child) => child?.type === "svg");

          const label = String(control?.style.color);
          const fill = String(control?.style.backgroundColor);
          const painted = String(glyph?.style.color);

          expect(painted).toBe(label);
          expect(painted).toBe(theme.colors.secondaryForeground);

          expect(contrastRatio(painted, fill) ?? 0).toBeGreaterThanOrEqual(
            contrastFloorsFor(theme).boundary,
          );
        } finally {
          gallery.unmount();
        }
      },
    );
  });

  it("names one press target per slide and marks the active one", () => {
    const gallery = renderComponent(<Gallery value={1} />);

    try {
      const labels = [0, 1, 2].map(
        (index) =>
          gallery.renderer.findByTestId(`dots-${index}`)?.customProps?.[
            "aria-label"
          ],
      );
      expect(labels).toEqual([
        "Go to slide 1",
        "Go to slide 2",
        "Go to slide 3",
      ]);

      const selected = [0, 1, 2].map(
        (index) =>
          gallery.renderer.findByTestId(`dots-${index}`)?.customProps?.[
            "aria-selected"
          ],
      );
      expect(selected).toEqual([false, true, false]);

      const stops = [0, 1, 2].map(
        (index) =>
          gallery.renderer.findByTestId(`dots-${index}`)?.customProps?.tabIndex,
      );
      expect(stops).toEqual([-1, 0, -1]);
    } finally {
      gallery.unmount();
    }
  });

  it("jumps to the slide a dot names", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );

    try {
      clickCentreOf(gallery, "dots-2");

      expect(onValueChange).toHaveBeenLastCalledWith(2);
      expect(mounted(gallery)).toEqual([2]);
    } finally {
      gallery.unmount();
    }
  });

  it("moves the dot's tab stop with the slide and steps from a focused dot", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );

    try {
      gallery.renderer.focusElement(
        gallery.renderer.findByTestId("dots-0")?.id ?? -1,
      );
      expect(focusedTestId(gallery)).toEqual(Option.some("dots-0"));

      gallery.renderer.simulateKeystrokes("right");

      expect(onValueChange).toHaveBeenLastCalledWith(1);
      expect(
        gallery.renderer.findByTestId("dots-0")?.customProps?.tabIndex,
      ).toBe(-1);
      expect(
        gallery.renderer.findByTestId("dots-1")?.customProps?.tabIndex,
      ).toBe(0);
    } finally {
      gallery.unmount();
    }
  });

  it("reserves the press floor around a smaller drawing", () => {
    const gallery = renderComponent(<Gallery value={0} />);

    try {
      const target = sizeOf(gallery, "dots-0");
      expect(Option.map(target, (size) => size.height)).toEqual(
        Option.some(targetSize.minimum),
      );

      const drawing = dotted(gallery, "dots-1");
      const painted = gallery.renderer.getElementBounds(drawing.id);
      expect(painted?.height).toBe(6);
      expect(painted?.width).toBe(6);

      expect(drawing.style.pointerEvents).toBe("none");
    } finally {
      gallery.unmount();
    }
  });

  it("marks the active dot in a measured role and widens it, in both themes", () => {
    Arr.forEach(
      [
        ["dark", darkTheme],
        ["light", lightTheme],
      ] as const,
      ([mode, theme]) => {
        const gallery = renderComponent(<Gallery value={0} />, mode);

        try {
          const active = dotted(gallery, "dots-0");
          const rest = dotted(gallery, "dots-1");
          const activeInk = String(active.style.backgroundColor);
          const restInk = String(rest.style.backgroundColor);

          expect(activeInk).toBe(theme.colors.primary);
          expect(restInk).toBe(theme.colors.mutedForeground);

          Arr.forEach([activeInk, restInk], (ink) => {
            expect(
              contrastRatio(ink, theme.colors.background) ?? 0,
            ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).boundary);
          });

          expect(dotWidth(gallery, "dots-0")).toBeGreaterThan(
            dotWidth(gallery, "dots-1"),
          );
        } finally {
          gallery.unmount();
        }
      },
    );
  });

  it("grows the active dot over its level instead of jumping", async () => {
    const gallery = renderComponent(<StatefulGallery />);

    try {
      settle(gallery);
      await waitFor(() => expect(dotWidth(gallery, "dots-0")).toBe(DOT_ACTIVE));
      const from = dotWidth(gallery, "dots-0");
      const rest = dotWidth(gallery, "dots-2");
      expect(rest).toBe(DOT_REST);

      gallery.renderer.clockPause();
      clickCentreOf(gallery, "dots-2");
      await delay();

      expect(dotWidth(gallery, "dots-0")).toBe(from);
      expect(dotWidth(gallery, "dots-2")).toBe(rest);

      gallery.renderer.clockFastForward(400);
      await delay();

      expect(dotWidth(gallery, "dots-0")).toBe(DOT_REST);
      expect(dotWidth(gallery, "dots-2")).toBe(DOT_ACTIVE);
    } finally {
      gallery.unmount();
    }
  });

  it("eases the dot's growth at both ends, as a movement between resting states", async () => {
    const gallery = renderComponent(<StatefulGallery />);

    try {
      settle(gallery);
      await waitFor(() => expect(dotWidth(gallery, "dots-0")).toBe(DOT_ACTIVE));
      expect(dotWidth(gallery, "dots-2")).toBe(DOT_REST);

      gallery.renderer.clockPause();
      clickCentreOf(gallery, "dots-2");
      await delay();
      gallery.renderer.clockFastForward(motionLevels.fast / 2);
      await delay();

      const grown = dotWidth(gallery, "dots-2");
      expect(grown).toBeGreaterThan(DOT_REST);
      expect(grown).toBeLessThan(DOT_REST + 7);
    } finally {
      gallery.unmount();
    }
  });

  it("paints the dot at its new width in the frame a reduced reader changes slide", async () => {
    const gallery = renderComponent(
      <MotionProvider preference="reduced">
        <StatefulGallery />
      </MotionProvider>,
    );

    try {
      settle(gallery);
      await waitFor(() => expect(dotWidth(gallery, "dots-0")).toBe(DOT_ACTIVE));

      gallery.renderer.clockPause();
      clickCentreOf(gallery, "dots-2");
      await delay();

      expect(dotWidth(gallery, "dots-2")).toBe(DOT_ACTIVE);
      expect(dotWidth(gallery, "dots-0")).toBe(DOT_REST);
    } finally {
      gallery.unmount();
    }
  });

  it("paints no indicators for a track with no slides", () => {
    const empty = renderComponent(
      <Carousel testId="carousel" label="Screenshots">
        <CarouselTrack />
        <CarouselIndicators testId="dots" />
      </Carousel>,
    );

    try {
      expect(empty.renderer.findByTestId("dots")).toBeUndefined();
    } finally {
      empty.unmount();
    }
  });
});
