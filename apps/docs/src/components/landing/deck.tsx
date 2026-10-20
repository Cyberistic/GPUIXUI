import { useEffect, useState } from "react";
import { platforms, repo } from "./data";
import type { Platform } from "./data";

const SHUFFLE_MS = 1600;

/**
 * The hero: a centered headline with actions, then the platform switch as the
 * control for the deck, and the deck as a single dialog window that shuffles
 * between the three platform looks. Owns the shuffle state so the switch and
 * the deck stay in sync.
 */
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
          <PlatformWindow
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
 * One dialog window in a platform's chrome. The dialog itself is the window —
 * no outer shell. Used by the hero deck (shuffled) and the defaults section
 * (side by side).
 */
export function PlatformWindow({
  platform,
  position,
}: {
  platform: Platform;
  position?: number;
}) {
  return (
    <div
      className={`landing-window landing-window-${platform.chrome}`}
      data-pos={position}
    >
      <Bar platform={platform} />
      <div className="landing-dialog">
        <p className="landing-dialog-title">Rename component</p>
        <p className="landing-dialog-desc">
          This name is shown in the component tree.
        </p>
        <div className="landing-field">ComponentName</div>
        <div className="landing-dialog-actions">
          <span className="landing-dialog-btn">Cancel</span>
          <span className="landing-dialog-btn landing-dialog-btn-primary">
            Rename
          </span>
        </div>
      </div>
      <span className="landing-badge">{platform.label} · default</span>
    </div>
  );
}

function Bar({ platform }: { platform: Platform }) {
  const title = <span className="landing-bar-title">Rename component</span>;
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
