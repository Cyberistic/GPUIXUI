/**
 * The motion hooks' frame loop, in the real GPUix renderer.
 *
 * The bugs these guard: the documented inline declarations — `useSpring(target,
 * springPhysics({ … }))` and `useInertia(v, inertia())` — are a new object on
 * every render, and the hook's effect was keyed on that identity. Every commit
 * re-armed the effect, which sampled immediately and published a fresh frame
 * object even when nothing had moved: measured at `HEAD` (2026-10-23) a spring
 * that had already settled re-rendered **1 089** times to rest and then ~200 more
 * in the 150 ms after it, a loop that ran for as long as the component was
 * mounted. The declaration is retained by value now (the rule the retained value
 * already applied) and a frame is published only when it differs, so the same
 * component rests and stops.
 *
 * The reduced preference's later frames are the second guard: it painted the
 * resting frame only in the mount's first render, so a target or a release
 * changed while it was on kept the previous frame for one commit — the same
 * one-frame flash the mount rule forbids — and reported the skipped journey
 * against the run that was leaving. A reduced render now paints the destination
 * it names, with the completion edge, and retires the retained run in the same
 * commit.
 *
 * The third guard: that branch repaired a value it could not read to `0`, so a
 * measured height or a release velocity that failed for one render collapsed the
 * surface to the first frame (or to the offset a reduced coast had already left)
 * and retired the retained value there — the next readable value then reported a
 * journey the reader never saw. A value the render cannot read is no destination
 * now: the hook holds the frame on screen.
 */

