/**
 * The hero deck: three platform windows, each running the **conversations
 * block** in its own dress — macOS Messages, Windows 11 Fluent and Linux
 * Breeze — so each card is recognisably its platform.
 *
 * macOS and Windows show on the light palette, Linux on the dark one. The
 * shuffle pauses on hover; the stack is a clean fan with no rotation.
 */
import { useEffect, useState, type CSSProperties } from "react";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  type PlatformName,
} from "@gpuixui/tokens";
import { toCssVars } from "../../lib/theme-css";
import { ConversationWindow } from "../docs/conversations-block";
import { platforms, repo } from "./data";
import type { Platform } from "./data";

const SHUFFLE_MS = 1600;

/** The library's platform name for a landing card. */
const platformName = (id: Platform["id"]): PlatformName =>
  id === "macos" ? "darwin" : id === "windows" ? "win32" : "linux";

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
    const timer = setInterval(
      () => setTop((t) => (t + 1) % platforms.length),
      SHUFFLE_MS,
    );
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
        Three native <em>looks</em>.
      </h1>

      <p className="landing-sub">
        Components that run on GPUix, styled to feel at home on macOS, Windows
        11 and Linux — with the source in your hands.
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

/** One platform window, showing the conversations block in that theme. */
function PlatformMini({
  platform,
  position,
}: {
  platform: Platform;
  position: number;
}) {
  const palette = platform.id === "linux" ? darkTheme : lightTheme;
  const theme = platformTheme(palette, platformName(platform.id));
  const style = { ...toCssVars(theme) } as CSSProperties;

  return (
    <div
      className={`landing-window landing-window-${platform.chrome}`}
      data-pos={position}
      style={style}
    >
      <ConversationWindow platform={platform.id} />
    </div>
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
