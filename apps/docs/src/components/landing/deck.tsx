/**
 * The hero deck: one platform window per desktop in `landingPlatformOrder`,
 * each running the **conversations block** in its own dress — macOS Messages,
 * Windows 11 Fluent and Linux Breeze — so each card is recognisably its
 * desktop.
 *
 * macOS and Windows show on the light palette, Linux on the dark one. The
 * shuffle pauses on hover; the stack is a clean fan with no rotation.
 *
 * Omarchy is not a fourth desktop: it is the Linux desktop following your own
 * theme, so its claims sit under the deck as four small cards instead of a
 * fourth window.
 */
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  type PlatformName,
  type Theme,
} from "@gpuixui/tokens";
import { toCssVars } from "../../lib/theme-css";
import { BlockIcon } from "../docs/block-icons";
import { ConversationWindow } from "../docs/conversations-block";
import {
  platforms,
  omarchyCards,
  countWord,
  landingLookCount,
  repo,
} from "./data";
import type { OmarchyIcon, Platform } from "./data";
import { usePrefersReducedMotion } from "./reduced-motion";

const SHUFFLE_MS = 1600;

/** The library's platform name for a landing card. */
const platformOfDesktop: Readonly<Record<Platform["id"], PlatformName>> = {
  macos: "darwin",
  windows: "win32",
  linux: "linux",
};

/** The theme a card paints: Linux on the dark palette, the others on light. */
const desktopTheme = (id: Platform["id"]): Theme =>
  platformTheme(id === "linux" ? darkTheme : lightTheme, platformOfDesktop[id]);

/** The card the shuffle raises next; a pure function so the wrap is testable. */
export const nextDesktop = (top: number): number =>
  (top + 1) % platforms.length;

/**
 * The recipe line: the five things GPUIxUI is made of, read as one equation.
 *
 * The hero says what the library looks like; this says what it is built from,
 * so a reader who knows shadcn or Base UI can place it before scrolling.
 */
export function LandingFormula() {
  const parts = ["GPUI", "React", "shadcn", "Base UI", "Tailwind"] as const;

  return (
    <p className="landing-formula">
      {parts.map((part, index) => (
        <Fragment key={part}>
          {index > 0 ? (
            <span aria-hidden="true" className="landing-formula-op">
              +
            </span>
          ) : null}
          <span className="landing-formula-part">{part}</span>
        </Fragment>
      ))}
      <span aria-hidden="true" className="landing-formula-op">
        =
      </span>
      <span className="landing-formula-result">GPUIxUI</span>
    </p>
  );
}

export function Hero() {
  const [top, setTop] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (paused || reduced) return;
    const timer = setInterval(() => setTop(nextDesktop), SHUFFLE_MS);
    return () => clearInterval(timer);
  }, [paused, reduced]);

  const select = (index: number) => {
    setTop(index);
    setPaused(true);
  };

  return (
    <header className="landing-hero">
      <h1 className="landing-title">
        One library.
        <br />
        {countWord(landingLookCount)} native <em>looks</em>.
      </h1>

      <p className="landing-sub">
        Components that run on GPUix, styled to feel at home on macOS, Windows
        11 and Linux — with the source in your hands.
      </p>

      <LandingFormula />

      <div className="landing-actions">
        <a className="landing-btn landing-btn-primary" href="/getting-started">
          Get started
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

      <div className="landing-switch-row">
        <PlatformSwitch onChange={select} value={top} />
      </div>

      <div
        className="landing-deck"
        onBlur={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {platforms.map((platform, index) => (
          <PlatformMini
            key={platform.id}
            platform={platform}
            position={(index - top + platforms.length) % platforms.length}
          />
        ))}
      </div>

      <OmarchyStrip />
    </header>
  );
}

/**
 * The four claims Omarchy makes, under the deck.
 *
 * They sit where the fourth desktop stood: same width as the deck, four small
 * cards in one row on a desktop and two columns on a phone.
 */
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
const DOCK_TONES = [
  "sky",
  "teal",
  "amber",
  "rose",
  "violet",
  "green",
  "graphite",
  "orange",
  "blue",
] as const;

const WINDOW_TONES = ["blue", "green", "amber", "sky"] as const;

