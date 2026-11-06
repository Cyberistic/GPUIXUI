import { render } from "@gpuix/react";
import { App } from "./app.js";
import type { KeyEvent } from "@gpuix/react";
import { withWindowKeys, type KeyHandler } from "./keys.js";

let handler: KeyHandler | undefined;

render(
  withWindowKeys(
    (next) => {
      handler = next;
    },
    <App />,
  ),
  {
    terminal: true,
    onKeyDown: (event: KeyEvent) => handler?.(event),
  },
);
