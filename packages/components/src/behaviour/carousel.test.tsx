/**
 * Carousel behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: every slide painted at once, a step that runs past the
 * last slide, loop ignored, arrow keys that do not move, a controlled carousel
 * that moves on its own, and a style callback that cannot see the active slide.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  Carousel,
  CarouselControl,
  CarouselSlide,
  CarouselTrack,
} from "../carousel.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
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

describe("Carousel", () => {
  it("mounts every slide and displays only the active one", () => {
    const gallery = renderComponent(<Gallery value={1} />);

    expect(gallery.renderer.getAllText()).toEqual(["One", "Two", "Three"]);
    expect(gallery.renderer.findByType("svg")).toHaveLength(2);
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
    expect(gallery.renderer.findByTestId("next")?.style.opacity).toBe(0.5);

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
});
