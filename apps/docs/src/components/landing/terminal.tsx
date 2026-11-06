import { useEffect, useRef, useState, type ReactNode } from "react";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import type { TreeCursor } from "@gpuixui/data/tree/logic";
import type { FileNode } from "@gpuixui/files/tree/logic";
import { buildFileTree } from "@gpuixui/files/tree/logic";
import { FileTreeFrame } from "../docs/file-tree-demo";
import { ReorderableTabs, type ReorderableTab } from "../docs/reorderable-tabs";
import { closedTabs } from "../docs/reorderable-tabs-logic";
import { usePrefersReducedMotion } from "./reduced-motion";

/**
 * The terminal moment: a terminal types the command that runs GPUIxUI in
 * place, and the app it opens **inside the same frame** — a code editor drawn
 * with the library's file tree and a collapsible sidebar.
 *
 * The size is the claim: the editor is not a second window, so both stages
 * share one frame and the editor replaces the shell's body. The tree and the
 * sidebar are real controls: a file press switches the open buffer, and the
 * explorer collapses with a width transition (dropped under reduced motion).
 */

/** The command the Terminal guide documents. */
const COMMAND = "GPUIX_TERMINAL=1 code GPUIXUI";

const TYPE_MS = 32;
const ANSWER_MS = 260;
const OPEN_MS = 900;

type Stage = "typing" | "running" | "editor";

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

type FileName = "page.tsx" | "button.tsx" | "theme.ts";

