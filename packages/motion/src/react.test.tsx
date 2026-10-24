/**
 * The React entry's first published frame.
 *
 * The bugs this guard: `options.initial` is a number the caller computed — a
 * measured height, a count that has not arrived, a drag's offset — and the hook
 * published it verbatim, so a value it could not read (`NaN`) reached the caller
 * as the frame the runtime paints: the runtime draws a `NaN` inset as nothing,
 * and a consumer that formats the number paints the word `NaN`. The retained
 * `MotionValue` repaired the same value to `0`, so the hook and the value it
 * drives could disagree about the first frame. `useInertia` accepted the same
 * option and dropped it, so a coast handed the offset a gesture released at
 * started at zero.
 *
 * `renderToStaticMarkup` renders the **first** frame and runs no effect, which
 * is the frame the defect lives in: the effect that samples the retained value
 * lands after it.
 *
 * The reduced preference is a second first-frame bug: `reducedMotion` removed
 * the tween's duration but not its start, so a hook mounted with `initial` under
 * reduced published the value the journey would have left from for one commit.
 *
 * The third is where that preference comes from: the hooks publish the one
 * `MotionProvider` and read only their own option, so a tree wrapped for a
 * reduced reader still animated every hook below it.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { inertia } from "./inertia.js";
import { tween } from "./motion.js";
import { presenceTiming, type PresenceTimingInput } from "./presence.js";
import { MotionProvider } from "./provider.js";
import {
  useInertia,
  useMotion,
  useSurfacePresence,
  useTransition,
} from "./react.js";

/** The retained inertia every coast case reads; the hook takes a stable one. */
const coast = inertia();

/** The frame a hook publishes, as the runtime would read it. */
const Frame = ({
  target,
  initial,
}: {
  readonly target: number;
  readonly initial?: number;
}) => {
  const { value } = useMotion(target, tween(300), { initial });
  return <>{String(value)}</>;
};

/** The frame a tween hook publishes, as the runtime would read it. */
const TWEENFrame = ({
  target,
  initial,
}: {
  readonly target: number;
  readonly initial?: number;
}) => {
  const { value } = useTransition(target, { durationMs: 300 }, { initial });
  return <>{String(value)}</>;
};

/** The frame a coasting hook publishes, as the runtime would read it. */
const COASTFrame = ({ initial }: { readonly initial?: number }) => {
  const { value } = useInertia(400, coast, { initial });
  return <>{String(value)}</>;
};

/** The frame a hook publishes when the reader asked for no journey. */
const ReducedFrame = ({
  target,
  initial,
}: {
  readonly target: number;
  readonly initial?: number;
}) => {
  const { value } = useMotion(target, tween(300), {
    initial,
    reducedMotion: true,
  });
  return <>{String(value)}</>;
};

/** The tween hook's frame when the reader asked for no journey. */
const ReducedTWEENFrame = ({
  target,
  initial,
}: {
  readonly target: number;
  readonly initial?: number;
}) => {
  const { value } = useTransition(
    target,
    { durationMs: 300 },
    {
      initial,
      reducedMotion: true,
    },
  );
  return <>{String(value)}</>;
};

/** A bounded coast whose rest is 400 × 350 ms, clamped to 50. */
const boundedCoast = inertia(350, { min: 0, max: 50 });

/** The coasting hook's frame when the reader asked for no journey. */
const ReducedCOASTFrame = () => {
  const { value } = useInertia(400, boundedCoast, {
    initial: 0,
    reducedMotion: true,
  });
  return <>{String(value)}</>;
};

/** Whether the hook reports a run the reduced mount skipped. */
const ReducedCompletion = ({ initial }: { readonly initial?: number }) => {
  const { complete } = useMotion(100, tween(300), {
    initial,
    reducedMotion: true,
  });
  return <>{String(complete)}</>;
};

/** The mount state a surface paints from a timing a caller may have stored. */
const StoredTimingFrame = ({
  timing,
}: {
  readonly timing: PresenceTimingInput | null;
}) => {
  const presence = useSurfacePresence(true, timing);
  return <>{`${presence.mounted}:${String(presence.timing.exit.duration)}`}</>;
};

