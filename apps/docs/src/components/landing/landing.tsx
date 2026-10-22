import { useTheme } from "fumadocs-ui/provider/base";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Hero, PlatformWindow } from "./deck";
import { Lineage } from "./lineage";
import { Terminal } from "./terminal";
import { demos } from "../docs/demos";
import { DashboardRender } from "../docs/dashboard";
import { attribution, navLinks, platforms, repo } from "./data";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <Nav />
        <Hero />
        <Dashboard />
        <Terminal />
        <Lineage />
        <Licence />
        <Defaults />
        <CodeAndComponent />
        <Footer />
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

function Licence() {
  const entitlements = [
    { title: "Components", body: "typed, composable parts" },
    { title: "Themes", body: "light, dark, high contrast" },
    { title: "Platforms", body: "macOS, Windows 11, Linux" },
    { title: "Runtime", body: "real GPUix, not a browser" },
    { title: "Source", body: "copy it, own it, edit it" },
    { title: "Limits", body: "documented, with evidence" },
  ] as const;

  return (
    <section className="landing-section">
      <p className="landing-kicker">The licence</p>
      <h2 className="landing-h2">What you get when you carry it.</h2>
      <div className="landing-licence">
        <div className="landing-licence-head">
          <span aria-hidden="true" className="landing-seal">
            X
          </span>
          <div>
            <p className="landing-licence-title">The Hunter License</p>
            <p className="landing-licence-sub">
              GPUIxUI · one component set, three native looks
            </p>
          </div>
        </div>
        <p className="landing-lead landing-licence-lead">
          A licence to build native software with one component set: composable
          parts, semantic tokens, both themes, and the limitations written down
          instead of hidden.
        </p>
        <ul className="landing-licence-list">
          {entitlements.map((item) => (
            <li key={item.title}>
              <b>{item.title}</b> — {item.body}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const recipes = [
  {
    name: "Windows XP / 7 Aero",
    body: "Luna surfaces, bevel edges, Segoe/Tahoma — an approximation where the runtime has no blur or inset shadow, labelled as such.",
    href: "/docs/theming",
  },
  {
    name: "Omarchy",
    body: "Read the active theme's palette and re-apply it live when omarchy-theme-set runs.",
    href: "/docs/theming",
  },
] as const;

function Defaults() {
  return (
    <section className="landing-section" id="platforms">
      <p className="landing-kicker">Defaults, then make them yours</p>
      <h2 className="landing-h2">Three native looks, one starting point.</h2>
      <p className="landing-lead">
        Each platform ships its own default — the same component in native
        chrome and type. Pick one and it looks at home out of the box, then
        reshape it with <a href="/docs/theming">tokens</a> or in the{" "}
        <a href="/docs/themes">theme editor</a>.
      </p>

      <div className="landing-grid3">
        {platforms.map((platform) => (
          <a
            className="landing-default"
            href="/docs/components/dialog"
            key={platform.id}
          >
            <PlatformWindow platform={platform} />
            <span className="landing-default-link">
              Dialog docs <span aria-hidden="true">→</span>
            </span>
          </a>
        ))}
      </div>

      <div className="landing-recipes">
        {recipes.map((item) => (
          <a
            className="landing-panel landing-recipe"
            href={item.href}
            key={item.name}
          >
            <h3>{item.name}</h3>
            <p>{item.body}</p>
            <span className="landing-stat">recipe →</span>
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
        <DynamicCodeBlock lang="tsx" code={demo.source} />
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
