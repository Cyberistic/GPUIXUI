/**
 * The Netherite terminal client.
 *
 * The C engine's verbs, a log of what they print, and the keys to drive them —
 * painted by GPUix in a terminal rather than a window (`render(..., {
 * terminal: true })`). GPUixUI supplies the status bar and the theme roles.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { StatusBar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import type { StyleDesc } from "@gpuix/react";
import type { KeyEvent } from "@gpuix/react";
import { useWindowKeys } from "./keys.js";
import { append } from "./log.js";
import { findRoot, inspect, startVerb, type Checkout } from "./runner.js";
import { VERBS, argvOf, step, verbAt } from "./verbs.js";

const VIEWPORT = 22;

export const App = () => {
  const theme = useTheme();
  const checkout = useMemo<Checkout | undefined>(() => {
    const root = findRoot();
    return root === undefined ? undefined : inspect(root);
  }, []);

  const [selected, setSelected] = useState(0);
  const [log, setLog] = useState<ReadonlyArray<string>>(() =>
    checkout === undefined
      ? ["No Netherite checkout found.", "Set NETHERITE_DIR to the clone."]
      : [
          `netherite at ${checkout.root}`,
          checkout.built ? "binary present" : "binary missing — run setup",
          "↑↓ choose a verb · Enter run · Esc quit",
        ],
  );
  const [running, setRunning] = useState<string | undefined>();
  const cancel = useRef<() => void>(() => {});

  const verb = verbAt(selected);

  const run = useCallback(() => {
    if (checkout === undefined || running !== undefined) return;
    const argv = argvOf(verb);
    setRunning(verb.name);
    setLog((lines) => append(lines, `$ netherite ${verb.name}`));
    const handle = startVerb(
      checkout,
      argv,
      (line) => setLog((lines) => append(lines, line)),
      (code) => {
        setRunning(undefined);
        setLog((lines) =>
          append(lines, code === undefined ? "failed to start" : `exit ${code}`),
        );
      },
    );
    cancel.current = handle.cancel;
  }, [checkout, running, verb]);

  const onKey = useCallback(
    (event: KeyEvent) => {
      const key = (event.key ?? "").toLowerCase();
      if (key === "up") setSelected((index) => step(index, -1));
      else if (key === "down") setSelected((index) => step(index, 1));
      else if (key === "enter") run();
      else if (key === "escape") {
        cancel.current();
        process.exit(0);
      }
    },
    [run],
  );
  useWindowKeys(onKey);

  const root: StyleDesc = {
    flexGrow: 1,
    flexDirection: "column",
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
  };
  const header: StyleDesc = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 12,
    paddingRight: 12,
    height: 32,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  };
  const body: StyleDesc = { flexGrow: 1, flexDirection: "row" };
  const list: StyleDesc = {
    width: 300,
    flexDirection: "column",
    paddingTop: 8,
    paddingBottom: 8,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  };
  const pane: StyleDesc = {
    flexGrow: 1,
    flexDirection: "column",
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    overflow: "hidden",
  };

  const visible = log.slice(Math.max(0, log.length - VIEWPORT));

  return (
    <div style={root}>
      <div style={header}>
        <text style={{ fontWeight: 600 }}>netherite</text>
        <text style={{ color: theme.colors.mutedForeground }}>
          {checkout?.root ?? "checkout not found"}
          {checkout === undefined ? "" : checkout.built ? " · ready" : " · setup needed"}
        </text>
      </div>
      <div style={body}>
        <div style={list}>
          {VERBS.map((entry, index) => (
            <div
              key={entry.name}
              style={{
                flexDirection: "row",
                paddingLeft: 12,
                paddingRight: 12,
                height: 24,
                alignItems: "center",
                backgroundColor:
                  index === selected ? theme.colors.accent : "transparent",
                color:
                  index === selected
                    ? theme.colors.accentForeground
                    : theme.colors.foreground,
              }}
            >
              <text style={{ fontWeight: index === selected ? 600 : 400 }}>
                {entry.name}
              </text>
              <text style={{ color: theme.colors.mutedForeground }}>
                {`  ${entry.args}`}
              </text>
            </div>
          ))}
        </div>
        <div style={pane}>
          <text style={{ color: theme.colors.mutedForeground, fontWeight: 600 }}>
            {`${verb.what}${running === undefined ? "" : `  ·  running ${running}`}`}
          </text>
          {visible.map((line, index) => (
            <text key={`${index}-${line.slice(0, 12)}`} style={{ paddingTop: 2 }}>
              {line}
            </text>
          ))}
        </div>
      </div>
      <StatusBar
        left={[
          {
            id: "verb",
            label: running === undefined ? `ready · ${verb.name}` : `running ${running}`,
            tone: running === undefined ? "default" : "info",
          },
        ]}
        right={[
          { id: "keys", label: "↑↓ select · Enter run · Esc quit" },
        ]}
      />
    </div>
  );
};
