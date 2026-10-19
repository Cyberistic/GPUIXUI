/**
 * Carousel behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: every slide painted at once (the runtime ignores
 * `display: "none"` — plan 365), an inactive slide taking the active slide's
 * click, a step that runs past the last slide, loop ignored, arrow keys that do
 * not move, a controlled carousel that moves on its own, a style callback that
 * cannot see the active slide, a slide that could only be reached by repeated
 * stepping (the indicator dots), and a nested widget's arrow keys also stepping
 * the carousel (plan 614), and an index that is not a whole slide (a fractional
 * or non-finite `value`) hiding every slide because none compared equal (plan
 * 619).
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselSlide,
  CarouselTrack,
} from "../carousel.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
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
  onControlClick,
}: {
  readonly value: number;
  readonly onValueChange?: (value: number) => void;
  readonly loop?: boolean;
  readonly onControlClick?: () => void;
}) => (
  <div style={{ width: 480 }}>
    <Carousel
      testId="carousel"
      label="Screenshots"
      value={value}
      onValueChange={onValueChange}
      loop={loop}
    >
      <CarouselTrack testId="track">
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
        <CarouselControl
          direction="previous"
          testId="prev"
          onClick={onControlClick}
        />
        <CarouselControl
          direction="next"
          testId="next"
          onClick={onControlClick}
        />
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

/** A controlled gallery with one indicator per slide and no text controls. */
const IndicatorGallery = ({
  value,
  onValueChange,
}: {
  readonly value: number;
  readonly onValueChange?: (value: number) => void;
}) => (
  <div style={{ width: 480 }}>
    <Carousel
      testId="carousel"
      label="Screenshots"
      value={value}
      onValueChange={onValueChange}
    >
      <CarouselTrack testId="track">
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
      <CarouselIndicators testId="indicators" />
    </Carousel>
  </div>
);

/** The indicators over their own state, for press and keyboard paths. */
const StatefulIndicators = ({ initial = 0 }: { readonly initial?: number }) => {
  const [value, setValue] = useState(initial);
  return <IndicatorGallery value={value} onValueChange={setValue} />;
};

/** A gallery whose active slide hosts a widget with its own arrow keys. */
const KeyGallery = ({
  onValueChange,
  onInnerValueChange,
}: {
  readonly onValueChange?: (value: number) => void;
  readonly onInnerValueChange?: (value: string) => void;
}) => (
  <div style={{ width: 480 }}>
    <Carousel
      testId="carousel"
      label="Screenshots"
      value={0}
      onValueChange={onValueChange}
    >
      <CarouselTrack testId="track">
        <CarouselSlide testId="slide-0">
          <Tabs
            testId="inner-tabs"
            defaultValue="one"
            onValueChange={onInnerValueChange}
          >
            <TabsList>
              <TabsTrigger testId="inner-tab-one" value="one">
                First tab
              </TabsTrigger>
              <TabsTrigger testId="inner-tab-two" value="two">
                Second tab
              </TabsTrigger>
            </TabsList>
            <TabsContent value="one">
              <text>First panel</text>
            </TabsContent>
            <TabsContent value="two">
              <text>Second panel</text>
            </TabsContent>
          </Tabs>
        </CarouselSlide>
        <CarouselSlide testId="slide-1">
          <text>Two</text>
        </CarouselSlide>
      </CarouselTrack>
    </Carousel>
  </div>
);

/** The slide labels the renderer actually painted. */
const paintedSlides = (root: ComponentTestRoot): ReadonlyArray<string> => {
  const painted = root.renderer.getPaintedText();
  return Arr.filter(["One", "Two", "Three"], (label) =>
    Arr.some(painted, (line) => line.includes(label)),
  );
};

/** A gallery whose slides each carry a clickable row. */
const ClickableGallery = ({
  onRow,
}: {
  readonly onRow: (index: number) => void;
}) => (
  <div style={{ width: 480 }}>
    <Carousel testId="carousel" label="Screenshots" value={1}>
      <CarouselTrack testId="track">
        <CarouselSlide testId="slide-0">
          <div testId="row-0" onClick={() => onRow(0)}>
            <text>One</text>
          </div>
        </CarouselSlide>
        <CarouselSlide testId="slide-1">
          <div testId="row-1" onClick={() => onRow(1)}>
            <text>Two</text>
          </div>
        </CarouselSlide>
        <CarouselSlide testId="slide-2">
          <div testId="row-2" onClick={() => onRow(2)}>
            <text>Three</text>
          </div>
        </CarouselSlide>
      </CarouselTrack>
    </Carousel>
  </div>
);

/** A slide-local counter, to prove an inactive slide is not remounted. */
const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div testId="counter" onClick={() => setCount((current) => current + 1)}>
      <text>{`count ${count}`}</text>
    </div>
  );
};

