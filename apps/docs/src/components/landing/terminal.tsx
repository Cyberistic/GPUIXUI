import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

/**
 * The "Run it in your terminal" section: a kitty/Ghostty-style dark frame with
 * no traffic lights, split into a sidebar and a code pane, beside the exact
 * entrypoint. The window is a browser reproduction of the tree a terminal
 * surface draws — the real frames come from the kitty graphics protocol.
 */

const terminalSource = `import { render } from "@gpuix/react";
import { App } from "./app";

// Paint the component tree into kitty / Ghostty instead of a native window.
render(<App />, { terminal: true });

// Or set GPUIX_TERMINAL=1 and change no code at all.`;

const SIDEBAR = [
  "Overview",
  "Components",
  "Primitives",
  "Icons",
  "Tokens",
  "Motion",
] as const;

const CODE = [
  'import { List, ListItem } from "@gpuixui/components/list";',
  'import { Stack, Text } from "@gpuixui/primitives";',
  "",
  "export function App() {",
  "  return (",
  '    <Stack direction="row" grow>',
  '      <Stack direction="column" style={{ width: 220 }}>',
  '        <Text role="h3">gpuixui</Text>',
  '        <List label="Sections">',
  "          <ListItem>Components</ListItem>",
  "          <ListItem>Primitives</ListItem>",
  "        </List>",
  "      </Stack>",
  '      <Stack direction="column" grow>',
  '        <Text role="h2">Components</Text>',
  "        <Text>One set, three native looks.</Text>",
  "      </Stack>",
  "    </Stack>",
  "  );",
  "}",
] as const;

export function Terminal() {
  return (
    <section className="landing-section" id="terminal">
      <p className="landing-kicker">Run it in your terminal</p>
      <h2 className="landing-h2">The same tree, in your terminal.</h2>
      <p className="landing-lead">
        GPUix can paint into kitty or Ghostty instead of a native window. Pass{" "}
        <code>terminal: true</code> — or set <code>GPUIX_TERMINAL=1</code> and
        change nothing — and the component tree renders through the kitty
        graphics protocol, with mouse, scroll and every key reaching the app.
      </p>

      <div className="landing-terminal">
        <TerminalWindow />
        <DynamicCodeBlock lang="tsx" code={terminalSource} />
      </div>

      <p className="landing-terminal-caption">
        A browser rendering of the same component tree a terminal surface draws;
        the real frames come from the kitty protocol.{" "}
        <a href="/docs/installation">Read the docs →</a>
      </p>
    </section>
  );
}

/** The kitty-style frame: dark, monospace, no traffic lights. */
function TerminalWindow() {
  return (
    <div aria-hidden="true" className="landing-terminal-window">
      <div className="landing-term-bar">
        <span className="landing-term-tab">gpuixui</span>
        <span className="landing-term-session">kitty</span>
      </div>
      <div className="landing-term-body">
        <aside className="landing-term-side">
          {SIDEBAR.map((item, index) => (
            <span
              className="landing-term-nav"
              data-active={index === 1}
              key={item}
            >
              {item}
            </span>
          ))}
        </aside>
        <pre className="landing-term-content">
          {CODE.map((text, index) => (
            <code className="landing-term-line" key={index}>
              <span className="landing-term-num">
                {String(index + 1).padStart(2, "0")}
              </span>
              {text}
            </code>
          ))}
        </pre>
      </div>
      <div className="landing-term-status">
        <span>components.tsx</span>
        <span>kitty graphics protocol</span>
      </div>
    </div>
  );
}