/** One platform desktop, with the conversations block floating on it. */
function PlatformMini({
  platform,
  position,
}: {
  platform: Platform;
  position: number;
}) {
  const style = { ...toCssVars(desktopTheme(platform.id)) } as CSSProperties;

  return (
    <div
      className={`landing-window landing-desktop landing-desktop-${platform.chrome}`}
      data-desktop={platform.id}
      data-pos={position}
      style={style}
    >
      <span
        aria-hidden="true"
        className={`landing-wall landing-wall-${platform.chrome}`}
      />
      {platform.id === "macos" ? <MacMenuBar /> : null}
      {platform.id === "linux" ? <LinuxPanel /> : null}

      <div className="landing-desktop-stage">
        <ConversationWindow platform={platform.id} />
      </div>

      {platform.id === "windows" ? <WindowsTaskbar /> : null}
      {platform.id === "linux" ? <LinuxDock /> : null}
      {platform.id === "macos" ? <MacDock /> : null}
    </div>
  );
}

/** macOS: the thin menu bar and the translucent dock. */
function MacMenuBar() {
  return (
    <div aria-hidden="true" className="landing-menubar">
      <span className="landing-menubar-left">
        <AppleGlyph />
        <b>Finder</b>
        <span className="landing-menubar-menu">File</span>
        <span className="landing-menubar-menu">Edit</span>
        <span className="landing-menubar-menu">View</span>
      </span>
      <span className="landing-menubar-right">
        <WifiGlyph />
        <BatteryGlyph />
        <span>Mon 9:41 AM</span>
      </span>
    </div>
  );
}

function MacDock() {
  return (
    <div aria-hidden="true" className="landing-dock landing-dock-mac">
      {DOCK_TONES.map((tone) => (
        <i className="landing-dock-tile" data-tone={tone} key={tone} />
      ))}
      <span className="landing-dock-sep" />
      <i className="landing-dock-tile" data-tone="trash" />
    </div>
  );
}

/** Windows 11: the centred acrylic taskbar. */
function WindowsTaskbar() {
  return (
    <div aria-hidden="true" className="landing-taskbar">
      <span className="landing-taskbar-start">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="landing-taskbar-search">
        <BlockIcon name="search" size={11} />
        <span>Search</span>
      </span>
      <span className="landing-taskbar-apps">
        {WINDOW_TONES.map((tone) => (
          <i className="landing-dock-tile" data-tone={tone} key={tone} />
        ))}
      </span>
      <span className="landing-taskbar-clock">
        <b>10:32 AM</b>
        <span>10/26/2026</span>
      </span>
    </div>
  );
}

/** Linux: the top panel and the floating dock. */
function LinuxPanel() {
  return (
    <div aria-hidden="true" className="landing-lnx-panel">
      <span className="landing-lnx-panel-left">
        <b>Applications</b>
        <span>Tour</span>
      </span>
      <span className="landing-lnx-panel-clock">Sat, Nov 6 · 10:46 AM</span>
      <span className="landing-lnx-panel-tray">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function LinuxDock() {
  return (
    <div aria-hidden="true" className="landing-dock landing-dock-lnx">
      {DOCK_TONES.slice(0, 8).map((tone) => (
        <i className="landing-dock-tile" data-tone={tone} key={tone} />
      ))}
      <span className="landing-dock-sep" />
      <i className="landing-dock-tile" data-tone="trash" />
    </div>
  );
}

/** The menu bar's marks; the desktop is decoration, not iconography. */
function AppleGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="landing-menubar-glyph"
      viewBox="0 0 24 24"
    >
      <path
        d="M15.5 8.5c-1 0-2 .6-2.7.6-.8 0-1.7-.6-2.8-.6-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.6 2.1 2.8 2.1 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.1.5-.8.9-1.6 1.1-2.5-2.3-.9-2.7-4.2-.4-5.5-.8-1.4-2.2-2.4-3.6-2.4ZM14.6 6.8c.6-.8 1-1.8.9-2.8-1 .1-2.1.6-2.8 1.4-.6.7-1 1.7-.9 2.7 1 0 2.1-.5 2.8-1.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WifiGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="landing-menubar-glyph"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 9a12 12 0 0 1 16 0M7 12.5a8 8 0 0 1 10 0M10 16a3.5 3.5 0 0 1 4 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BatteryGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="landing-menubar-glyph"
      viewBox="0 0 26 24"
    >
      <rect
        fill="none"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
        width="18"
        x="2"
        y="7"
      />
      <rect fill="currentColor" height="6" rx="1" width="12" x="4" y="9" />
      <rect fill="currentColor" height="4" rx="1" width="2" x="21" y="10" />
    </svg>
  );
}

function PlatformSwitch({
  value,
  onChange,
}: {
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <fieldset className="landing-switch">
      <legend className="landing-sr">Choose platform</legend>
      {platforms.map((platform, index) => (
        <label
          className="landing-switch-option"
          data-active={index === value}
          key={platform.id}
        >
          <input
            checked={index === value}
            name="platform"
            onChange={() => onChange(index)}
            type="radio"
            value={platform.id}
          />
          <span>{platform.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
