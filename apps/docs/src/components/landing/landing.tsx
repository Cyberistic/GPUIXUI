import { useState, type CSSProperties } from "react";
import { useTheme } from "fumadocs-ui/provider/base";
import { flushSync } from "react-dom";
import { lightTheme, platformTheme, type PlatformName } from "@gpuixui/tokens";
import { HighlightedCode } from "@/components/highlighted-code";
import { toCssVars } from "../../lib/theme-css";
import { mainContentId } from "../skip-link";
import { Hero, PlatformSwitch } from "./deck";
import { Lineage } from "./lineage";
import { Stage } from "./stage";
import { Terminal } from "./terminal";
import { demos } from "../docs/demos";
import { DashboardRender } from "../docs/dashboard";
import { navLinks, platforms, repo } from "./data";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <Nav />
        <main id={mainContentId} tabIndex={-1}>
          <Hero />
          <Lineage />
          <Dashboard />
          <Stage />
          <Terminal />
          <CodeAndComponent />
          <Footer />
        </main>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <nav className="landing-nav">
      <a className="landing-brand" href="/">
        <span aria-hidden="true" className="landing-mark" />
        GPUIxUI
      </a>
      <div className="landing-nav-links">
        {navLinks.map((link) => (
          <a href={link.href} key={link.label}>
            {link.label}
          </a>
        ))}
      </div>
      <div className="landing-nav-right">
        <ThemeToggle />
        <a className="landing-nav-cta" href="/getting-started">
          Getting started
        </a>
      </div>
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  // The two icons are always in the DOM; CSS shows the relevant one from the
  // `.dark` class on <html>. Rendering both keeps the server and client markup
  // identical, so the button hydrates cleanly. The class swap runs inside a
  // view transition so the circle-blur mask animates the repaint; browsers
  // without the API fall back to an instant switch.
  const toggle = () => {
    const next = dark ? "light" : "dark";
    const swap = () => flushSync(() => setTheme(next));
    if (!document.startViewTransition) return swap();
    void document.startViewTransition(swap);
  };

  return (
    <button
      aria-label="Toggle theme"
      className="landing-theme-toggle"
      onClick={toggle}
      title="Toggle theme"
      type="button"
    >
      <SunIcon />
      <MoonIcon />
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="landing-icon-sun"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="landing-icon-moon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** The library's platform name for a landing card. */
const platformOfDesktop: Readonly<Record<string, PlatformName>> = {
  macos: "darwin",
  windows: "win32",
  linux: "linux",
};

export function Dashboard() {
  const [top, setTop] = useState(0);
  const platform = platforms[top]?.id ?? "macos";
  const style = {
    ...toCssVars(
      platformTheme(lightTheme, platformOfDesktop[platform] ?? "darwin"),
    ),
  } as CSSProperties;

  return (
    <section
      className="landing-section landing-dashboard-section"
      id="dashboard"
    >
      <p className="landing-kicker">The product</p>
      <h2 className="landing-h2">Build native-looking apps.</h2>
      <p className="landing-lead">
        A dashboard composed from the library&apos;s parts — cards, badges,
        progress, search and charts. Switch the platform to wear each
        desktop&apos;s own metrics: the same tree, restyled.
      </p>
      <div className="landing-switch-row">
        <PlatformSwitch onChange={setTop} value={top} />
      </div>
      <div className="landing-dashboard" style={style}>
        <DashboardRender />
      </div>
    </section>
  );
}

export function CodeAndComponent() {
  const demo = demos["tabs-demo"];
  if (demo === undefined) {
    throw new Error('CodeAndComponent: no demo named "tabs-demo"');
  }
  // A demo is an element, not a call: `demo.render()` would run its hooks as
  // this section's own.
  const Drawing = demo.render;

  return (
    <section className="landing-section" id="code">
      <p className="landing-kicker">Code, rendered</p>
      <h2 className="landing-h2">Your agent already knows the syntax.</h2>
      <p className="landing-lead">It&apos;s just shadcn!</p>

      <div className="landing-code">
        <HighlightedCode lang="tsx" code={demo.source} />
        <div className="landing-code-preview">
          {/* The landing sits outside a `PreviewSurface`, so the scene needs the
              dark defaults `gx-base` carries; on a docs page the surface does. */}
          <div className="gx-base gx-demo">
            <Drawing />
          </div>
        </div>
      </div>

      <p className="landing-code-caption">
        <a href="/components/tabs">Tabs</a> — a compound-part component; browser
        preview of the native geometry and palette.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <span>
        GPUIxUI — shadcn/ui&apos;s composition, Base UI&apos;s behaviour and
        Tailwind&apos;s syntax, drawn by GPUI.
      </span>
      <a href={repo} rel="noopener noreferrer" target="_blank">
        source
      </a>
    </footer>
  );
}
