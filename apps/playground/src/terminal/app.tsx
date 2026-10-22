/**
 * The tree a terminal-mode run paints.
 *
 * One full-frame page plus one word, because those are the two things a
 * terminal frame can prove: a fill that says which platform painted it, and
 * glyphs the runtime rasterised into the frame. The app also counts the window's
 * keys, so a synthetic key from the harness changes the whole page — a repaint,
 * not a readout the harness would have to OCR.
 *
 * The window key seam is the playground's own (`useWindowKey`), because the
 * runtime publishes no per-component route: `render(<App />, { onKeyDown })` is
 * the app-level path and the runner forwards to whatever the app registered.
 */
import { useState } from "react";
import { isTerminal } from "@gpuix/react";
import { useWindowKey } from "../window-handlers.js";
import { TERMINAL_INK_FILL, TERMINAL_WORD, terminalFill } from "./logic.js";

/** The page and the word a terminal frame is asserted against. */
export function TerminalApp() {
  const [keys, setKeys] = useState(0);
  useWindowKey(() => setKeys((count) => count + 1));
  return (
    <div
      testId="terminal-root"
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: terminalFill(isTerminal(), keys),
      }}
    >
      <text
        testId="terminal-word"
        style={{ color: TERMINAL_INK_FILL, fontSize: 24 }}
      >
        {TERMINAL_WORD}
      </text>
    </div>
  );
}
