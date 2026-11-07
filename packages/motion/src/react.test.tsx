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
  useSpring,
  useSurfacePresence,
  useTransition,
} from "./react.js";

const coast = inertia();

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

const COASTFrame = ({ initial }: { readonly initial?: number }) => {
  const { value } = useInertia(400, coast, { initial });
  return <>{String(value)}</>;
};

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

const boundedCoast = inertia(350, { min: 0, max: 50 });

const ReducedCOASTFrame = () => {
  const { value } = useInertia(400, boundedCoast, {
    initial: 0,
    reducedMotion: true,
  });
  return <>{String(value)}</>;
};

const ReducedCompletion = ({ initial }: { readonly initial?: number }) => {
  const { complete } = useMotion(100, tween(300), {
    initial,
    reducedMotion: true,
  });
  return <>{String(complete)}</>;
};

const StoredTimingFrame = ({
  timing,
}: {
  readonly timing: PresenceTimingInput | null;
}) => {
  const presence = useSurfacePresence(true, timing);
  return <>{`${presence.mounted}:${String(presence.timing.exit.duration)}`}</>;
};

const ProviderTWEENFrame = ({ initial }: { readonly initial?: number }) => {
  const { value, complete } = useTransition(
    100,
    { durationMs: 300 },
    { initial },
  );
  return <>{`${value}:${String(complete)}`}</>;
};

const ProviderCOASTFrame = () => {
  const { value } = useInertia(400, boundedCoast, { initial: 0 });
  return <>{String(value)}</>;
};

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

const StoredSpecFrame = ({
  spec,
}: {
  readonly spec: { readonly durationMs?: number | null } | null;
}) => {
  const { value } = useTransition(100, spec, { initial: 0 });
  return <>{String(value)}</>;
};

const StoredOptionsFrame = () => {
  const motion = useMotion(100, tween(300), null);
  const spring = useSpring(100, undefined, null);
  const tweened = useTransition(100, { durationMs: 300 }, null);
  const coasted = useInertia(400, coast, null);
  return (
    <>{`${motion.value}:${spring.value}:${tweened.value}:${coasted.value}`}</>
  );
};

describe("the preference the provider supplies", () => {
  it("is the frame a hook publishes when the caller states none", () => {
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

    expect(animated(<ProviderTWEENFrame initial={0} />)).toBe("0:false");
    expect(renderToStaticMarkup(<ProviderTWEENFrame initial={0} />)).toBe(
      "0:false",
    );
  });

  it("yields to a hook's own override in both directions", () => {
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
    expect(renderToStaticMarkup(<StoredSpecFrame spec={null} />)).toBe("0");
    expect(
      renderToStaticMarkup(<StoredSpecFrame spec={{ durationMs: null }} />),
    ).toBe("0");

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
    expect(renderToStaticMarkup(<Frame target={100} />)).toBe("100");
  });

  it("is a number the runtime can paint when the initial cannot be read", () => {
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
    expect(renderToStaticMarkup(<COASTFrame initial={40} />)).toBe("40");
    expect(renderToStaticMarkup(<COASTFrame />)).toBe("0");
    expect(renderToStaticMarkup(<COASTFrame initial={Number.NaN} />)).toBe("0");
  });

  it("is the resting frame under the reduced preference, not the start it skips", () => {
    expect(
      renderToStaticMarkup(<ReducedFrame target={100} initial={0} />),
    ).toBe("100");
    expect(
      renderToStaticMarkup(<ReducedTWEENFrame target={100} initial={0} />),
    ).toBe("100");
    expect(renderToStaticMarkup(<ReducedCOASTFrame />)).toBe("50");

    expect(renderToStaticMarkup(<ReducedCompletion initial={0} />)).toBe(
      "true",
    );
    expect(renderToStaticMarkup(<ReducedCompletion initial={100} />)).toBe(
      "false",
    );
    expect(renderToStaticMarkup(<ReducedCompletion />)).toBe("false");

    expect(renderToStaticMarkup(<Frame target={100} initial={0} />)).toBe("0");
  });
});

describe("an options object a caller stored", () => {
  it("mounts every hook from the documented defaults when the store kept none", () => {
    expect(renderToStaticMarkup(<StoredOptionsFrame />)).toBe("100:100:100:0");

    expect(
      renderToStaticMarkup(
        <MotionProvider preference="reduced">
          <StoredOptionsFrame />
        </MotionProvider>,
      ),
    ).toBe("100:100:100:140");
  });
});

describe("the window a stored timing names", () => {
  it("mounts a surface whose timing carries no exit phase", () => {
    const stored = { enter: { duration: 0.32 } };
    expect(renderToStaticMarkup(<StoredTimingFrame timing={stored} />)).toBe(
      "true:0",
    );

    expect(renderToStaticMarkup(<StoredTimingFrame timing={null} />)).toBe(
      "true:0",
    );

    expect(
      renderToStaticMarkup(
        <StoredTimingFrame timing={presenceTiming("normal")} />,
      ),
    ).toBe("true:0.2");
  });
});
