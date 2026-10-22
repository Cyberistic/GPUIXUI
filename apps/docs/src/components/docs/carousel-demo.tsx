import { useState, type ReactNode } from "react";
import {
  controlDisabled,
  describeSlide,
  dotLabel,
  dotTarget,
  dotWidth,
  firstIndex,
  goToIndex,
  lastIndex,
  rovingStop,
  stepIndex,
} from "./carousel-preview";

/**
 * Browser previews for the Carousel page.
 *
 * The shipped carousel is **discrete**: GPUix `motion` has no transform and the
 * runtime has no scroll snap, so a sliding track is not honestly expressible.
 * Every slide stays mounted and only the active one is displayed, which the
 * preview mirrors with its own `hidden` slides — the name typed on slide three
 * is still there after visiting slide one, exactly because the slide never
 * unmounted.
 *
 * The three routes to a slide share one rule: the controls, the arrow keys and
 * the dots all run the same clamp and loop (`carousel-preview.ts`), and the
 * dots are one roving tab stop on the active slide with a wider pill so the
 * state is not colour-only.
 *
 * A preview is a browser rendering: the native root publishes `role="group"`
 * with its `label`, and its dots publish `aria-selected` because `0.11.0` has
 * no `aria-current` — the page says both.
 */

interface Slide {
  readonly id: string;
  readonly title: string;
  readonly copy: string;
  readonly content?: ReactNode;
}

interface CarouselPreviewProps {
  readonly label: string;
  readonly slides: ReadonlyArray<Slide>;
  readonly initial?: number;
  readonly loop?: boolean;
  /** Hide the previous/next pair, leaving the dots as the only route. */
  readonly controls?: boolean;
}

/**
 * One carousel: a focusable region, one displayed slide, the controls and the
 * dots. Arrow keys step from wherever focus is inside it, `Home`/`End` jump to
 * the ends, and a dot jumps to the slide it names.
 */
