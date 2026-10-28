import { useEffect, useRef, useState, type ReactNode } from "react";
import { countWord, landingLookCount } from "./data";
import { usePrefersReducedMotion } from "./reduced-motion";

/**
 * The editor moment: a terminal types the documented install command, the shell
 * answers, and a VS Code window opens on `src/app/page.tsx` rendering GPUIxUI
 * components.
 *
 * The window is a browser reproduction of VS Code's own chrome and palette —
 * Dark Modern's activity bar, explorer, tabs, breadcrumbs, gutter, minimap and
 * status bar — because the claim is "this is VS Code, with your components", and
 * a generic editor would not make it. The editor keeps VS Code's palette rather
 * than the page's theme for the same reason: an editor that repaints with the
 * docs surface would stop looking like the editor the reader has open.
 *
 * One state machine drives the sequence and the stylesheet carries every beat, so
 * `prefers-reduced-motion` is one CSS block plus a jump to the last stage.
 */

/** The launch command `docs/installation` documents: GPUIXUI, in the terminal. */
const COMMAND = "GPUIX_TERMINAL=1 code GPUIXUI";

/** One typed character, the shell's pause, then the editor. */
const TYPE_MS = 32;
const ANSWER_MS = 260;
const OPEN_MS = 900;

type Stage = "typing" | "running" | "editor";

/** The syntax roles this file paints; each one is a class in `landing.css`. */
type TokenRole =
  | "keyword"
  | "tag"
  | "attr"
  | "string"
  | "fn"
  | "var"
  | "num"
  | "punct"
  | "plain";

type Token = readonly [TokenRole, string];

