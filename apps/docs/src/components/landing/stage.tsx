import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./reduced-motion";

/**
 * The stage: one window, one action, and the states the library ships.
 *
 * The section it replaces shrank a whole management console into a card, which
 * is the exact mistake a faux UI makes — every row real, every column packed,
 * the product unreadable at the size a homepage gives it. This stage crops to
 * the one thing the story needs: a deploy button, three services and the toast
 * that says it landed. The loop is real state, so pressing Deploy runs it again,
 * and reduced motion jumps to the last frame.
 */

type Phase = "idle" | "building" | "live" | "toast";

/** One beat each: the button, the build, the receipt, then the toast. */
const BEATS: ReadonlyArray<readonly [Phase, number]> = [
  ["idle", 1500],
  ["building", 1700],
  ["live", 900],
  ["toast", 1800],
];

const statusOf = (phase: Phase): string =>
  phase === "idle" ? "Ready" : phase === "building" ? "Building" : "Live";

const SERVICES = [
  { name: "api", meta: "2 replicas" },
  { name: "web", meta: "edge" },
  { name: "workers", meta: "queue" },
] as const;

export function Stage() {
  const reduced = usePrefersReducedMotion();
  const [beat, setBeat] = useState(0);
  const phase = BEATS[beat]?.[0] ?? "idle";

  useEffect(() => {
    if (reduced) return undefined;
    const timer = setTimeout(
      () => setBeat((index) => (index + 1) % BEATS.length),
      BEATS[beat]?.[1] ?? 1500,
    );
    return () => clearTimeout(timer);
  }, [beat, reduced]);

  const restart = () => {
    setBeat(reduced ? BEATS.length - 1 : 1);
  };

  return (
    <section className="landing-section landing-stage-section" id="stage">
      <p className="landing-kicker">The stage</p>
      <h2 className="landing-h2">Press deploy. Watch it ship.</h2>
      <p className="landing-lead">
        One window, one action. Progress, status rows and a toast are the
        library&apos;s own parts — the same tree a native window draws.
      </p>

      <figure className="landing-stage" data-phase={phase}>
        <div className="landing-stage-window">
          <div className="landing-stage-bar">
            <span aria-hidden="true" className="landing-stage-lights">
              <i />
              <i />
              <i />
            </span>
            <span className="landing-stage-title">gpuixui — production</span>
            <span className="landing-stage-status" data-state={phase}>
              {statusOf(phase)}
            </span>
          </div>

          <div className="landing-stage-head">
            <span>Deploys</span>
            <span className="landing-stage-branch">main</span>
          </div>

          <ul className="landing-stage-rows">
            {SERVICES.map((service) => (
              <li className="landing-stage-row" key={service.name}>
                <i aria-hidden="true" className="landing-stage-dot" />
                <span className="landing-stage-name">{service.name}</span>
                <span className="landing-stage-meta">{service.meta}</span>
              </li>
            ))}
          </ul>

          <div
            aria-hidden="true"
            className="landing-stage-progress"
            data-state={phase}
          >
            <span />
          </div>

          <div className="landing-stage-foot">
            <button
              className="landing-btn landing-btn-primary landing-stage-button"
              onClick={restart}
              type="button"
            >
              Deploy
            </button>
            <span className="landing-stage-hint">production · main</span>
          </div>
        </div>

        <div aria-live="polite" className="landing-stage-toast" role="status">
          <b>Deployed</b> api, web and workers in 42s
        </div>
      </figure>

      <figcaption className="landing-stage-caption">
        A browser stage of the native tree: the deploy states the library
        paints, cropped to what the action changes.
      </figcaption>
    </section>
  );
}
