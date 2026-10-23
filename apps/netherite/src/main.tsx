/**
 * The terminal entrypoint: `nub run --filter netherite-tui terminal`.
 *
 * `render` is called once, with `terminal: true`; keys arrive through its
 * `onKeyDown` and are forwarded to the handler the app registered.
 */
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
