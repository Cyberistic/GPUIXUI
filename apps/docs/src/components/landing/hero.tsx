/**
 * The landing's hero (plan 727): one line, the calls to action, and real
 * native footage — the launch film's take of one block tree restyled from
 * macOS to Windows 11 and Linux, captured frame by frame from GPUix windows
 * (`media/launch`). A reader who asks for less motion gets its poster.
 */
import { repo } from "./data";
import { usePrefersReducedMotion } from "./reduced-motion";

export const heroMedia = {
  mp4: "/media/landing/hero.mp4",
  webm: "/media/landing/hero.webm",
  poster: "/media/landing/hero-poster.jpg",
  label:
    "A native GPUix window: one kanban tree restyled from macOS to Windows 11 and Linux",
} as const;

export function Hero() {
  const reduced = usePrefersReducedMotion();
  return (
    <header className="landing-hero">
      <h1 className="landing-title">
        Native Mac apps,
        <br />
        written in <em>React</em>.
      </h1>
      <p className="landing-sub">
        shadcn&apos;s API, drawn on the GPU by GPUI. No DOM, no Electron — a
        vibrant sidebar, a unified toolbar and the system accent, from the same
        components on Windows and Linux.
      </p>
      <div className="landing-actions">
        <a className="landing-btn landing-btn-primary" href="/getting-started">
          Get started
        </a>
        <a className="landing-btn landing-btn-ghost" href="/blocks/pipeline">
          See a block
        </a>
        <a
          className="landing-btn landing-btn-ghost"
          href={repo}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </div>
      <figure className="landing-film">
        {reduced ? (
          <img alt={heroMedia.label} src={heroMedia.poster} />
        ) : (
          <video
            aria-label={heroMedia.label}
            autoPlay
            loop
            muted
            playsInline
            poster={heroMedia.poster}
            preload="metadata"
          >
            <source src={heroMedia.webm} type="video/webm" />
            <source src={heroMedia.mp4} type="video/mp4" />
          </video>
        )}
        <figcaption>
          Captured from GPUix windows, frame by frame — not a browser.
        </figcaption>
      </figure>
    </header>
  );
}
