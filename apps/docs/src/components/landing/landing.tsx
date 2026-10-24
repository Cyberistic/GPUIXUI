import { useTheme } from "fumadocs-ui/provider/base";
import { retroNames, retroStyles, type RetroName } from "@gpuixui/tokens";
import { HighlightedCode } from "@/components/highlighted-code";
import { mainContentId } from "../skip-link";
import { Hero } from "./deck";
import { Lineage } from "./lineage";
import { Terminal } from "./terminal";
import { demos } from "../docs/demos";
import { DashboardManagementRender } from "../docs/dashboard-management";
import { DashboardRender } from "../docs/dashboard";
import { attribution, countWord, navLinks, repo } from "./data";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <Nav />
        <main id={mainContentId} tabIndex={-1}>
          <Hero />
          <Dashboard />
          <Management />
          <Terminal />
          <Lineage />
          <Defaults />
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
        <a className="landing-nav-cta" href="/docs">
          Read the docs
        </a>
      </div>
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // The two icons are always in the DOM; CSS shows the relevant one from the
  // `.dark` class on <html>. Rendering both keeps the server and client markup
  // identical, so the button hydrates cleanly.
  return (
    <button
      aria-label="Toggle theme"
      className="landing-theme-toggle"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
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

/**
 * The management console, the second full-window composition on the page.
 *
 * It is the same recipe the blocks page documents, rendered in the browser: the
 * landing has no native host, so the preview is HTML over the theme's roles.
 */
export function Management() {
  return (
    <section
      className="landing-section landing-management-section"
      id="management"
    >
      <p className="landing-kicker">The console</p>
      <h2 className="landing-h2">Every deploy, one screen.</h2>
      <p className="landing-lead">
        A management console composed from the same parts — service health,
        deploys, toasts, an API-key table and a context menu. The recipe lives
        on the <a href="/docs/blocks/dashboard-management">blocks page</a>.
      </p>
      <div className="landing-dashboard landing-management">
        <DashboardManagementRender />
      </div>
      <p className="landing-dashboard-caption">
        Browser preview of the native composition · the shipped window renders
        through GPUix, not the DOM.
      </p>
    </section>
  );
}

function Dashboard() {
  return (
    <section
      className="landing-section landing-dashboard-section"
      id="dashboard"
    >
      <p className="landing-kicker">The product</p>
      <h2 className="landing-h2">One window, every stat.</h2>
      <p className="landing-lead">
        A dashboard composed from the library's parts — cards, badges, progress,
        search and charts. This is a browser rendering of the same{" "}
        <code>@gpuixui/*</code> tree the native runtime draws; the recipe lives
        on the <a href="/docs/blocks/dashboard">blocks page</a>.
      </p>
      <div className="landing-dashboard">
        <DashboardRender />
      </div>
      <p className="landing-dashboard-caption">
        Browser preview of the native composition · the shipped window renders
        through GPUix, not the DOM.
      </p>
    </section>
  );
}

/** What each authored look repaints, in the order `retroNames` names them. */
const lookBodies: Readonly<Record<RetroName, string>> = {
  luna: "The 2001 beige, its blue selection and warm chrome.",
  aero: "Glass-blue greys and a highlight that reads on every surface.",
  omarchy: "Tokyo Night ink and Flexoki paper, read from your active theme.",
};

const recipes = retroNames.map((look) => ({
  id: look,
  name: retroStyles[look].label,
  body: lookBodies[look],
  facts: `${retroStyles[look].density} · ${retroStyles[look].radius.md}px corners · ${retroStyles[look].mono}`,
  href: "/docs/theming#the-look-picker",
}));

export function Defaults() {
  return (
    <section className="landing-section" id="platforms">
      <p className="landing-kicker">Defaults, then make them yours</p>
      <h2 className="landing-h2">
        {countWord(retroNames.length)} authored looks, one starting point.
      </h2>
      <p className="landing-lead">
        Each platform ships its own default — the same component in native
        chrome and type. The library also ships authored looks over that base:
        copy their values, edit them and ship your own style.
      </p>

      <div className="landing-recipes">
        {recipes.map((item) => (
          <a
            className="landing-panel landing-recipe"
            data-look={item.id}
            href={item.href}
            key={item.id}
          >
            <h3>{item.name}</h3>
            <p>{item.body}</p>
            <span className="landing-stat">{item.facts}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function CodeAndComponent() {
  const demo = demos["tabs-demo"];
  if (demo === undefined) {
    throw new Error('CodeAndComponent: no demo named "tabs-demo"');
  }

  return (
    <section className="landing-section" id="code">
      <p className="landing-kicker">Code, rendered</p>
      <h2 className="landing-h2">The code and the component.</h2>
      <p className="landing-lead">
        The API you read is the API you ship. A Tabs composition — compound
        parts, typed triggers, keyboard navigation — next to the component it
        renders.
      </p>

      <div className="landing-code">
        <HighlightedCode lang="tsx" code={demo.source} />
        <div className="landing-code-preview">
          {/* The landing sits outside a `PreviewSurface`, so the scene needs the
              dark defaults `gx-base` carries; on a docs page the surface does. */}
          <div className="gx-base gx-demo">{demo.render()}</div>
        </div>
      </div>

      <p className="landing-code-caption">
        <a href="/docs/components/tabs">Tabs</a> — a compound-part component;
        browser preview of the native geometry and palette.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <span>GPUIxUI — built on GPUix, credited to the references.</span>
      <span>
        {attribution.join(" · ")} ·{" "}
        <a href={repo} rel="noopener noreferrer" target="_blank">
          source
        </a>
      </span>
    </footer>
  );
}