describe("Carousel", () => {
  it("paints only the active slide", () => {
    const gallery = renderComponent(<Gallery value={1} />);

    expect(gallery.renderer.getAllText()).toEqual(["One", "Two", "Three"]);
    expect(gallery.renderer.findByType("svg")).toHaveLength(2);
    expect(paintedSlides(gallery)).toEqual(["Two"]);

    gallery.unmount();
  });

  it("gives an inactive slide no layout box", () => {
    const gallery = renderComponent(<Gallery value={1} />);
    const track = requireBounds(gallery, "track");
    const active = requireBounds(gallery, "slide-1");

    expect(Option.isNone(boundsOf(gallery, "slide-0"))).toBe(true);
    expect(Option.isNone(boundsOf(gallery, "slide-2"))).toBe(true);
    expect(active.width).toBeGreaterThanOrEqual(track.width - 2);
    expect(active.width).toBeLessThanOrEqual(track.width);

    gallery.unmount();
  });

  it("gives the active slide the click an inactive slide used to take", () => {
    const onRow = vi.fn();
    const gallery = renderComponent(<ClickableGallery onRow={onRow} />);
    const track = requireBounds(gallery, "track");

    gallery.renderer.nativeSimulateClick(
      track.x + 20,
      track.y + track.height / 2,
      0,
    );

    expect(onRow).toHaveBeenCalledWith(1);

    gallery.unmount();
  });

  it("keeps an inactive slide mounted with its state", () => {
    const gallery = renderComponent(
      <Carousel testId="carousel" label="Screenshots" defaultValue={0}>
        <CarouselTrack>
          <CarouselSlide testId="slide-0">
            <Counter />
          </CarouselSlide>
          <CarouselSlide testId="slide-1">
            <text>Two</text>
          </CarouselSlide>
        </CarouselTrack>
        <CarouselControl direction="next" testId="next" />
        <CarouselControl direction="previous" testId="prev" />
      </Carousel>,
    );

    clickCentreOf(gallery, "counter");
    expect(gallery.renderer.getAllText()).toContain("count 1");

    clickCentreOf(gallery, "next");
    expect(paintedSlides(gallery)).toEqual(["Two"]);

    clickCentreOf(gallery, "prev");
    expect(gallery.renderer.getAllText()).toContain("count 1");

    gallery.unmount();
  });

  it("steps with the controls and reports the new index", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery onValueChange={onValueChange} />,
    );

    clickCentreOf(gallery, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(paintedSlides(gallery)).toEqual(["Two"]);

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

  it("leaves a nested control's keys to that control", () => {
    const onValueChange = vi.fn();
    const onInnerValueChange = vi.fn();
    const gallery = renderComponent(
      <KeyGallery
        onValueChange={onValueChange}
        onInnerValueChange={onInnerValueChange}
      />,
    );

    gallery.renderer.focusElement(
      gallery.renderer.findByTestId("inner-tab-one")?.id ?? -1,
    );
    expect(focusedTestId(gallery)).toEqual(Option.some("inner-tab-one"));

    gallery.renderer.simulateKeystrokes("right");
    gallery.renderer.simulateKeystrokes("end");

    expect(onInnerValueChange).toHaveBeenLastCalledWith("two");
    expect(onValueChange).not.toHaveBeenCalled();

    gallery.renderer.focusElement(
      gallery.renderer.findByTestId("carousel")?.id ?? -1,
    );
    gallery.renderer.simulateKeystrokes("right");

    expect(onValueChange).toHaveBeenLastCalledWith(1);

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
    expect(paintedSlides(gallery)).toEqual(["Two"]);

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
    expect(paintedSlides(light)).toEqual(["One"]);
    expect(Option.isNone(boundsOf(light, "slide-1"))).toBe(true);
    light.unmount();
  });

  it("composes the caller's control handler with the step", () => {
    const onControlClick = vi.fn();
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <Gallery
        value={0}
        onValueChange={onValueChange}
        onControlClick={onControlClick}
      />,
    );

    clickCentreOf(gallery, "next");

    expect(onControlClick).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(1);

    gallery.unmount();
  });

  it("renders one named indicator per slide and marks the active one", () => {
    const gallery = renderComponent(<IndicatorGallery value={1} />);

    const first = gallery.renderer.findByTestId("carousel-indicator-0");
    const second = gallery.renderer.findByTestId("carousel-indicator-1");
    const third = gallery.renderer.findByTestId("carousel-indicator-2");

    expect(first?.customProps).toMatchObject({
      role: "button",
      "aria-label": "Go to slide 1",
      "aria-selected": false,
    });
    expect(second?.customProps?.["aria-selected"]).toBe(true);
    expect(third?.customProps?.["aria-label"]).toBe("Go to slide 3");
    expect(second?.style.width).toBe(18);
    expect(second?.style.backgroundColor).toBe(darkTheme.colors.primary);
    expect(first?.style.width).toBe(8);
    expect(first?.style.backgroundColor).toBe(darkTheme.colors.border);

    gallery.unmount();
  });

  it("jumps to the slide an indicator is pressed on", () => {
    const gallery = renderComponent(<StatefulIndicators />);

    clickCentreOf(gallery, "carousel-indicator-2");

    expect(paintedSlides(gallery)).toEqual(["Three"]);
    expect(
      gallery.renderer.findByTestId("carousel-indicator-2")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);

    gallery.unmount();
  });

  it("activates a focused indicator on Enter and Space", () => {
    const gallery = renderComponent(<StatefulIndicators />);

    gallery.renderer.focusElement(
      gallery.renderer.findByTestId("carousel-indicator-1")?.id ?? -1,
    );

    expect(focusedTestId(gallery)).toEqual(Option.some("carousel-indicator-1"));

    gallery.renderer.simulateKeystrokes("enter");

    expect(paintedSlides(gallery)).toEqual(["Two"]);

    const last = gallery.renderer.findByTestId("carousel-indicator-2");
    gallery.renderer.focusElement(last?.id ?? -1);
    gallery.renderer.nativeSimulateKeyUp(last?.id ?? -1, "space");

    expect(paintedSlides(gallery)).toEqual(["Three"]);

    gallery.unmount();
  });

  /**
   * Focus visibility (plan 522). The bug these guard, measured: the root takes
   * native focus for its arrow keys and a dot takes it for Enter/Space, and
   * neither painted the token ring, so a keyboard user could not see where
   * focus was.
   */
  it("paints the focus ring on the group and the focused dot", () => {
    const gallery = renderComponent(<StatefulIndicators />);

    gallery.renderer.focusElement(
      gallery.renderer.findByTestId("carousel")?.id ?? -1,
    );

    expect(
      gallery.renderer.findByTestId("carousel")?.style.boxShadow,
    ).toBeDefined();
    expect(
      gallery.renderer.findByTestId("carousel-indicator-0")?.style.boxShadow,
    ).toBeUndefined();

    gallery.renderer.focusElement(
      gallery.renderer.findByTestId("carousel-indicator-1")?.id ?? -1,
    );

    expect(
      gallery.renderer.findByTestId("carousel-indicator-1")?.style.boxShadow,
    ).toBeDefined();
    expect(
      gallery.renderer.findByTestId("carousel-indicator-0")?.style.boxShadow,
    ).toBeUndefined();
    expect(
      gallery.renderer.findByTestId("carousel")?.style.boxShadow,
    ).toBeUndefined();

    gallery.unmount();
  });

  it("seeds the group ring from autoFocus", () => {
    // The runtime applies `autoFocus` after React's effects, so `onFocus` never
    // runs (plan 388); the root's own state must carry the ring (plan 522).
    const gallery = renderComponent(
      <Carousel testId="carousel" label="Screenshots" autoFocus>
        <CarouselTrack>
          <CarouselSlide>
            <text>One</text>
          </CarouselSlide>
        </CarouselTrack>
      </Carousel>,
    );

    expect(focusedTestId(gallery)).toEqual(Option.some("carousel"));
    expect(
      gallery.renderer.findByTestId("carousel")?.style.boxShadow,
    ).toBeDefined();

    gallery.unmount();
  });

  /**
   * The bug these guard (plan 619): `active` was the raw `value` clamped only by
   * `Math.min`/`Math.max`, so a fractional index never equalled a slide index —
   * every slide took the hidden style — and a `NaN` index could not be stepped
   * away from because `NaN + 1` is still `NaN`.
   */
  it("paints the slide a fractional controlled index names", () => {
    const gallery = renderComponent(<IndicatorGallery value={1.5} />);

    expect(paintedSlides(gallery)).toEqual(["Two"]);
    expect(
      gallery.renderer.findByTestId("carousel-indicator-0")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(false);
    expect(
      gallery.renderer.findByTestId("carousel-indicator-1")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(
      gallery.renderer.findByTestId("carousel-indicator-2")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(false);

    gallery.unmount();
  });

  it("recovers from a non-finite index on the next step", () => {
    const onValueChange = vi.fn();
    const gallery = renderComponent(
      <StatefulGallery initial={Number.NaN} onValueChange={onValueChange} />,
    );

    expect(paintedSlides(gallery)).toEqual(["One"]);

    clickCentreOf(gallery, "next");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(paintedSlides(gallery)).toEqual(["Two"]);

    gallery.unmount();
  });
});
