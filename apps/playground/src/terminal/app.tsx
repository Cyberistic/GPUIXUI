import { useState } from "react";
import { isTerminal } from "@gpuix/react";
import { useWindowKey } from "../window-handlers.js";
import { TERMINAL_WORD, terminalFill, terminalInk } from "./logic.js";

export function TerminalApp() {
  const [keys, setKeys] = useState(0);
  const [clicks, setClicks] = useState(0);
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
      onClick={() => setClicks((count) => count + 1)}
    >
      <text
        testId="terminal-word"
        style={{ color: terminalInk(clicks > 0), fontSize: 24 }}
      >
        {TERMINAL_WORD}
      </text>
    </div>
  );
}
