import { useState } from "react";

export function RevealDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="gx-reveal">
      <div className="gx-reveal-stage">
        <p className="gx-reveal-content" key={run}>
          Automatic updates are on.
        </p>
      </div>
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setRun((current) => current + 1)}
        type="button"
      >
        Replay
      </button>
    </div>
  );
}

export const revealDemoSource = `import { Reveal } from "@gpuixui/components/reveal";

<Reveal>
  <text>Automatic updates are on.</text>
</Reveal>;

<Reveal open={showing} from="right">…</Reveal>;`;