const CarouselPreview = ({
  label,
  slides,
  initial = 0,
  loop = false,
  controls = true,
}: CarouselPreviewProps) => {
  const [active, setActive] = useState(() =>
    goToIndex(initial, slides.length),
  );
  const count = slides.length;
  const step = (delta: 1 | -1): void =>
    setActive((current) => stepIndex({ active: current, count, delta, loop }));
  const go = (index: number): void => setActive(goToIndex(index, count));

  return (
    <div className="gx-carousel-frame">
      <div
        aria-label={label}
        className="gx-carousel"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          else if (event.key === "ArrowLeft") step(-1);
          else if (event.key === "Home") setActive(firstIndex());
          else if (event.key === "End") setActive(lastIndex(count));
        }}
        role="group"
        tabIndex={0}
      >
        <div className="gx-carousel-card">
          {slides.map((slide, index) => (
            <div
              className="gx-carousel-slide"
              data-active={index === active ? "" : undefined}
              hidden={index !== active}
              key={slide.id}
            >
              <span className="gx-carousel-kicker">
                {index + 1} / {count}
              </span>
              <h4 className="gx-carousel-title">{slide.title}</h4>
              <p className="gx-carousel-copy">{slide.copy}</p>
              {slide.content}
            </div>
          ))}
          {count === 0 ? (
            <div className="gx-carousel-slide" data-active="">
              <h4 className="gx-carousel-title">No slides</h4>
              <p className="gx-carousel-copy">
                A track with no slides paints no dots and disables both
                controls.
              </p>
            </div>
          ) : null}
          <div className="gx-carousel-footer">
            {controls ? (
              <div className="gx-carousel-controls">
                <button
                  aria-label="Previous slide"
                  className="gx-carousel-btn"
                  disabled={controlDisabled({
                    active,
                    count,
                    delta: -1,
                    loop,
                  })}
                  onClick={() => step(-1)}
                  type="button"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  aria-label="Next slide"
                  className="gx-carousel-btn"
                  disabled={controlDisabled({
                    active,
                    count,
                    delta: 1,
                    loop,
                  })}
                  onClick={() => step(1)}
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            ) : (
              <span />
            )}
            {count === 0 ? null : (
              <div
                aria-label="Choose a slide"
                className="gx-carousel-dots"
                role="group"
              >
                {slides.map((slide, index) => {
                  const selected = index === active;
                  return (
                    <div
                      aria-label={dotLabel(index)}
                      aria-selected={selected}
                      className="gx-carousel-dot"
                      key={slide.id}
                      onClick={() => go(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.repeat) {
                          event.preventDefault();
                          go(index);
                        }
                      }}
                      onKeyUp={(event) => {
                        if (event.key === " " && !event.repeat) {
                          event.preventDefault();
                          go(index);
                        }
                      }}
                      role="button"
                      style={{ width: dotTarget, height: dotTarget }}
                      tabIndex={index === rovingStop(active) ? 0 : -1}
                    >
                      <span
                        className="gx-carousel-dot-mark"
                        data-selected={selected ? "" : undefined}
                        style={{
                          width: dotWidth(selected),
                          height: dotWidth(false),
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <p className="gx-carousel-readout" role="status">
          {describeSlide(active, count, loop)}
        </p>
      </div>
    </div>
  );
};

/** A field on a slide: its draft proves the slide was never unmounted. */
const MemberDraft = () => {
  const [name, setName] = useState("");
  return (
    <label className="gx-carousel-field">
      <span className="gx-carousel-field-label">Invite by name</span>
      <input
        className="gx-carousel-input"
        onChange={(event) => setName(event.target.value)}
        placeholder="ada@example.com"
        value={name}
      />
      <span className="gx-carousel-hint" role="status">
        {name.trim() === ""
          ? "Type a name, step to another slide, then come back."
          : `Draft kept: ${name.trim()}`}
      </span>
    </label>
  );
};

const workspaceSlides: ReadonlyArray<Slide> = [
  {
    id: "overview",
    title: "Overview",
    copy: "The workspace at a glance: three projects, one failing build.",
  },
  {
    id: "activity",
    title: "Activity",
    copy: "Who changed what, newest first. Every row opens its own detail.",
  },
  {
    id: "members",
    title: "Members",
    copy: "Invite a teammate by name. The draft survives leaving this slide.",
    content: <MemberDraft />,
  },
  {
    id: "billing",
    title: "Billing",
    copy: "The plan, its seats and the next invoice date.",
  },
];

export const CarouselWorkflow = () => (
  <div className="gx-demo gx-demo-column gx-carousel-scene">
    <p className="gx-demo-label">Workspace previews</p>
    <CarouselPreview
      initial={0}
      label="Workspace previews"
      loop
      slides={workspaceSlides}
    />
  </div>
);

const edgeSlides: ReadonlyArray<Slide> = [
  {
    id: "one",
    title: "First",
    copy: "Previous is disabled on the first slide when the carousel does not loop.",
  },
  { id: "two", title: "Second", copy: "Both controls are live in the middle." },
  {
    id: "three",
    title: "Last",
    copy: "Next is disabled on the last slide, so the control never lies.",
  },
];

const numbers = (count: number): ReadonlyArray<Slide> =>
  Array.from({ length: count }, (_, index) => ({
    id: `slide-${index + 1}`,
    title: `Slide ${index + 1}`,
    copy: "Every dot is a press target; the active one is a wider pill.",
  }));

const stateGroup = (
  label: string,
  preview: ReactNode,
): ReactNode => (
  <>
    <p className="gx-demo-label">{label}</p>
    {preview}
  </>
);

export const CarouselStates = () => (
  <div className="gx-demo gx-demo-column gx-carousel-scene">
    {stateGroup(
      "Stops at the ends",
      <CarouselPreview label="Release notes" slides={edgeSlides} />,
    )}
    {stateGroup(
      "Wraps at both ends",
      <CarouselPreview initial={2} label="Looping release notes" loop slides={edgeSlides} />,
    )}
    {stateGroup(
      "Dots only, five slides",
      <CarouselPreview
        controls={false}
        initial={2}
        label="Choose a workspace"
        slides={numbers(5)}
      />,
    )}
    {stateGroup(
      "Empty track",
      <CarouselPreview label="Nothing to show" slides={[]} />,
    )}
  </div>
);

const workflowSource = `import {
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselSlide,
  CarouselTrack,
} from "@gpuixui/components";
import { Input } from "@gpuixui/primitives";
import { useState } from "react";

/** A field on a slide keeps its own state: the slide never unmounts. */
const Invite = () => {
  const [name, setName] = useState("");
  return <Input label="Invite by name" onChange={setName} value={name} />;
};

export const WorkspacePreviews = () => (
  <Carousel label="Workspace previews" defaultValue={0} loop>
    <CarouselTrack>
      <CarouselSlide>Overview</CarouselSlide>
      <CarouselSlide>Activity</CarouselSlide>
      {/* Leaving and returning to this slide keeps the draft. */}
      <CarouselSlide>
        <Invite />
      </CarouselSlide>
      <CarouselSlide>Billing</CarouselSlide>
    </CarouselTrack>
    <CarouselControl direction="previous" />
    <CarouselControl direction="next" />
    <CarouselIndicators />
  </Carousel>
);`;

const statesSource = `import {
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselSlide,
  CarouselTrack,
} from "@gpuixui/components";

<>
  {/* An edge disables its control, so the press never does nothing. */}
  <Carousel label="Release notes" defaultValue={0}>
    <CarouselTrack>{/* …three slides… */}</CarouselTrack>
    <CarouselControl direction="previous" />
    <CarouselControl direction="next" />
  </Carousel>

  {/* Loop wraps in both directions and keeps both controls live. */}
  <Carousel label="Looping release notes" defaultValue={2} loop>
    <CarouselTrack>{/* …three slides… */}</CarouselTrack>
    <CarouselControl direction="previous" />
    <CarouselControl direction="next" />
  </Carousel>

  {/* The dots are a second route, without a control pair. */}
  <Carousel label="Choose a workspace" defaultValue={2}>
    <CarouselTrack>{/* …five slides… */}</CarouselTrack>
    <CarouselIndicators />
  </Carousel>
</>;`;

export {
  statesSource as carouselStatesSource,
  workflowSource as carouselWorkflowSource,
};
