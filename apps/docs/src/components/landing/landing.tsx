import { useTheme } from "fumadocs-ui/provider/base";
import { flushSync } from "react-dom";
import { HighlightedCode } from "@/components/highlighted-code";
import { mainContentId } from "../skip-link";
import { Hero } from "./deck";
import { Lineage } from "./lineage";
import { Terminal } from "./terminal";
import { demos } from "../docs/demos";
import { Showcase } from "./showcase";
import { resolvePlatformTheme } from "@/lib/platform";
import { previewFontStack } from "@/lib/fonts";
import { toCssVars } from "@/lib/theme-css";
import { navLinks, repo } from "./data";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <Nav />
        <main id={mainContentId} tabIndex={-1}>
          <Hero />
          <Lineage />
          <Dashboard />
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

export function LandingScene({
  platform,
  primary,
  primaryForeground,
  mode,
  className,
  children,
}: {
  readonly platform: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly mode: "light" | "dark";
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  const name =
    platform === "windows"
      ? "win32"
      : platform === "linux"
        ? "linux"
        : "darwin";
  const theme = resolvePlatformTheme(name, mode);
  return (
    <div
      className={className === undefined ? "gx-demo" : `gx-demo ${className}`}
      style={
        {
          ...toCssVars(theme),
          "--font-sans": previewFontStack(theme, name),
          "--primary": primary,
          "--primary-foreground": primaryForeground,
          "--ring": primary,
          "--radius": `${theme.radius.md}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function LandingDemo({
  id,
  platform,
  primary,
  primaryForeground,
  mode,
}: {
  readonly id: string;
  readonly platform: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly mode: "light" | "dark";
}) {
  const demo = demos[id];
  if (demo === undefined) throw new Error(`LandingDemo: no demo named "${id}"`);
  const Drawing = demo.render;
  return (
    <LandingScene
      mode={mode}
      platform={platform}
      primary={primary}
      primaryForeground={primaryForeground}
    >
      <Drawing />
    </LandingScene>
  );
}

export function Dashboard() {
  return (
    <section
      className="landing-section landing-showcase-section"
      id="dashboard"
    >
      <h2 className="landing-h2">All the components you need</h2>
      <p className="landing-lead">
        Point your agent at <a href="/llms.txt">our components library</a>
      </p>
      <Showcase />
    </section>
  );
}

export function CodeAndComponent() {
  const demo = demos["tabs-demo"];
  if (demo === undefined) {
    throw new Error('CodeAndComponent: no demo named "tabs-demo"');
  }

  const Drawing = demo.render;

  return (
    <section className="landing-section" id="code">
      <h2 className="landing-h2">Your agent already knows the syntax.</h2>
      <p className="landing-lead">It&apos;s just shadcn!</p>

      <div className="landing-code">
        <HighlightedCode lang="tsx" code={demo.source} />
        <div className="landing-code-preview">
          {}
          <div className="gx-base gx-demo">
            <Drawing />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <span>GPUIxUI — native components for GPUix.</span>
      <span className="landing-footer-end">
        <span>
          Made with ☕ by{" "}
          <a
            href="https://sudokw.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            @sudo_kw
          </a>
        </span>
        <a href={repo} rel="noopener noreferrer" target="_blank">
          source
        </a>
      </span>
    </footer>
  );
}
