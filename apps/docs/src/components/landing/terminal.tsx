import { useEffect, useRef, useState } from "react";
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
  const [file, setFile] = useState<FileName>("page.tsx");
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

  const lines = FILES[file];

  return (
    <section className="landing-section" id="terminal" ref={section}>
      <p className="landing-kicker">Render your apps in a terminal</p>
      <h2 className="landing-h2">One frame, from prompt to editor.</h2>
      <p className="landing-lead">
        Read the <a href="/platform/terminal">Terminal guide</a> to run all your
        apps in a kitty image protocol supported terminal. Everything below,
        including the file tree and the collapsible sidebar, is the library
        running in that frame — not a second GUI.
      </p>

      <div className="landing-moment" data-stage={stage}>
        <div className="landing-term" data-stage={stage}>
          <div className="landing-term-bar">
            <span className="landing-term-tab">
              {stage === "editor" ? `${file} — gpuixui` : "gpuixui — zsh"}
            </span>
            <span className="landing-term-session">kitty</span>
            <button
              aria-expanded={sidebar}
              aria-label={sidebar ? "Collapse sidebar" : "Expand sidebar"}
              className="landing-term-sidebar"
              disabled={stage !== "editor"}
              onClick={() => setSidebar((open) => !open)}
              type="button"
            >
              <ChevronGlyph />
            </button>
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
              <Explorer file={file} onFile={setFile} />
              <div className="landing-vscode-main">
                <div className="landing-vscode-tabs">
                  {FILE_NAMES.map((name) => (
                    <button
                      className="landing-vscode-tab"
                      data-active={name === file}
                      key={name}
                      onClick={() => setFile(name)}
                      type="button"
                    >
                      <TsGlyph />
                      {name}
                      <i className="landing-vscode-close">×</i>
                    </button>
                  ))}
                </div>

                <div className="landing-vscode-trail">
                  <span>src</span>
                  <i>›</i>
                  <span>app</span>
                  <i>›</i>
                  <span data-current="true">{file}</span>
                </div>

                <div className="landing-vscode-editor">
                  <div className="landing-vscode-code">
                    {lines.map((line, index) => (
                      <div className="landing-vscode-line" key={index}>
                        <span className="landing-vscode-num">{index + 1}</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-moment-foot">
        <p className="landing-terminal-caption">
          The editor is drawn inside the terminal frame: the library&apos;s file
          tree, a collapsible sidebar and its code pane, running where the shell
          was. The command is the one <a href="/platform/terminal">the guide</a>{" "}
          documents.
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

/** The explorer: a collapsible file tree whose files switch the open buffer. */
function Explorer({
  file,
  onFile,
}: {
  file: FileName;
  onFile: (file: FileName) => void;
}) {
  return (
    <div className="landing-vscode-explorer">
      <div className="landing-vscode-section">
        <span>Explorer</span>
      </div>
      <div className="landing-vscode-tree">
        <span className="landing-vscode-row" data-kind="root">
          <ChevronGlyph />
          gpuixui
        </span>
        <button
          className="landing-vscode-row"
          data-kind="open"
          onClick={() => onFile("page.tsx")}
          type="button"
        >
          <ChevronGlyph />
          app
        </button>
        {FILE_NAMES.map((name) => (
          <button
            className="landing-vscode-row"
            data-active={name === file}
            data-kind="tsx"
            key={name}
            onClick={() => onFile(name)}
            style={{ paddingLeft: "32px" }}
            type="button"
          >
            <span className="landing-vscode-indent" />
            <TsGlyph />
            {name}
          </button>
        ))}
        <span className="landing-vscode-row" data-kind="json">
          <span className="landing-vscode-indent" />
          <i className="landing-vscode-json">{"{}"}</i>
          package.json
        </span>
      </div>
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

function ChevronGlyph() {
  return (
    <svg
      aria-hidden="true"
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
