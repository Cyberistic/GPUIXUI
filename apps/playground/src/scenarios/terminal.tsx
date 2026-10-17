/**
 * `terminal-grid` — is a Tier 4 terminal surface feasible on 0.10.0?
 *
 * The runtime has no terminal host element (`ElementType` is
 * `div | text | img | svg | canvas | input | textarea | anchored | code | diff |
 * markdown | virtual-list`) and `GpuixRenderer` exposes no process or PTY API,
 * so a terminal can only be a component over a text grid with the PTY owned by
 * the app. This probe measures the two halves that are the library's to prove:
 *
 * - **render**: a monospace grid of virtualized scrollback rows, per-run colour,
 *   a fixed prompt row and a block caret;
 * - **input**: a focused surface that receives printable keys, Enter, Escape,
 *   arrows, Backspace and a `ctrl-` chord.
 *
 * The prompt lives below the `<virtual-list>`, never inside it, so the caret
 * cannot be scrolled out of the window — the composition a terminal needs.
 *
 * What is deliberately left out: ANSI parsing and a real PTY. Both are the
 * app's, not the renderer's; `COMPONENTS.md` records that boundary.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";

const SCROLLBACK = 200;
const ROW_HEIGHT = 18;
const VISIBLE_HEIGHT = 240;

/** A key as the native dispatcher reports it; the fields this surface reads. */
interface TerminalKey {
  readonly key?: string;
  readonly keyChar?: string;
  readonly isHeld?: boolean;
  readonly modifiers?: {
    readonly ctrl?: boolean;
    readonly cmd?: boolean;
    readonly alt?: boolean;
    readonly shift?: boolean;
  };
}

interface TerminalLine {
  readonly id: number;
  readonly text: string;
}

const initialLines = (): ReadonlyArray<TerminalLine> =>
  Arr.map(Arr.range(0, SCROLLBACK - 1), (line) => ({
    id: line,
    text: `boot ${Str.padStart(3, "0")(`${line}`)}`,
  }));

