import { useTheme } from "fumadocs-ui/provider/base";
import { Hero } from "./deck";
import {
  aiSurfaces,
  attribution,
  navLinks,
  repo,
  roadmapTiers,
  shippingComponents,
} from "./data";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <Nav />
        <Hero />
        <Licence />
        <Platforms />
        <MakeItYours />
        <Library />
        <Proof />
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

function Platforms() {
  const defaults = [
    {
      name: "macOS",
      body: "System type, soft radii, traffic-light chrome.",
    },
    {
      name: "Windows 11",
      body: "Segoe-style type, square-ish controls, Mica-friendly surfaces.",
    },
    {
      name: "Linux / Arch",
      body: "Distro-neutral, high-contrast friendly, no assumptions.",
    },
  ] as const;

  return (
    <section className="landing-section" id="platforms">
      <p className="landing-kicker">The three</p>
      <h2 className="landing-h2">Defaults, not skins.</h2>
      <p className="landing-lead">
        Each platform ships its own default style. Pick one and it looks native
        out of the box.
      </p>
      <div className="landing-grid3">
        {defaults.map((item) => (
          <div className="landing-panel" key={item.name}>
            <h3>{item.name}</h3>
            <p>{item.body}</p>
            <span className="landing-stat">default</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MakeItYours() {
  const recipes = [
    {
      name: "Windows XP / 7 Aero",
      body: "Luna surfaces, bevel edges, Segoe/Tahoma — an approximation where the runtime has no blur or inset shadow, labelled as such.",
      stat: "recipe 433",
    },
    {
      name: "Omarchy",
      body: "Read the active theme's palette and re-apply it live when omarchy-theme-set runs.",
      stat: "recipe 433",
    },
    {
      name: "Your own",
      body: "Copy a theme file, change any value, ship it. The source is yours.",
      stat: "tokens only",
    },
  ] as const;

  return (
    <section className="landing-section">
      <p className="landing-kicker">Make it yours</p>
      <h2 className="landing-h2">A platform style is a starting point.</h2>
      <p className="landing-lead">
        Everything is tokens. Reshape Windows into XP or 7 Aero, or follow
        Omarchy's live theme on Linux — without forking a component.
      </p>
      <div className="landing-grid3">
        {recipes.map((item) => (
          <div className="landing-panel" key={item.name}>
            <h3>{item.name}</h3>
            <p>{item.body}</p>
            <span className="landing-stat">{item.stat}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Library() {
  return (
    <section className="landing-section" id="library">
      <p className="landing-kicker">The library</p>
      <h2 className="landing-h2">
        Built in the open, verified in the runtime.
      </h2>
      <p className="landing-lead">
        Foundations, composition, data, workspace and AI surfaces — each with a
        docs page, an example and a native behaviour suite.
      </p>

      <h3 className="landing-h3">AI-native surfaces</h3>
      <div className="landing-grid3">
        {aiSurfaces.map((item) => (
          <div className="landing-panel landing-panel-ai" key={item.name}>
            <h3>{item.name}</h3>
            <p>{item.blurb}</p>
            <span className={`landing-chip landing-chip-${item.status}`}>
              {item.status}
              {item.note ? ` · ${item.note}` : ""}
            </span>
          </div>
        ))}
      </div>

      <h3 className="landing-h3">Shipping today</h3>
      <div className="landing-tiles">
        {shippingComponents.map((name) => (
          <span className="landing-tile" key={name}>
            {name}
            <span aria-hidden="true" className="landing-tile-dot" />
          </span>
        ))}
      </div>

      <h3 className="landing-h3">On the roadmap</h3>
      <div className="landing-tiles">
        {roadmapTiers.map((tier) => (
          <span className="landing-tile landing-tile-planned" key={tier.name}>
            {tier.name} · {tier.detail}
            <span className="landing-chip landing-chip-planned">planned</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function Proof() {
  const proofs = [
    {
      name: "Native suite",
      body: "Interactions exercised in a real GPUix window, not a DOM mock.",
      stat: "18/18",
    },
    {
      name: "Both themes",
      body: "Every component checked in light and dark, plus high contrast, against the contrast contract.",
      stat: "matrix",
    },
    {
      name: "Documented limits",
      body: "What the runtime cannot do is written down with evidence — never faked.",
      stat: "capability map",
    },
  ] as const;

  return (
    <section className="landing-section" id="proof">
      <p className="landing-kicker">Proof</p>
      <h2 className="landing-h2">No fake screenshots.</h2>
      <p className="landing-lead">
        451 native behaviour checks across the component set, with the honest
        limitations written down instead of hidden.
      </p>
      <div className="landing-grid3">
        {proofs.map((item) => (
          <div className="landing-panel" key={item.name}>
            <h3>{item.name}</h3>
            <p>{item.body}</p>
            <span className="landing-stat">{item.stat}</span>
          </div>
        ))}
      </div>
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