/** The open file, tokenised so the editor paints VS Code's Dark+ colours. */
const CODE: ReadonlyArray<ReadonlyArray<Token>> = [
  [
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{ "],
    ["plain", "useState"],
    ["punct", " }"],
    ["plain", " "],
    ["keyword", "from"],
    ["plain", " "],
    ["string", '"react"'],
    ["punct", ";"],
  ],
  [
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{ "],
    ["plain", "Button"],
    ["punct", ", "],
    ["plain", "Input"],
    ["punct", ", "],
    ["plain", "Stack"],
    ["punct", ", "],
    ["plain", "Text"],
    ["punct", " }"],
    ["plain", " "],
    ["keyword", "from"],
    ["plain", " "],
    ["string", '"@gpuixui/primitives"'],
    ["punct", ";"],
  ],
  [
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{ "],
    ["plain", "themes"],
    ["punct", " }"],
    ["plain", " "],
    ["keyword", "from"],
    ["plain", " "],
    ["string", '"@gpuixui/tokens"'],
    ["punct", ";"],
  ],
  [
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{ "],
    ["plain", "ThemeProvider"],
    ["punct", " }"],
    ["plain", " "],
    ["keyword", "from"],
    ["plain", " "],
    ["string", '"@gpuixui/tokens/react"'],
    ["punct", ";"],
  ],
  [],
  [
    ["keyword", "export"],
    ["plain", " "],
    ["keyword", "function"],
    ["plain", " "],
    ["fn", "Page"],
    ["punct", "() {"],
  ],
  [
    ["plain", "  "],
    ["keyword", "const"],
    ["plain", " ["],
    ["var", "name"],
    ["punct", ", "],
    ["fn", "setName"],
    ["punct", "] = "],
    ["fn", "useState"],
    ["punct", "("],
    ["string", '"Atlas"'],
    ["punct", ");"],
  ],
  [],
  [
    ["plain", "  "],
    ["keyword", "return"],
    ["plain", " ("],
  ],
  [
    ["plain", "    "],
    ["punct", "<"],
    ["tag", "ThemeProvider"],
    ["plain", " "],
    ["attr", "theme"],
    ["punct", "={"],
    ["var", "themes"],
    ["punct", "."],
    ["plain", "dark"],
    ["punct", "}>"],
  ],
  [
    ["plain", "      "],
    ["punct", "<"],
    ["tag", "Stack"],
    ["plain", " "],
    ["attr", "direction"],
    ["punct", '="'],
    ["string", "column"],
    ["punct", '" '],
    ["attr", "gap"],
    ["punct", '="'],
    ["string", "md"],
    ["punct", '">'],
  ],
  [
    ["plain", "        "],
    ["punct", "<"],
    ["tag", "Text"],
    ["plain", " "],
    ["attr", "role"],
    ["punct", '="'],
    ["string", "h2"],
    ["punct", '">'],
    ["plain", "Projects"],
    ["punct", "</"],
    ["tag", "Text"],
    ["punct", ">"],
  ],
  [
    ["plain", "        "],
    ["punct", "<"],
    ["tag", "Text"],
    ["plain", " "],
    ["attr", "role"],
    ["punct", '="'],
    ["string", "body"],
    ["punct", '">'],
    [
      "plain",
      `One set, ${countWord(landingLookCount).toLowerCase()} native looks.`,
    ],
    ["punct", "</"],
    ["tag", "Text"],
    ["punct", ">"],
  ],
  [
    ["plain", "        "],
    ["punct", "<"],
    ["tag", "Input"],
    ["plain", " "],
    ["attr", "label"],
    ["punct", '="'],
    ["string", "Project name"],
    ["punct", '" '],
    ["attr", "value"],
    ["punct", "={"],
    ["var", "name"],
    ["punct", "} "],
    ["attr", "onValueChange"],
    ["punct", "={"],
    ["var", "setName"],
    ["punct", "} />"],
  ],
  [
    ["plain", "        "],
    ["punct", "<"],
    ["tag", "Button"],
    ["plain", " "],
    ["attr", "variant"],
    ["punct", '="'],
    ["string", "primary"],
    ["punct", '">'],
    ["plain", "Save changes"],
    ["punct", "</"],
    ["tag", "Button"],
    ["punct", ">"],
  ],
  [
    ["plain", "      "],
    ["punct", "</"],
    ["tag", "Stack"],
    ["punct", ">"],
  ],
  [
    ["plain", "    "],
    ["punct", "</"],
    ["tag", "ThemeProvider"],
    ["punct", ">"],
  ],
  [
    ["plain", "  "],
    ["punct", ");"],
  ],
  [["punct", "}"]],
];

/** The line the editor's cursor and current-line highlight sit on. */
const CURSOR_LINE = 15;

const lineText = (line: ReadonlyArray<Token>): string =>
  line.map(([, text]) => text).join("");

export function Terminal() {
  const reduced = usePrefersReducedMotion();
  const section = useRef<HTMLElement | null>(null);
  /**
   * Whether the reader has reached the block.
   *
   * The sequence used to start on mount, so it had finished typing before the
   * reader scrolled to it — the terminal they arrived at was already an editor.
   * It now waits for the section to come into view (a third of it is enough),
   * and a replay re-runs it from where it stands.
   */
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState(0);
  const [stage, setStage] = useState<Stage>("typing");
  const [take, setTake] = useState(0);

  useEffect(() => {
    if (reduced) {
      setArmed(true);
      return undefined;
    }
    const node = section.current;
    if (node === null) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setArmed(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced) {
      setTyped(COMMAND.length);
      setStage("editor");
      return undefined;
    }
    if (!armed) return undefined;

    setTyped(0);
    setStage("typing");
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const after = (ms: number, run: () => void) => {
      timers.add(setTimeout(run, ms));
    };
    const type = (index: number) => {
      setTyped(index);
      if (index < COMMAND.length) after(TYPE_MS, () => type(index + 1));
    };

    type(0);
    after(TYPE_MS * COMMAND.length + ANSWER_MS, () => setStage("running"));
    after(TYPE_MS * COMMAND.length + OPEN_MS, () => setStage("editor"));

    return () => timers.forEach(clearTimeout);
  }, [armed, reduced, take]);

  return (
    <section className="landing-section" id="terminal" ref={section}>
      <p className="landing-kicker">From the terminal to the editor</p>
      <h2 className="landing-h2">One command, then your editor.</h2>
      <p className="landing-lead">
        Add the package and open your app: the components are the ones you
        already write. shadcn&rsquo;s composition and React&rsquo;s syntax,
        rendered through GPUix.
      </p>

      <div className="landing-moment" data-stage={stage}>
        <TerminalWindow stage={stage} typed={typed} />
        <VsCodeWindow />
      </div>

      <div className="landing-moment-foot">
        <p className="landing-terminal-caption">
          A browser drawing of VS Code — its Dark Modern chrome and palette —
          with <code>src/app/page.tsx</code> open. The command is the one{" "}
          <a href="/docs/installation">the installation page</a> documents.
        </p>
        <button
          aria-label="Replay the terminal animation"
          className="landing-replay"
          onClick={() => setTake((count) => count + 1)}
          type="button"
        >
          <ReplayGlyph />
          Replay
        </button>
      </div>
    </section>
  );
}

/** The terminal: kitty's dark frame, the prompt, and the shell's answer. */
function TerminalWindow({ stage, typed }: { stage: Stage; typed: number }) {
  return (
    <div aria-hidden="true" className="landing-term">
      <div className="landing-term-bar">
        <span className="landing-term-tab">gpuixui — zsh</span>
        <span className="landing-term-session">kitty</span>
      </div>
      <div className="landing-term-body">
        <span className="landing-term-line">
          <span className="landing-term-path">~/gpuixui</span>{" "}
          <span className="landing-term-prompt">❯</span>{" "}
          <span className="landing-term-cmd" style={{ width: `${typed}ch` }}>
            {COMMAND}
          </span>
          <span className="landing-term-caret" data-on={stage === "typing"} />
        </span>
        <span className="landing-term-out">
          opening GPUIXUI — terminal mode
        </span>
      </div>
    </div>
  );
}

/** VS Code's window: title bar, activity bar, explorer, editor group, status bar. */
function VsCodeWindow() {
  return (
    <div aria-hidden="true" className="landing-vscode">
      <div className="landing-vscode-title">
        <span className="landing-vscode-lights">
          <i data-light="close" />
          <i data-light="minimise" />
          <i data-light="zoom" />
        </span>
        <span className="landing-vscode-window">page.tsx — gpuixui</span>
      </div>

      <div className="landing-vscode-body">
        <ActivityBar />
        <Explorer />
        <div className="landing-vscode-main">
          <div className="landing-vscode-tabs">
            {TABS.map((tab) => (
              <span
                className="landing-vscode-tab"
                data-active={tab.active}
                key={tab.name}
              >
                <TsGlyph />
                {tab.name}
                <i className="landing-vscode-close">×</i>
              </span>
            ))}
          </div>

          <div className="landing-vscode-trail">
            <span>src</span>
            <i>›</i>
            <span>app</span>
            <i>›</i>
            <span data-current="true">page.tsx</span>
          </div>

          <div className="landing-vscode-editor">
            <div className="landing-vscode-code">
              {CODE.map((line, index) => (
                <div
                  className="landing-vscode-line"
                  data-current={index + 1 === CURSOR_LINE}
                  key={index}
                >
                  <span className="landing-vscode-num">{index + 1}</span>
                  <span className="landing-vscode-tokens">
                    {line.map(([role, text], at) => (
                      <span className={`vsc-tok-${role}`} key={at}>
                        {text}
                      </span>
                    ))}
                    {index + 1 === CURSOR_LINE ? (
                      <i className="landing-vscode-caret" />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            <div className="landing-vscode-minimap">
              {CODE.map((line, index) => (
                <span
                  data-current={index + 1 === CURSOR_LINE}
                  key={index}
                  style={{
                    width: `${Math.min(100, lineText(line).length * 1.4)}%`,
                  }}
                />
              ))}
              <i className="landing-vscode-slider" />
            </div>
          </div>
        </div>
      </div>

      <div className="landing-vscode-status">
        <span className="landing-vscode-status-left">
          <BranchGlyph />
          main*
          <i className="landing-vscode-status-gap" />⊗ 0{" "}
          <span aria-hidden="true">△</span> 0
        </span>
        <span className="landing-vscode-status-right">
          Ln {CURSOR_LINE}, Col 22
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>TypeScript React</span>
        </span>
      </div>
    </div>
  );
}

const TABS = [
  { name: "page.tsx", active: true },
  { name: "button.tsx", active: false },
] as const;

const TREE = [
  { name: "gpuixui", depth: 0, kind: "root" },
  { name: "app", depth: 1, kind: "open" },
  { name: "page.tsx", depth: 2, kind: "tsx", active: true },
  { name: "layout.tsx", depth: 2, kind: "tsx" },
  { name: "components", depth: 1, kind: "open" },
  { name: "button.tsx", depth: 2, kind: "tsx" },
  { name: "package.json", depth: 1, kind: "json" },
  { name: "tsconfig.json", depth: 1, kind: "json" },
] as const;

function ActivityBar() {
  return (
    <div className="landing-vscode-activity">
      {ACTIVITY.map((item) => (
        <span
          className="landing-vscode-action"
          data-active={item.active === true}
          key={item.label}
          title={item.label}
        >
          {item.glyph}
          {item.badge === undefined ? null : (
            <i className="landing-vscode-badge">{item.badge}</i>
          )}
        </span>
      ))}
      <span className="landing-vscode-action landing-vscode-action-foot">
        <PersonGlyph />
      </span>
      <span className="landing-vscode-action landing-vscode-action-foot">
        <GearGlyph />
      </span>
    </div>
  );
}

interface ActivityItem {
  readonly label: string;
  readonly glyph: ReactNode;
  readonly active?: boolean;
  readonly badge?: string;
}

const ACTIVITY: ReadonlyArray<ActivityItem> = [
  { label: "Explorer", glyph: <FilesGlyph />, active: true },
  { label: "Search", glyph: <SearchGlyph /> },
  { label: "Source Control", glyph: <BranchGlyph />, badge: "2" },
  { label: "Run and Debug", glyph: <PlayGlyph /> },
  { label: "Extensions", glyph: <BlocksGlyph /> },
];

/** The explorer: the section header and the tree, with the open file selected. */
function Explorer() {
  return (
    <div className="landing-vscode-explorer">
      <div className="landing-vscode-section">
        <span>Explorer</span>
        <i>…</i>
      </div>
      <div className="landing-vscode-tree">
        {TREE.map((row) => (
          <span
            className="landing-vscode-row"
            data-active={row.kind === "tsx" && row.name === "page.tsx"}
            data-kind={row.kind}
            key={row.name}
            style={{ paddingLeft: `${8 + row.depth * 12}px` }}
          >
            {row.kind === "root" || row.kind === "open" ? (
              <ChevronGlyph />
            ) : (
              <span className="landing-vscode-indent" />
            )}
            {row.kind === "tsx" ? <TsGlyph /> : null}
            {row.kind === "json" ? (
              <i className="landing-vscode-json">{"{}"}</i>
            ) : null}
            {row.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The replay mark: one turn of the arrow, so the button reads as a reset. */
function ReplayGlyph() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="13"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </svg>
  );
}

const glyph = (children: ReactNode) => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.4"
    viewBox="0 0 24 24"
    width="20"
  >
    {children}
  </svg>
);

function FilesGlyph() {
  return glyph(
    <>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8Z" />
      <path d="M14 3v5h5" />
    </>,
  );
}

function SearchGlyph() {
  return glyph(
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>,
  );
}

function BranchGlyph() {
  return glyph(
    <>
      <circle cx="7" cy="5" r="2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="7" r="2" />
      <path d="M7 7v10M17 9c0 4-6 3-6 8" />
    </>,
  );
}

function PlayGlyph() {
  return glyph(
    <>
      <path d="M6 4.5 19 12 6 19.5Z" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </>,
  );
}

function BlocksGlyph() {
  return glyph(
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="10" />
      <path d="M6.5 14v7M3 17.5h7" />
      <path d="M17.5 3v7M14 6.5h7" />
    </>,
  );
}

function PersonGlyph() {
  return glyph(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 19a6 6 0 0 1 11 0" />
    </>,
  );
}

function GearGlyph() {
  return glyph(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>,
  );
}

function ChevronGlyph() {
  return (
    <svg
      fill="none"
      height="12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width="12"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** The TypeScript mark Seti shows in the explorer and on the tab. */
function TsGlyph() {
  return <i className="landing-vscode-ts">TS</i>;
}
