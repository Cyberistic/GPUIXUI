import { describe, expect, it } from "vitest";
import { inertia, layoutSpring, springPhysics } from "@gpuixui/motion";
import { useInertia, useSpring } from "@gpuixui/motion/react";
import { after, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

const paints = { count: 0 };

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

const InlineCoast = ({ release }: { readonly release: number }) => {
  paints.count += 1;
  const { value } = useInertia(release, inertia(350, { max: 60 }));
  return <text testId="inline-coast">{String(value)}</text>;
};

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

const RestedCoast = ({
  release,
  reduced,
}: {
  readonly release: number;
  readonly reduced: boolean;
}) => {
  const { value, velocity, complete } = useInertia(release, inertia(50), {
    initial: 0,
    reducedMotion: reduced,
  });
  return (
    <text testId="rested-coast">{`${value}:${velocity}:${complete}`}</text>
  );
};

const ToggledCoast = ({
  release,
  reduced,
}: {
  readonly release: number;
  readonly reduced: boolean;
}) => {
  const { value, velocity, complete } = useInertia(release, inertia(50), {
    initial: 0,
    reducedMotion: reduced,
  });
  return (
    <text testId="toggled-coast">{`${value}:${velocity}:${complete}`}</text>
  );
};

const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

describe("the motion hooks", () => {
  it("stops sampling a spring whose physics are built on every render", async () => {
    paints.count = 0;
    const page = renderComponent(<InlineSpring target={100} />);
    try {
      await waitFor(() => expect(painted(page)).toBe("100"));

      const rested = paints.count;
      await after(120);
      expect(paints.count).toBe(rested);

      expect(rested).toBeLessThan(200);
    } finally {
      page.unmount();
    }
  });

  it("stops sampling a coast whose inertia is built on every render", async () => {
    paints.count = 0;
    const page = renderComponent(<InlineCoast release={400} />);
    try {
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
    const page = renderComponent(<ReducedCoast release={400} reduced />);
    try {
      expect(painted(page)).toBe("140:0:true");
      page.rerender(<ReducedCoast release={300} reduced />);
      expect(painted(page)).toBe("245:0:true");
    } finally {
      page.unmount();
    }
  });

  it("starts a reduced release from the frame on screen after a coast", async () => {
    const page = renderComponent(<RestedCoast release={400} reduced={false} />);
    try {
      await waitFor(() => expect(painted(page)).toBe("20:0:true"));
      page.rerender(<RestedCoast release={300} reduced />);
      expect(painted(page)).toBe("35:0:true");
    } finally {
      page.unmount();
    }
  });

  it("holds the frame on screen for a reduced release of zero after a coast", async () => {
    const page = renderComponent(<RestedCoast release={400} reduced={false} />);
    try {
      await waitFor(() => expect(painted(page)).toBe("20:0:true"));
      page.rerender(<RestedCoast release={0} reduced />);
      expect(painted(page)).toBe("20:0:true");
    } finally {
      page.unmount();
    }
  });

  it("paints the resting frame in the commit the preference turns on", () => {
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
    const page = renderComponent(<ReducedTarget target={100} reduced />);
    try {
      expect(painted(page)).toBe("100:0:false");
    } finally {
      page.unmount();
    }
  });

  it("holds the frame on screen when a reduced target cannot be read", () => {
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
    const page = renderComponent(
      <ReducedTarget target={Number.NaN} initial={8} reduced />,
    );
    try {
      expect(painted(page)).toBe("0:0:false");
    } finally {
      page.unmount();
    }
  });

  it("does not relaunch a coast whose journey the reduced preference ended", async () => {
    const page = renderComponent(<ToggledCoast release={400} reduced />);
    try {
      expect(painted(page)).toBe("20:0:true");
      page.rerender(<ToggledCoast release={400} reduced={false} />);
      await after(150);
      expect(painted(page)).toBe("20:0:false");
    } finally {
      page.unmount();
    }
  });

  it("holds an ended coast rather than projecting it again", async () => {
    const page = renderComponent(<ToggledCoast release={400} reduced />);
    try {
      expect(painted(page)).toBe("20:0:true");
      page.rerender(<ToggledCoast release={400} reduced={false} />);
      await after(60);
      page.rerender(<ToggledCoast release={400} reduced />);
      expect(painted(page)).toBe("20:0:false");
    } finally {
      page.unmount();
    }
  });

  it("starts a new release from the frame an ended coast rests on", async () => {
    const page = renderComponent(<ToggledCoast release={400} reduced />);
    try {
      expect(painted(page)).toBe("20:0:true");
      page.rerender(<ToggledCoast release={400} reduced={false} />);
      await after(60);
      page.rerender(<ToggledCoast release={300} reduced={false} />);
      await waitFor(() => expect(painted(page)).toBe("35:0:true"));
    } finally {
      page.unmount();
    }
  });

  it("holds the frame a reduced coast reached when the release cannot be read", () => {
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