/** The tween hook's frame without an override, so the provider decides. */
const ProviderTWEENFrame = ({ initial }: { readonly initial?: number }) => {
  const { value, complete } = useTransition(
    100,
    { durationMs: 300 },
    { initial },
  );
  return <>{`${value}:${String(complete)}`}</>;
};

/** The coasting hook's frame without an override, so the provider decides. */
const ProviderCOASTFrame = () => {
  const { value } = useInertia(400, boundedCoast, { initial: 0 });
  return <>{String(value)}</>;
};

/** A hook whose caller overrides a provider that states the other preference. */
const OverriddenTWEENFrame = ({
  reducedMotion,
}: {
  readonly reducedMotion: boolean;
}) => {
  const { value } = useTransition(
    100,
    { durationMs: 300 },
    {
      initial: 0,
      reducedMotion,
    },
  );
  return <>{String(value)}</>;
};

/** The tween hook's frame from a spec a caller may have stored. */
const StoredSpecFrame = ({
  spec,
}: {
  readonly spec: { readonly durationMs?: number | null } | null;
}) => {
  const { value } = useTransition(100, spec, { initial: 0 });
  return <>{String(value)}</>;
};

describe("the preference the provider supplies", () => {
  it("is the frame a hook publishes when the caller states none", () => {
    // The defect: every physics hook read `options.reducedMotion` alone, while
    // the library publishes one `MotionProvider` for the whole tree and the
    // presence hooks beside them already read it. An application that wrapped
    // its tree for a reduced reader still got a count-up, a width tween and a
    // drag release from `useMotion`/`useTransition`/`useSpring`/`useInertia`
    // unless it repeated the flag at every call — the duplication the provider
    // exists to remove — and a coast drifted off the projection the reader was
    // promised.
    const reduced = (children: ReactNode) =>
      renderToStaticMarkup(
        <MotionProvider preference="reduced">{children}</MotionProvider>,
      );
    const animated = (children: ReactNode) =>
      renderToStaticMarkup(
        <MotionProvider preference="animated">{children}</MotionProvider>,
      );

    expect(reduced(<ProviderTWEENFrame initial={0} />)).toBe("100:true");
    expect(reduced(<Frame target={100} initial={0} />)).toBe("100");
    expect(reduced(<ProviderCOASTFrame />)).toBe("50");
    // The animated tree keeps the journey, and a tree with no provider moves.
    expect(animated(<ProviderTWEENFrame initial={0} />)).toBe("0:false");
    expect(renderToStaticMarkup(<ProviderTWEENFrame initial={0} />)).toBe(
      "0:false",
    );
  });

  it("yields to a hook's own override in both directions", () => {
    // The option is the per-run override, not a second state of the policy: a
    // decorative animation can be silenced in an animated tree, and one that
    // must move keeps moving under a reduced provider.
    expect(
      renderToStaticMarkup(
        <MotionProvider preference="reduced">
          <OverriddenTWEENFrame reducedMotion={false} />
        </MotionProvider>,
      ),
    ).toBe("0");
    expect(
      renderToStaticMarkup(
        <MotionProvider preference="animated">
          <OverriddenTWEENFrame reducedMotion />
        </MotionProvider>,
      ),
    ).toBe("100");
  });
});

describe("the spec a tween hook reads", () => {
  it("mounts from a value a caller may have stored", () => {
    // The defect: `useTransition` read `.durationMs` off the spec object, so a
    // config that decoded with no spec at all threw `TypeError: Cannot read
    // properties of null (reading 'durationMs')` out of the render that mounted
    // the hook, while its siblings repaired the declaration they were handed.
    // A spec the value does not name is the documented tween, so the hook
    // mounts and paints the start it was given.
    expect(renderToStaticMarkup(<StoredSpecFrame spec={null} />)).toBe("0");
    expect(
      renderToStaticMarkup(<StoredSpecFrame spec={{ durationMs: null }} />),
    ).toBe("0");
    // A readable spec keeps its own duration, and the start is still the start.
    expect(
      renderToStaticMarkup(<StoredSpecFrame spec={{ durationMs: 120 }} />),
    ).toBe("0");
  });
});

