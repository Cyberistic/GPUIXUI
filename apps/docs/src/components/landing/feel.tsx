/**
 * The feel strip (plan 727): five short loops, each a block driven by real
 * presses and keystrokes on the GPUix renderer and captured frame by frame
 * (`nub run --filter @gpuixui/blocks clip`). A reader who asks for less motion
 * gets each loop's first frame.
 */
import { usePrefersReducedMotion } from "./reduced-motion";

export const feelClips = [
  { id: "launcher", caption: "⌘K: type, and the results rank as you go" },
  { id: "pipeline", caption: "A stage strip, a chosen item, then the board" },
  { id: "viewer", caption: "A photo opens under a floating HUD" },
  { id: "preferences", caption: "Search the panes, flip a switch" },
  { id: "calendar", caption: "Calendars switch off, the week steps on" },
] as const;

export function Feel() {
  const reduced = usePrefersReducedMotion();
  return (
    <section className="landing-section" id="feel">
      <p className="landing-kicker">The feel</p>
      <h2 className="landing-h2">Real input, real frames.</h2>
      <p className="landing-lead">
        Each loop is a block under real presses and keystrokes, painted by the
        GPUix renderer — recorded, not mocked.
      </p>
      <div className="landing-feel">
        {feelClips.map((clip) => (
          <figure key={clip.id}>
            {reduced ? (
              <img
                alt={clip.caption}
                src={`/media/landing/feel-${clip.id}.jpg`}
              />
            ) : (
              <video
                aria-label={clip.caption}
                autoPlay
                loop
                muted
                playsInline
                poster={`/media/landing/feel-${clip.id}.jpg`}
                preload="metadata"
                src={`/media/landing/feel-${clip.id}.mp4`}
              />
            )}
            <figcaption>{clip.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