const TerminalProbe = () => {
  const theme = useTheme();
  const [lines, setLines] = useState<ReadonlyArray<TerminalLine>>(initialLines);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [history, setHistory] = useState<ReadonlyArray<string>>([]);
  const [events, setEvents] = useState<ReadonlyArray<string>>([]);
  const commit = (command: string) => {
    setLines((current) =>
      Arr.append(current, { id: current.length, text: `$ ${command}` }),
    );
    setHistory((current) => Arr.append(current, command));
    setInput("");
    setStatus("committed");
  };

  const handleKeyDown = (event: TerminalKey) => {
    const key = event.key ?? "";
    const chord = `${key}${event.modifiers?.ctrl === true ? "+ctrl" : ""}`;
    setEvents((current) => Arr.takeRight(Arr.append(current, chord), 3));
    if (event.modifiers?.ctrl === true && key === "c") {
      setInput("");
      setStatus("interrupted");
      return;
    }
    if (key === "enter") {
      commit(input);
      return;
    }
    if (key === "escape") {
      setInput("");
      setStatus("cancelled");
      return;
    }
    if (key === "up") {
      Option.match(Arr.last(history), {
        onNone: () => {},
        onSome: (last) => {
          setInput(last);
          setStatus("recalled");
        },
      });
      return;
    }
    if (key === "backspace") {
      setInput((current) => Str.slice(0, -1)(current));
      return;
    }
    const character = event.keyChar ?? key;
    if (character.length === 1) setInput((current) => `${current}${character}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 420,
        height: 420,
      }}
    >
      <Readout testId="terminal-status">{status}</Readout>
      <Readout testId="terminal-count">{`${lines.length}`}</Readout>
      <Readout testId="terminal-events">{Arr.join(events, " ")}</Readout>
      <div
        testId="terminal-surface"
        tabIndex={0}
        role="textbox"
        aria-label="Terminal"
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          height: VISIBLE_HEIGHT + ROW_HEIGHT + 8,
          padding: 4,
          backgroundColor: theme.colors.background,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <div style={{ display: "flex", height: VISIBLE_HEIGHT, minHeight: 0 }}>
          <virtual-list
            testId="terminal-list"
            alignment="bottom"
            followTail
            style={{ flexGrow: 1, minHeight: 0 }}
          >
            {Arr.map(lines, (line, index) => (
              <div
                key={line.id}
                testId={`terminal-row-${index}`}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  height: ROW_HEIGHT,
                  paddingLeft: 4,
                }}
              >
                <text
                  testId={`terminal-text-${index}`}
                  style={{
                    fontFamily: theme.typography.mono,
                    fontSize: theme.typography.codeBlock.fontSize,
                    color: theme.colors.foreground,
                  }}
                >
                  {line.text}
                </text>
                {index === 0 ? (
                  <text
                    testId="terminal-run-error"
                    style={{
                      fontFamily: theme.typography.mono,
                      fontSize: theme.typography.codeBlock.fontSize,
                      color: theme.colors.destructive,
                    }}
                  >
                    {" E001"}
                  </text>
                ) : null}
                {index === 1 ? (
                  <text
                    testId="terminal-run-ok"
                    style={{
                      fontFamily: theme.typography.mono,
                      fontSize: theme.typography.codeBlock.fontSize,
                      color: theme.colors.success,
                    }}
                  >
                    {" ready"}
                  </text>
                ) : null}
              </div>
            ))}
          </virtual-list>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            height: ROW_HEIGHT,
            paddingLeft: 4,
          }}
        >
          <text
            testId="terminal-input"
            style={{
              fontFamily: theme.typography.mono,
              fontSize: theme.typography.codeBlock.fontSize,
              color: theme.colors.foreground,
            }}
          >{`$ ${input}`}</text>
          <div
            testId="terminal-caret"
            style={{
              width: 7,
              height: 12,
              backgroundColor: theme.colors.foreground,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

const painted = (ctx: Smoke.SmokeContext, line: string): boolean =>
  Arr.some(ctx.host.paintedText(), (entry) => entry.includes(line));

const anchorIndex = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.listScrollTop("terminal-list")),
      ([index]) => index,
    ),
    () => -1,
  );

const styleColor = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.color,
  );

const monoFamily = palettes.dark.typography.mono;
const dark = palettes.dark;

export const terminalScenario: PlaygroundScenario = {
  id: "terminal-grid",
  title: "Terminal: a text grid, per-run colour and the key path",
  capability: "terminal",
  view: () => <TerminalProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("terminal-surface");
      yield* ctx.expectEqual(
        "a click focuses the terminal surface",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "terminal-surface",
      );

      ctx.host.key("l");
      ctx.host.key("s");
      yield* ctx.expectEqual(
        "printable keys edit the prompt",
        readout(ctx, "terminal-input"),
        "$ ls",
      );

      ctx.host.key("enter");
      yield* ctx.expectEqual(
        "enter commits and clears the prompt",
        readout(ctx, "terminal-input"),
        "$ ",
      );
      yield* ctx.expectEqual(
        "the committed command joins the scrollback",
        readout(ctx, "terminal-count"),
        `${SCROLLBACK + 1}`,
      );
      yield* ctx.expectEqual(
        "the committed command is painted",
        painted(ctx, "$ ls"),
        true,
      );

      ctx.host.key("up");
      yield* ctx.expectEqual(
        "up recalls the last command",
        readout(ctx, "terminal-input"),
        "$ ls",
      );
      ctx.host.key("backspace");
      yield* ctx.expectEqual(
        "backspace deletes one character",
        readout(ctx, "terminal-input"),
        "$ l",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "escape clears the line",
        readout(ctx, "terminal-input"),
        "$ ",
      );
      yield* ctx.expectEqual(
        "escape reports the cancel",
        readout(ctx, "terminal-status"),
        "cancelled",
      );

      ctx.host.key("a");
      ctx.host.key("ctrl-c");
      yield* ctx.expectEqual(
        "ctrl-c aborts the line",
        readout(ctx, "terminal-status"),
        "interrupted",
      );
      yield* ctx.expectContains(
        "ctrl-c arrives with the control modifier",
        readout(ctx, "terminal-events"),
        "c+ctrl",
      );
      yield* ctx.expectEqual(
        "the aborted line is cleared",
        readout(ctx, "terminal-input"),
        "$ ",
      );

      yield* ctx.expectEqual(
        "the scrollback starts at the tail",
        painted(ctx, `boot ${SCROLLBACK - 1}`),
        true,
      );
      yield* ctx.expectEqual(
        "the head is outside the window",
        painted(ctx, "boot 000"),
        false,
      );

      ctx.host.scrollToItem("terminal-list", 0);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the head is painted after the jump",
        painted(ctx, "boot 000"),
        true,
      );
      yield* ctx.expectEqual(
        "the list reports its anchor",
        anchorIndex(ctx),
        0,
      );

      const row = yield* ctx.expectSome(
        "a row reports painted bounds",
        Option.fromNullishOr(ctx.host.bounds("terminal-row-0")),
      );
      yield* ctx.expectNear(
        "a row is exactly one line tall",
        row.height,
        ROW_HEIGHT,
        0.5,
      );
      const first = yield* ctx.expectSome(
        "the first text run reports painted bounds",
        Option.fromNullishOr(ctx.host.bounds("terminal-text-0")),
      );
      const second = yield* ctx.expectSome(
        "a second text run reports painted bounds",
        Option.fromNullishOr(ctx.host.bounds("terminal-text-1")),
      );
      yield* ctx.expectNear(
        "equal character counts paint equal widths (monospace)",
        first.width,
        second.width,
        0.5,
      );
      yield* ctx.expectEqual(
        "the grid paints the theme's mono family",
        Option.getOrElse(
          Option.flatMap(
            Option.fromNullishOr(ctx.host.paintedStyle("terminal-text-0")),
            (snapshot) => snapshot.fontFamily,
          ),
          () => "",
        ),
        monoFamily,
      );
      yield* ctx.expectEqual(
        "the error run paints the destructive role",
        Option.getOrElse(styleColor(ctx, "terminal-run-error"), () => ""),
        dark.colors.destructive,
      );
      yield* ctx.expectEqual(
        "the ok run paints the success role",
        Option.getOrElse(styleColor(ctx, "terminal-run-ok"), () => ""),
        dark.colors.success,
      );

      ctx.host.scrollToItem("terminal-list", SCROLLBACK - 1);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the tail is reachable again",
        painted(ctx, `boot ${SCROLLBACK - 1}`),
        true,
      );
      yield* ctx.expectEqual(
        "the prompt row survives the jump",
        readout(ctx, "terminal-input"),
        "$ ",
      );
      yield* ctx.expectEqual(
        "focus survives the scrollback jump",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "terminal-surface",
      );
    }),
};