describe("the first published frame", () => {
  it("is the value the caller asked for", () => {
    expect(renderToStaticMarkup(<Frame target={100} initial={0} />)).toBe("0");
    expect(renderToStaticMarkup(<Frame target={100} initial={40} />)).toBe(
      "40",
    );
  });

  it("is the target when no initial is given", () => {
    // The documented default: a hook mounted at rest paints without an entry
    // run, so the first frame is the target itself.
    expect(renderToStaticMarkup(<Frame target={100} />)).toBe("100");
  });

  it("is a number the runtime can paint when the initial cannot be read", () => {
    // The defect: `NaN` reached the caller as the first frame.
    expect(
      renderToStaticMarkup(<Frame target={100} initial={Number.NaN} />),
    ).toBe("100");
  });

  it("is a number the runtime can paint when the target cannot be read", () => {
    expect(renderToStaticMarkup(<Frame target={Number.NaN} />)).not.toContain(
      "NaN",
    );
  });

  it("is the same for the tween hook", () => {
    expect(renderToStaticMarkup(<TWEENFrame target={100} initial={0} />)).toBe(
      "0",
    );
    expect(
      renderToStaticMarkup(<TWEENFrame target={100} initial={Number.NaN} />),
    ).toBe("100");
  });

  it("is the offset a coast accumulates from", () => {
    // The defect: `useInertia` took `MotionOptions` and dropped `initial`, so a
    // caller that handed the offset a gesture released at got a value that
    // started at zero. An offset it cannot read is no offset, the family's rule.
    expect(renderToStaticMarkup(<COASTFrame initial={40} />)).toBe("40");
    expect(renderToStaticMarkup(<COASTFrame />)).toBe("0");
    expect(renderToStaticMarkup(<COASTFrame initial={Number.NaN} />)).toBe("0");
  });

  it("is the resting frame under the reduced preference, not the start it skips", () => {
    // The preference removes the journey, not only its duration. A hook mounted
    // with `initial` under reduced published that start — for one commit, before
    // its effect completed the run — so a reduced count-up or width change
    // flashed the value it was supposed to arrive from. The first frame is the
    // frame the preference names: the target, or a coast's projected rest (400
    // × 350 ms clamped to 50 here).
    expect(
      renderToStaticMarkup(<ReducedFrame target={100} initial={0} />),
    ).toBe("100");
    expect(
      renderToStaticMarkup(<ReducedTWEENFrame target={100} initial={0} />),
    ).toBe("100");
    expect(renderToStaticMarkup(<ReducedCOASTFrame />)).toBe("50");
    // The skipped run still completes; a mount that asked for no journey does
    // not report one.
    expect(renderToStaticMarkup(<ReducedCompletion initial={0} />)).toBe(
      "true",
    );
    expect(renderToStaticMarkup(<ReducedCompletion initial={100} />)).toBe(
      "false",
    );
    expect(renderToStaticMarkup(<ReducedCompletion />)).toBe("false");
    // The animated control keeps the start: the preference is what changed.
    expect(renderToStaticMarkup(<Frame target={100} initial={0} />)).toBe("0");
  });
});

describe("the window a stored timing names", () => {
  it("mounts a surface whose timing carries no exit phase", () => {
    // The defect: `PresenceTiming` is structural and this hook projects the hold
    // window from `.exit` in its render, so a config that decoded without one
    // threw out of the render and the surface never mounted at all. A phase the
    // value does not name is no journey — an explicit zero duration, because an
    // empty transition is the renderer's own 300 ms default — which is also no
    // window.
    const stored = { enter: { duration: 0.32 } };
    expect(renderToStaticMarkup(<StoredTimingFrame timing={stored} />)).toBe(
      "true:0",
    );
    // A config that decoded with no object at all is no phase in either
    // direction, so the surface still mounts — the type says so, no cast.
    expect(renderToStaticMarkup(<StoredTimingFrame timing={null} />)).toBe(
      "true:0",
    );
    // A complete timing still reports the exit it names.
    expect(
      renderToStaticMarkup(
        <StoredTimingFrame timing={presenceTiming("normal")} />,
      ),
    ).toBe("true:0.2");
  });
});
