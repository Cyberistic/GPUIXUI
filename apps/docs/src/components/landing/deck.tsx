/**
 * The hero deck: three platform windows, each a miniature of the dashboard and
 * painted from that platform's own theme (families, roles, radius, density),
 * so macOS, Windows 11 and Linux look like themselves rather than one skin.
 *
 * The shuffle pauses on hover; the stack is a clean fan with no rotation, so
 * nothing drifts off the baseline.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { darkTheme, platformTheme, type PlatformName } from "@gpuixui/tokens";
import { toCssVars } from "../../lib/theme-css";
import { platforms, repo } from "./data";
import type { Platform } from "./data";

const SHUFFLE_MS = 1600;

/** The library's platform name for a landing card. */
const platformName = (id: Platform["id"]): PlatformName =>
  id === "macos" ? "darwin" : id === "windows" ? "win32" : "linux";

/** The UI family each system is recognised by, on any host. */
const FAMILY: Readonly<Record<Platform["chrome"], string>> = {
  mac: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
  win: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  lnx: 'Cantarell, "Ubuntu", "Noto Sans", system-ui, sans-serif',
};

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
        <a className="landing-btn landing-btn-primary" href="/docs/getting-started">
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
        data-paused={paused}
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

/** One mini dashboard in a platform's chrome and palette. */
function PlatformMini({
  platform,
  position,
}: {
  platform: Platform;
  position: number;
}) {
  const theme = platformTheme(darkTheme, platformName(platform.id));
  const style = {
    ...toCssVars(theme),
    "--font-sans": FAMILY[platform.chrome],
    "--radius-window": `${theme.radius.lg}px`,
  } as CSSProperties;

  return (
    <div
      className={`landing-window landing-window-${platform.chrome}`}
      data-pos={position}
      style={style}
    >
      <Bar platform={platform} />
      <div className="landing-mini">
        <aside className="landing-mini-side">
          <span className="landing-mini-brand">HA</span>
          {["Overview", "Projects", "Nen", "Reports"].map((item, index) => (
            <span
              className="landing-mini-nav"
              data-active={index === 0}
              key={item}
            >
              {item}
            </span>
          ))}
        </aside>
        <div className="landing-mini-main">
          <div className="landing-mini-head">
            <span className="landing-mini-name">Hunter Association</span>
            <span className="landing-mini-pill">7h 42m</span>
          </div>
          <div className="landing-mini-grid">
            <div className="landing-mini-card">
              <span className="landing-mini-label">Total time</span>
              <span className="landing-mini-value">7h 42m</span>
              <div className="landing-mini-bars" aria-hidden="true">
                {[9, 14, 11, 18, 22, 13, 16].map((height, index) => (
                  <i key={index} style={{ height }} />
                ))}
              </div>
            </div>
            <div className="landing-mini-card">
              <span className="landing-mini-label">Token usage</span>
              <span className="landing-mini-value">1.24M</span>
              <div className="landing-mini-donut" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <span className="landing-badge">{platform.label} · default</span>
    </div>
  );
}

function Bar({ platform }: { platform: Platform }) {
  const title = <span className="landing-bar-title">Hunter Association</span>;
  const chrome = <Chrome kind={platform.chrome} />;

  return platform.chrome === "mac" ? (
    <div className="landing-bar landing-bar-mac">
      {chrome}
      {title}
    </div>
  ) : (
    <div className="landing-bar landing-bar-glyphs">
      {title}
      {chrome}
    </div>
  );
}

function Chrome({ kind }: { kind: Platform["chrome"] }) {
  if (kind === "mac") {
    return (
      <span aria-hidden="true" className="landing-chrome landing-chrome-mac">
        <i />
        <i />
        <i />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="landing-chrome landing-chrome-glyphs">
      <i>–</i>
      <i>□</i>
      <i>×</i>
    </span>
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
