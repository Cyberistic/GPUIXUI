/**
 * The film's terminal shot: `TerminalSettings` rendered by GPUix's terminal
 * platform (`render(<App />, { terminal: true })`). `terminal-take.ts` runs this
 * inside a pty and decodes the frames it paints.
 */
import { render } from "@gpuix/react";
import { TerminalSettings } from "./terminal-app.js";

render(<TerminalSettings />, { terminal: true });
