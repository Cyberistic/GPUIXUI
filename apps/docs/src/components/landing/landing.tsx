import { useTheme } from "fumadocs-ui/provider/base";
import { flushSync } from "react-dom";
import { HighlightedCode } from "@/components/highlighted-code";
import { mainContentId } from "../skip-link";
import { BlocksStrip } from "./blocks-strip";
import { Desktops } from "./deck";
import { Feel } from "./feel";
import { Hero } from "./hero";
import { Proof } from "./proof";
import { demos } from "../docs/demos";
import { navLinks, repo } from "./data";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <Nav />
        <main id={mainContentId} tabIndex={-1}>
          <Hero />
          <Proof />
          <Feel />
          <BlocksStrip />
          <CodeAndComponent />
          <Desktops />
          <RunItLive />
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

function RunItLive() {
  return (
    <section className="landing-section landing-live" id="live">
      <h2 className="landing-h2">Run the renderer in this tab.</h2>
      <p className="landing-lead">
        GPUix&apos;s own WebAssembly build paints a library control in your
        browser — the real renderer, not a reproduction.
      </p>
      <a className="landing-btn landing-btn-ghost" href="/live">
        Open the live surface (19 MB)
      </a>
    </section>
  );
}

function CodeAndComponent() {
  const demo = demos["segmented-control-demo"];
  if (demo === undefined) {
    throw new Error('CodeAndComponent: no demo named "segmented-control-demo"');
  }
  // A demo is an element, not a call: `demo.render()` would run its hooks as
  // this section's own.
  const Drawing = demo.render;

  return (
    <section className="landing-section" id="code">
      <p className="landing-kicker">Code, rendered</p>
      <h2 className="landing-h2">The code and the component.</h2>
      <p className="landing-lead">
        The API you read is the API you ship. A Mac segmented control — the
        arrows select as they move — next to the component it renders.
      </p>

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
        <a href="/components/segmented-control">Segmented control</a> — browser
        preview of the native geometry and palette.
      </p>
    </section>
  );
}

/** The maker's line at the very bottom of the landing. */
export const credit = {
  handle: "@sudo_kw",
  href: "https://sudokw.com",
} as const;

function Footer() {
  return (
    <footer className="landing-footer">
      <span>
        GPUIxUI — shadcn/ui&apos;s composition, Base UI&apos;s behaviour and
        Tailwind&apos;s syntax, drawn by GPUI.
      </span>
      <a href={repo} rel="noopener noreferrer" target="_blank">
        Source
      </a>
      <p className="landing-credit">
        Made with ☕ by{" "}
        <a href={credit.href} rel="noopener noreferrer" target="_blank">
          {credit.handle}
        </a>
      </p>
    </footer>
  );
}
