/**
 * The desktops section: the same pipeline block captured from the native
 * renderer in the macOS, Windows 11 and Linux styles — real GPUix frames, not
 * HTML reproductions — behind a platform switch, with the Omarchy claims under
 * it. Omarchy is not a fourth desktop: it is Linux following your own theme.
 */
import { useState } from "react";
import { omarchyCards, platforms } from "./data";
import type { OmarchyIcon } from "./data";

/** The captures `nub run --filter @gpuixui/blocks capture` wrote, by platform. */
const shotOf: Readonly<Record<(typeof platforms)[number]["id"], string>> = {
  macos: "/media/landing/desktop-darwin.webp",
  windows: "/media/landing/desktop-win32.webp",
  linux: "/media/landing/desktop-linux.webp",
};

export function Desktops() {
  const [shown, setShown] = useState<(typeof platforms)[number]["id"]>("macos");
  return (
    <section className="landing-section landing-desktops" id="desktops">
      <p className="landing-kicker">Every desktop</p>
      <h2 className="landing-h2">The same tree, at home everywhere.</h2>
      <p className="landing-lead">
        Mac first — and the same components wear Windows 11 and Linux, or follow
        your Omarchy theme.
      </p>
      <div className="landing-switch" role="tablist" aria-label="Desktop">
        {platforms.map((platform) => (
          <button
            aria-selected={platform.id === shown}
            className="landing-switch-option"
            data-active={platform.id === shown}
            key={platform.id}
            onClick={() => setShown(platform.id)}
            role="tab"
            type="button"
          >
            <span>{platform.label}</span>
          </button>
        ))}
      </div>
      <figure className="landing-desktop-shot">
        <img
          alt={`The pipeline block in the ${shown} style, captured from the native renderer`}
          height={700}
          src={shotOf[shown]}
          width={1100}
        />
        <figcaption>
          Captured from the GPUix renderer, offscreen — no window server, so no
          blur or window buttons.
        </figcaption>
      </figure>
      <OmarchyStrip />
    </section>
  );
}

function OmarchyStrip() {
  return (
    <div className="landing-omarchy">
      <ul className="landing-omarchy-cards">
        {omarchyCards.map((card) => (
          <li
            className="landing-omarchy-card"
            data-icon={card.icon}
            key={card.title}
          >
            <span aria-hidden="true" className="landing-omarchy-glyph">
              <OmarchyGlyph name={card.icon} />
            </span>
            <h2 className="landing-omarchy-title">{card.title}</h2>
            <p className="landing-omarchy-body">{card.body}</p>
          </li>
        ))}
      </ul>
      <p className="landing-omarchy-note">
        Omarchy re-applies the palette live whenever{" "}
        <code>omarchy-theme-set</code> runs.
      </p>
    </div>
  );
}

/** One card's mark: a palette, a terminal, code brackets, a chip. */
function OmarchyGlyph({ name }: { name: OmarchyIcon }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width="18"
    >
      {name === "palette" ? (
        <>
          <path d="M12 3a9 9 0 1 0 0 18h1.2a1.9 1.9 0 0 0 0-3.8h-.7a2.6 2.6 0 0 1 0-5.2H17a4 4 0 0 0 0-8h-5Z" />
          <circle cx="8" cy="9" r="1" />
          <circle cx="12.5" cy="7" r="1" />
          <circle cx="7.5" cy="14.5" r="1" />
        </>
      ) : null}
      {name === "terminal" ? (
        <>
          <rect height="16" rx="2" width="20" x="2" y="4" />
          <path d="m6 9 3 3-3 3M13 15h4" />
        </>
      ) : null}
      {name === "code" ? (
        <>
          <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
          <path d="m13 4-2 16" />
        </>
      ) : null}
      {name === "gpu" ? (
        <>
          <rect height="10" rx="2" width="10" x="7" y="7" />
          <path d="M10 2v5M14 2v5M10 17v5M14 17v5M2 10h5M2 14h5M17 10h5M17 14h5" />
        </>
      ) : null}
    </svg>
  );
}

/**
 * The desktop's app tiles. Decorative only: the dock and taskbar are
 * illustration, not controls.
 */
