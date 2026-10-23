/**
 * The hero deck: one platform window per desktop in `landingPlatformOrder`,
 * each running the **conversations block** in its own dress — macOS Messages,
 * Windows 11 Fluent, Linux Breeze and Omarchy's Tokyo Night look — so each card
 * is recognisably its desktop.
 *
 * macOS and Windows show on the light palette, Linux and Omarchy on the dark
 * one. The shuffle pauses on hover; the stack is a clean fan with no rotation.
 */
import { useEffect, useState, type CSSProperties } from "react";
import {
  applyStyle,
  darkTheme,
  lightTheme,
  platformTheme,
  retroStyles,
  themes,
  type PlatformName,
  type Theme,
} from "@gpuixui/tokens";
import { toCssVars } from "../../lib/theme-css";
import { BlockIcon } from "../docs/block-icons";
import { ConversationWindow } from "../docs/conversations-block";
import { platforms, countWord, landingLookCount, repo } from "./data";
import type { Platform } from "./data";

const SHUFFLE_MS = 1600;

/** The library's platform name for a landing card. Omarchy rides Linux. */
const platformOfDesktop: Readonly<Record<Platform["id"], PlatformName>> = {
  macos: "darwin",
  windows: "win32",
  linux: "linux",
  omarchy: "linux",
};

/**
 * The theme a card paints.
 *
 * Omarchy is the one card that is a look rather than a platform variant: its
 * bubbles, selection and radii are `retroStyles.omarchy` applied over the Linux
 * dark base, so the deck shows the Tokyo Night palette rather than Breeze.
 */
const desktopTheme = (id: Platform["id"]): Theme =>
  id === "omarchy"
    ? applyStyle(platformTheme(themes.dark, "linux"), retroStyles.omarchy)
    : platformTheme(
        id === "linux" ? darkTheme : lightTheme,
        platformOfDesktop[id],
      );

/** The card the shuffle raises next; a pure function so the wrap is testable. */
export const nextDesktop = (top: number): number =>
  (top + 1) % platforms.length;

export function Hero() {
  const [top, setTop] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

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
        11, Linux and Omarchy — with the source in your hands.
      </p>

      <p className="landing-omarchy-note">
        Omarchy reads your active theme and re-applies it live when{" "}
        <code>omarchy-theme-set</code> runs.
      </p>

      <div className="landing-actions">
        <a
          className="landing-btn landing-btn-primary"
          href="/docs/getting-started"
        >
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
    </header>
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

/** Omarchy's dock: the look's accent, brand green and status roles, one each. */
const OMARCHY_TONES = [
  "accent",
  "accent-soft",
  "success",
  "info",
  "warning",
] as const;

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
        className={`landing-wall landing-wall-${platform.wall}`}
      />
      {platform.id === "macos" ? <MacMenuBar /> : null}
      {platform.id === "linux" ? <LinuxPanel /> : null}
      {platform.id === "omarchy" ? (
        <span className="landing-omarchy-chip">
          Omarchy · follows your theme
        </span>
      ) : null}

      <div className="landing-desktop-stage">
        <ConversationWindow platform={platform.id} />
      </div>

      {platform.id === "windows" ? <WindowsTaskbar /> : null}
      {platform.id === "linux" ? <LinuxDock /> : null}
      {platform.id === "omarchy" ? <OmarchyDock /> : null}
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

/** Omarchy: a flat dock of near-square tiles in the look's accent. */
function OmarchyDock() {
  return (
    <div aria-hidden="true" className="landing-dock landing-dock-omarchy">
      {OMARCHY_TONES.map((tone) => (
        <i className="landing-dock-tile" data-tone={tone} key={tone} />
      ))}
      <span className="landing-dock-sep" />
      <i className="landing-dock-tile" data-tone="dim" />
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
