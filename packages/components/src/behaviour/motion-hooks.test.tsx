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
 */

import { describe, expect, it } from "vitest";
import { inertia, springPhysics } from "@gpuixui/motion";
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