/** The open file, tokenised so the editor paints VS Code's Dark+ colours. */
const FILES: Readonly<Record<FileName, ReadonlyArray<ReadonlyArray<Token>>>> = {
  "page.tsx": [
    [
      ["keyword", "import"],
      ["plain", " { "],
      ["plain", "Stack"],
      ["punct", ", "],
      ["plain", "Button"],
      ["plain", " } "],
      ["keyword", "from"],
      ["plain", " "],
      ["string", '"@/gpuixui"'],
      ["punct", ";"],
    ],
    [
      ["keyword", "import"],
      ["plain", " { ThemeProvider } "],
      ["keyword", "from"],
      ["plain", " "],
      ["string", '"@/gpuixui/tokens"'],
      ["punct", ";"],
    ],
    [],
    [
      ["keyword", "export default"],
      ["keyword", " function"],
      ["plain", " "],
      ["fn", "Page"],
      ["punct", "() {"],
    ],
    [
      ["plain", "  "],
      ["keyword", "const"],
      ["plain", " [name, setName] = "],
      ["fn", "useState"],
      ["punct", "("],
      ["string", '""'],
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
      ["var", "dark"],
      ["punct", "} />"],
    ],
    [
      ["plain", "      "],
      ["punct", "<"],
      ["tag", "Stack"],
      ["plain", " "],
      ["attr", "gap"],
      ["punct", '="'],
      ["string", "md"],
      ["punct", '">'],
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
  ],
  "button.tsx": [
    [
      ["keyword", "import"],
      ["plain", " { "],
      ["plain", "Button"],
      ["plain", " } "],
      ["keyword", "from"],
      ["plain", " "],
      ["string", '"@/gpuixui"'],
      ["punct", ";"],
    ],
    [],
    [
      ["keyword", "export"],
      ["keyword", " function"],
      ["plain", " "],
      ["fn", "Save"],
      ["punct", "() {"],
    ],
    [
      ["plain", "  "],
      ["keyword", "return"],
      ["plain", " ("],
    ],
    [
      ["plain", "    "],
      ["punct", "<"],
      ["tag", "Button"],
    ],
    [
      ["plain", "      "],
      ["attr", "variant"],
      ["punct", '="'],
      ["string", "primary"],
      ["punct", '"'],
    ],
    [
      ["plain", "      "],
      ["attr", "onActivate"],
      ["punct", "={"],
      ["var", "save"],
      ["punct", "}"],
    ],
    [
      ["plain", "    "],
      ["punct", ">"],
    ],
    [["plain", "      Save changes"]],
    [
      ["plain", "    "],
      ["punct", "</"],
      ["tag", "Button"],
      ["punct", ">"],
    ],
    [
      ["plain", "  "],
      ["punct", ");"],
    ],
    [["punct", "}"]],
  ],
  "theme.ts": [
    [
      ["keyword", "import"],
      ["plain", " { "],
      ["plain", "platformTheme"],
      ["punct", ", "],
      ["plain", "darkTheme"],
      ["plain", " } "],
      ["keyword", "from"],
      ["plain", " "],
      ["string", '"@gpuixui/tokens"'],
      ["punct", ";"],
    ],
    [],
    [
      ["keyword", "export"],
      ["keyword", " const"],
      ["plain", " "],
      ["var", "theme"],
      ["plain", " = "],
      ["fn", "platformTheme"],
      ["punct", "("],
    ],
    [
      ["plain", "  "],
      ["var", "darkTheme"],
      ["punct", ","],
    ],
    [
      ["plain", "  "],
      ["string", '"win32"'],
      ["punct", ","],
    ],
    [["plain", ");"]],
  ],
};

const FILE_NAMES = [
  "page.tsx",
  "button.tsx",
  "theme.ts",
] as const satisfies ReadonlyArray<FileName>;

const isFileName = (value: string): value is FileName =>
  FILE_NAMES.some((name) => name === value);

const fileNameOf = (id: string): FileName | null =>
  FILE_NAMES.find((name) => name === id) ?? null;

const fileTabs = (
  order: ReadonlyArray<FileName>,
): ReadonlyArray<ReorderableTab> =>
  order.map((name) => ({ id: name, label: name }));

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
  const [order, setOrder] = useState<ReadonlyArray<FileName>>(FILE_NAMES);
  const [active, setActive] = useState<FileName | null>("page.tsx");
  const [sidebar, setSidebar] = useState(true);

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
    setOrder(FILE_NAMES);
    setActive("page.tsx");
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

  const lines = active === null ? [] : FILES[active];

  /** Opening a closed file puts it back at the end of the strip and focuses it. */
  const openFile = (name: FileName): void => {
    setOrder((current) =>
      current.includes(name) ? current : [...current, name],
    );
    setActive(name);
  };

  /** Closing a tab leaves the next tab (or the previous one) open. */
  const closeFile = (id: string): void => {
    const name = fileNameOf(id);
    if (name === null) return;
    const next = closedTabs(
      order.map((entry) => ({ id: entry })),
      name,
    );
    setOrder(
      next.tabs.flatMap(({ id: kept }) => (isFileName(kept) ? [kept] : [])),
    );
    if (active === name) {
      setActive(
        next.active !== null && isFileName(next.active) ? next.active : null,
      );
    }
  };

  return (
    <section className="landing-section" id="terminal" ref={section}>
      <p className="landing-kicker">
        ssh, animations, tmux.. through the kitty image protocol
      </p>
      <h2 className="landing-h2">Render your apps in a terminal</h2>
      <p className="landing-lead">
        <a href="/getting-started/terminal">Check out the terminal guide</a>
      </p>

      <div className="landing-moment" data-stage={stage}>
        <div aria-hidden="true" className="landing-moment-wallpaper" />
        <div className="landing-term" data-stage={stage}>
          <div className="landing-term-bar">
            <span aria-hidden="true" className="landing-term-lights">
              <i />
              <i />
              <i />
            </span>
            <span className="landing-term-tab">
              {stage === "editor"
                ? `${active ?? "gpuixui"} — gpuixui`
                : "gpuixui — zsh"}
            </span>
          </div>

          <div className="landing-term-body">
            <span className="landing-term-line">
              <span className="landing-term-path">~/gpuixui</span>{" "}
              <span className="landing-term-prompt">❯</span>{" "}
              <span
                className="landing-term-cmd"
                style={{ width: `${typed}ch` }}
              >
                {COMMAND}
              </span>
              <span
                className="landing-term-caret"
                data-on={stage === "typing"}
              />
            </span>
            <span className="landing-term-out">
              opening GPUIXUI — terminal mode
            </span>
          </div>

          <div className="landing-editor" data-sidebar={sidebar}>
            <div className="landing-vscode landing-editor-pane">
              <div className="landing-vscode-body">
                <ActivityBar
                  expanded={sidebar}
                  onToggle={() => setSidebar((open) => !open)}
                />
                <Explorer active={active} onFile={openFile} />
                <div className="landing-vscode-main">
                  <ReorderableTabs
                    active={active}
                    className="landing-vscode-tabs"
                    closeClassName="landing-vscode-close"
                    label="Open editor files"
                    onActivate={(id) => {
                      const name = fileNameOf(id);
                      if (name !== null) setActive(name);
                    }}
                    onClose={closeFile}
                    onReorder={(next) =>
                      setOrder(
                        next.flatMap(({ id }) => (isFileName(id) ? [id] : [])),
                      )
                    }
                    tabClassName="landing-vscode-tab"
                    tabs={fileTabs(order).map((tab) => ({
                      ...tab,
                      leading: <TsGlyph />,
                    }))}
                  />

                  <div className="landing-vscode-trail">
                    <span>src</span>
                    <i>›</i>
                    <span>app</span>
                    <i>›</i>
                    <span data-current="true">{active ?? "no file open"}</span>
                  </div>

                  <div className="landing-vscode-editor">
                    {active === null ? (
                      <p className="landing-vscode-empty">
                        No file open. Pick one from the explorer.
                      </p>
                    ) : (
                      <div className="landing-vscode-code">
                        {lines.map((line, index) => (
                          <div className="landing-vscode-line" key={index}>
                            <span className="landing-vscode-num">
                              {index + 1}
                            </span>
                            <span className="landing-vscode-tokens">
                              {line.map(([role, text], at) => (
                                <span className={`vsc-tok-${role}`} key={at}>
                                  {text}
                                </span>
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Minimap lines={lines} />
                </div>
              </div>
              <StatusBar
                lines={lines.length}
                onReplay={() => setTake((count) => count + 1)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The explorer: the package's own tree drawing, with its fold animation. */
function Explorer({
  active,
  onFile,
}: {
  active: FileName | null;
  onFile: (file: FileName) => void;
}) {
  const [cursor, setCursor] = useState<TreeCursor>(() => ({
    expanded: HashSet.make("app"),
    active: Option.some("app/page.tsx"),
  }));
  const roots = buildFileTree([
    "app/page.tsx",
    "app/button.tsx",
    "app/theme.ts",
    "package.json",
  ]);
  return (
    <div className="landing-vscode-explorer">
      <div className="landing-vscode-section">
        <span>Explorer</span>
      </div>
      <div className="landing-term-tree">
        <FileTreeFrame
          cursor={cursor}
          onCursorChange={setCursor}
          onSelect={(path) => {
            const name = path.split("/").at(-1);
            const chosen = FILE_NAMES.find((entry) => entry === name);
            if (chosen !== undefined) onFile(chosen);
          }}
          renderGlyph={fileGlyph}
          roots={roots}
          selected={active === null ? "" : `app/${active}`}
        />
      </div>
    </div>
  );
}

/** The Seti badge the editor's own explorer shows beside a file. */
function fileGlyph(node: FileNode): ReactNode {
  if (node.name === "package.json") {
    return <i className="landing-vscode-json">{"{}"}</i>;
  }
  if (node.name.endsWith(".tsx") || node.name.endsWith(".ts")) {
    return <TsGlyph />;
  }
  return null;
}

/** The VS Code chrome: an activity bar, a minimap and a status bar. */
function ActivityBar({
  expanded,
  onToggle,
}: {
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  const glyph = (path: ReactNode) => (
    <svg
      aria-hidden="true"
      fill="none"
      height="15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 24 24"
      width="15"
    >
      {path}
    </svg>
  );
  return (
    <div aria-hidden="true" className="landing-vscode-activity">
      <button
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        className="landing-vscode-action"
        data-active="true"
        onClick={onToggle}
        type="button"
      >
        {glyph(
          <>
            <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8Z" />
            <path d="M14 3v5h5" />
          </>,
        )}
      </button>
      <span className="landing-vscode-action">
        {glyph(
          <>
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="m15 15 5 5" />
          </>,
        )}
      </span>
      <span className="landing-vscode-action">
        {glyph(
          <>
            <circle cx="7" cy="5" r="2" />
            <circle cx="7" cy="19" r="2" />
            <circle cx="17" cy="7" r="2" />
            <path d="M7 7v10M17 9c0 4-6 3-6 8" />
          </>,
        )}
      </span>
      <span className="landing-vscode-action">
        {glyph(
          <>
            <path d="M6 4.5 19 12 6 19.5Z" />
          </>,
        )}
      </span>
      <span className="landing-vscode-action">
        {glyph(
          <>
            <rect height="7" rx="1" width="7" x="3" y="3" />
            <rect height="7" rx="1" width="7" x="14" y="10" />
            <path d="M6.5 14v7M3 17.5h7" />
          </>,
        )}
      </span>
    </div>
  );
}

function Minimap({ lines }: { lines: ReadonlyArray<ReadonlyArray<Token>> }) {
  return (
    <div aria-hidden="true" className="landing-vscode-minimap">
      {lines.map((line, index) => (
        <span
          key={index}
          style={{
            width: `${Math.min(100, line.map(([, text]) => text).join("").length * 1.4)}%`,
          }}
        />
      ))}
      <i className="landing-vscode-slider" />
    </div>
  );
}

function StatusBar({
  lines,
  onReplay,
}: {
  lines: number;
  onReplay: () => void;
}) {
  return (
    <div className="landing-vscode-status">
      <span className="landing-vscode-status-left">
        main* <i className="landing-vscode-status-gap" />⊗ 0 △ 0
      </span>
      <span className="landing-vscode-status-right">
        Ln 1, Col 1<span>{lines} lines</span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>TypeScript React</span>
        <button
          aria-label="Replay the terminal animation"
          className="landing-replay landing-vscode-replay"
          onClick={onReplay}
          type="button"
        >
          <ReplayGlyph />
          Replay
        </button>
      </span>
    </div>
  );
}

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

/** The TypeScript mark Seti shows in the explorer and on the tab. */
function TsGlyph() {
  return <i className="landing-vscode-ts">TS</i>;
}
