/**
 * Carousel behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: every slide painted at once, a step that runs past the
 * last slide, loop ignored, arrow keys that do not move, a controlled carousel
 * that moves on its own, a style callback that cannot see the active slide, an
 * indicator that jumps between its two widths because the state is a style
 * value rather than a motion target, and a reduced-motion reader who is made to
 * watch the dot travel anyway.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  disabledAction,
} from "@gpuixui/tokens";
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

/** A controlled gallery with previous/next controls. */
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

/** A stateful gallery, for the uncontrolled path. */
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

/** Which slides are painted, from their `display` style. */
const displays = (root: ComponentTestRoot): ReadonlyArray<unknown> =>
  [0, 1, 2].map(
    (index) => root.renderer.findByTestId(`slide-${index}`)?.style.display,
  );

/** The dot a press target draws — its one painted child. */
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

/** The width `testId`'s dot is painted at, from the renderer's own bounds. */
const dotWidth = (root: ComponentTestRoot, testId: string): number => {
  const bounds = root.renderer.getElementBounds(dotted(root, testId).id);
  if (bounds === null) {
    throw new Error(`behaviour: "${testId}" drew no box`);
  }
  return bounds.width;
};

/** Let the renderer's frame loop publish what the last commit queued. */
const delay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

/** The two widths a dot is drawn at: the resting circle and the active pill. */
const DOT_REST = 6;
const DOT_ACTIVE = 18;

describe("Carousel", () => {
  it("mounts every slide and displays only the active one", () => {
    const gallery = renderComponent(<Gallery value={1} />);

    expect(gallery.renderer.getAllText()).toEqual(["One", "Two", "Three"]);
    expect(displays(gallery)).toEqual(["none", "flex", "none"]);

    gallery.unmount();
  });

  it("steps with the controls and reports the new index", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );

    clickCentreOf(gallery, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(displays(gallery)).toEqual(["none", "flex", "none"]);

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
    // An edge control is disabled: it leaves the tab order and wears the
    // measured neutral pair rather than a fade (`internal/button.tsx`).
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
    expect(displays(gallery)).toEqual(["none", "flex", "none"]);

    gallery.unmount();

    // A caller's index is usually arithmetic, and `Math.floor(offset / width)`
    // stamps `NaN` before a width has been measured. The clamp passes it
    // through, so an unreadable index used to hide every slide — and keep them
    // hidden, because the step compares against it and never matches.
    const unreadable = renderComponent(
      <Gallery value={Number.NaN} onValueChange={onValueChange} />,
    );

    expect(displays(unreadable)).toEqual(["flex", "none", "none"]);

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

  it("hands the active state to a style callback, in both themes", () => {
    const gallery = renderComponent(
      <Carousel testId="carousel" label="Screenshots" value={1}>
        <CarouselTrack testId="track">
          <CarouselSlide
            testId="slide-0"
            style={(state) => ({ opacity: state.active ? 1 : 0.25 })}
          >
            <text>One</text>
          </CarouselSlide>
          <CarouselSlide
            testId="slide-1"
            style={(state) => ({ opacity: state.active ? 1 : 0.25 })}
          >
            <text>Two</text>
          </CarouselSlide>
        </CarouselTrack>
        <CarouselControl direction="next" testId="next" />
      </Carousel>,
    );

    expect(gallery.renderer.findByTestId("slide-0")?.style.opacity).toBe(0.25);
    expect(gallery.renderer.findByTestId("slide-1")?.style.opacity).toBe(1);
    expect(gallery.renderer.findByTestId("track")?.style.backgroundColor).toBe(
      darkTheme.colors.card,
    );

    gallery.unmount();

    const light = renderComponent(<Gallery value={0} />, "light");
    expect(light.renderer.findByTestId("carousel")).toBeDefined();
    expect(light.renderer.findByTestId("slide-0")?.style.display).toBe("flex");
    light.unmount();
  });

  it("paints the chevron in the control's own label role", () => {
    // The bug this guards: a glyph painted in a role chosen for another fill.
    // `secondaryForeground` on the `primary` fill measures 1.42:1 in Windows
    // dark, so the arrow would be invisible; on the `secondary` fill the pair
    // the control actually paints is 7.2–17.1:1 in every shipped style.
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

          // The glyph is the control's label in vectors, not a colour of its own.
          expect(painted).toBe(label);
          expect(painted).toBe(theme.colors.secondaryForeground);

          // And the painted pair — read back off the renderer, not the theme —
          // clears the floor a non-text mark needs.
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

      // One roving stop, on the slide on screen: Tab reaches the dots once and
      // the arrows move the stop with the slide.
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
      expect(displays(gallery)).toEqual(["none", "none", "flex"]);
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

      // The root owns the arrow keys, and a key dispatched at a dot reaches it.
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
    // A dot is a small mark but a real press target: the 24px floor WCAG 2.2
    // SC 2.5.8 asks for, with the drawing inside it and the press hit-tested on
    // the target rather than on six painted pixels.
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
      // The drawing paints a fill, which is the boundary a press stops at, so
      // it removes its own hitbox and the press reaches the 24px target
      // (`press-routing-lifecycle`'s `text-filled`/`inert-control` cases).
      expect(drawing.style.pointerEvents).toBe("none");
    } finally {
      gallery.unmount();
    }
  });

  it("marks the active dot in a measured role and widens it, in both themes", () => {
    // The bugs these guard: a mark painted in a role that vanishes into the
    // page, and a state carried by hue alone. `indicatorRoles` measures both
    // inks at the mark floor; the active drawing is a pill, so its state
    // survives a reader who cannot separate the two hues.
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

          // Both inks are marks on the strip the carousel paints: the page,
          // because the root has no surface of its own.
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
    // The bug this guards: the width was a style value, so a selection swapped
    // the two dots' widths in one frame and the reader had to compare a dot with
    // the one it replaced. It is a motion target now, so both dots travel from
    // the widths on screen — `fast`, the level the motion package names for an
    // indicator.
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

      // One frame in, neither dot has moved: the run starts from what is painted.
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

  it("paints the dot at its new width in the frame a reduced reader changes slide", async () => {
    const gallery = renderComponent(
      <MotionProvider preference="reduced">
        <StatefulGallery />
      </MotionProvider>,
    );

    try {
      settle(gallery);
      await waitFor(() => expect(dotWidth(gallery, "dots-0")).toBe(DOT_ACTIVE));

      // The clock is frozen, so a journey would never arrive: the assertion is
      // that the preference removes the travel rather than shortening it.
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
      // A dot per slide: with no slides there is nothing to jump to, so the
      // group is not mounted rather than mounted empty.
      expect(empty.renderer.findByTestId("dots")).toBeUndefined();
    } finally {
      empty.unmount();
    }
  });
});