import { describe, expect, it } from "vitest";
import { inertia, layoutSpring, springPhysics } from "@gpuixui/motion";
import { useInertia, useSpring } from "@gpuixui/motion/react";
import { after, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Renders painted since the case reset it, so a loop is visible as a count. */
const paints = { count: 0 };

/** A spring whose physics — the documented inline form — are rebuilt per render. */
const InlineSpring = ({ target }: { readonly target: number }) => {
  paints.count += 1;
  const { value } = useSpring(
    target,
    springPhysics({ stiffness: 260, damping: 30 }),
    {
      initial: 0,
    },
  );
  return <text testId="inline-spring">{String(value)}</text>;
};

/** A coast whose inertia — also rebuilt per render — clamps at its bound. */
const InlineCoast = ({ release }: { readonly release: number }) => {
  paints.count += 1;
  const { value } = useInertia(release, inertia(350, { max: 60 }));
  return <text testId="inline-coast">{String(value)}</text>;
};

/** A spring a reduced reader drives: the target is the frame it names. */
const ReducedTarget = ({
  target,
  reduced,
  initial,
}: {
  readonly target: number;
  readonly reduced: boolean;
  readonly initial?: number;
}) => {
  const { value, velocity, complete } = useSpring(target, layoutSpring, {
    initial,
    reducedMotion: reduced,
  });
  return (
    <text testId="reduced-target">{`${value}:${velocity}:${complete}`}</text>
  );
};

/** A coast a reduced reader releases: the projection is the frame it names. */
const ReducedCoast = ({
  release,
  reduced,
}: {
  readonly release: number;
  readonly reduced: boolean;
}) => {
  const { value, velocity, complete } = useInertia(release, inertia(350), {
    initial: 0,
    reducedMotion: reduced,
  });
  return (
    <text testId="reduced-coast">{`${value}:${velocity}:${complete}`}</text>
  );
};

/** Every painted string, joined: the frame the loop last published. */
const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

describe("the motion hooks", () => {
  it("stops sampling a spring whose physics are built on every render", async () => {
    paints.count = 0;
    const page = renderComponent(<InlineSpring target={100} />);
    try {
      await waitFor(() => expect(painted(page)).toBe("100"));
      // The painted value is the target exactly, so the run has rested; a render
      // past this point is the loop the inline declaration used to keep alive.
      const rested = paints.count;
      await after(120);
      expect(paints.count).toBe(rested);
      // ...and the run itself is sampled by the frame timer, not by a re-armed
      // effect: the old loop painted a thousand frames for this run.
      expect(rested).toBeLessThan(200);
    } finally {
      page.unmount();
    }
  });

  it("stops sampling a coast whose inertia is built on every render", async () => {
    paints.count = 0;
    const page = renderComponent(<InlineCoast release={400} />);
    try {
      // The bounded projection is the rest the coast lands on.
      await waitFor(() => expect(painted(page)).toBe("60"));
      const rested = paints.count;
      await after(120);
      expect(paints.count).toBe(rested);
      expect(rested).toBeLessThan(200);
    } finally {
      page.unmount();
    }
  });
});

describe("the reduced preference's later frames", () => {
  it("paints a target changed while it is on in the frame it arrives", () => {
    // The defect: the render still published the previous frame, so a reduced
    // count-up or width change flashed the value it was leaving for one commit.
    const page = renderComponent(<ReducedTarget target={100} reduced />);
    try {
      expect(painted(page)).toBe("100:0:false");
      page.rerender(<ReducedTarget target={200} reduced />);
      expect(painted(page)).toBe("200:0:true");
    } finally {
      page.unmount();
    }
  });

  it("paints a release changed while it is on in the frame it arrives", () => {
    // The projection is the resting frame, so a new release names a new one;
    // the previous projection must not survive the commit that changes it.
    const page = renderComponent(<ReducedCoast release={400} reduced />);
    try {
      expect(painted(page)).toBe("140:0:true");
      page.rerender(<ReducedCoast release={300} reduced />);
      expect(painted(page)).toBe("105:0:true");
    } finally {
      page.unmount();
    }
  });

  it("paints the resting frame in the commit the preference turns on", () => {
    // The preference removes the journey, so the frame it lands on is the one
    // the reader sees when the setting changes — not the tween's next sample.
    const page = renderComponent(
      <ReducedTarget target={100} reduced={false} initial={0} />,
    );
    try {
      expect(painted(page)).toBe("0:0:false");
      page.rerender(<ReducedTarget target={100} reduced initial={0} />);
      expect(painted(page)).toBe("100:0:true");
    } finally {
      page.unmount();
    }
  });

  it("keeps a mount that asked for no journey from reporting one", () => {
    // The over-correction: a reduced mount with no `initial` has no run to
    // complete, so the target paints with `complete` false.
    const page = renderComponent(<ReducedTarget target={100} reduced />);
    try {
      expect(painted(page)).toBe("100:0:false");
    } finally {
      page.unmount();
    }
  });

  it("holds the frame on screen when a reduced target cannot be read", () => {
    // The defect: an unreadable target was repaired to `0` in the reduced
    // branch, so a measurement that failed for one render collapsed a surface
    // to the first frame and retired the retained value there — the next
    // readable target then reported a journey the reader never saw.
    const page = renderComponent(<ReducedTarget target={100} reduced />);
    try {
      expect(painted(page)).toBe("100:0:false");
      page.rerender(<ReducedTarget target={Number.NaN} reduced />);
      expect(painted(page)).toBe("100:0:false");
      page.rerender(<ReducedTarget target={100} reduced />);
      expect(painted(page)).toBe("100:0:false");
    } finally {
      page.unmount();
    }
  });

  it("reports no journey for a reduced mount with no readable target", () => {
    // The over-correction beside the hold: `initial` names the start of a run,
    // but an unreadable target names no destination, so nothing was skipped.
    const page = renderComponent(
      <ReducedTarget target={Number.NaN} initial={8} reduced />,
    );
    try {
      expect(painted(page)).toBe("0:0:false");
    } finally {
      page.unmount();
    }
  });

  it("holds the frame a reduced coast reached when the release cannot be read", () => {
    // The defect: the projection read an unreadable release as a standstill at
    // the *offset*, so a reduced coast whose velocity failed for a render
    // flashed the release frame it had already left.
    const page = renderComponent(<ReducedCoast release={400} reduced />);
    try {
      expect(painted(page)).toBe("140:0:true");
      page.rerender(<ReducedCoast release={Number.NaN} reduced />);
      expect(painted(page)).toBe("140:0:true");
    } finally {
      page.unmount();
    }
  });
});
