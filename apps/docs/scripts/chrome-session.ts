/**
 * A headless Chrome page target driven over CDP (plan 495).
 *
 * `smoke:preview` needs real time and a WebGPU canvas; `smoke:browser` needs to
 * read a hydrated document for every preview page. Both need one browser they
 * can navigate repeatedly, so the launch, the socket, the command plumbing and
 * the colour-scheme emulation live here instead of in each script.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { SetupError } from "./setup-error.ts";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].flatMap((candidate) => (candidate === undefined ? [] : [candidate]));

export const findChrome = (requested: string | null): string => {
  const candidates = requested === null ? CHROME_CANDIDATES : [requested];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found !== undefined) return found;
  throw new SetupError(
    `no Chrome found (tried ${candidates.join(", ")}); set CHROME_PATH or pass --chrome`,
  );
};

export interface Session {
  readonly evaluate: (expression: string) => Promise<unknown>;
  readonly navigate: (url: string) => Promise<void>;
  readonly setColorScheme: (mode: "light" | "dark") => Promise<void>;
  /** The layout viewport a reader's device gives the page. */
  readonly setViewport: (width: number, height: number) => Promise<void>;
  /** Dispatch one real key press, so focus traversal and activation are the browser's. */
  readonly press: (key: SessionKey) => Promise<void>;
  /** Whether `expression` became `true` within the timeout; polls every 100 ms. */
  readonly waitFor: (
    expression: string,
    timeoutMs?: number,
  ) => Promise<boolean>;
  readonly captureScreenshot: () => Promise<string>;
  readonly stop: () => Promise<void>;
}

/** The keys the smokes drive; the numeric codes are the Windows virtual keys. */
export type SessionKey = "Tab" | "Enter";

const KEY_CODES: Readonly<Record<SessionKey, number>> = {
  Tab: 9,
  Enter: 13,
};

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        address !== null && typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

/**
 * Launch Chrome and connect to the first page target. The window is small
 * because both callers read a document or a canvas, never a layout a reader
 * sees.
 */
export const startSession = async (
  chrome: string,
  profilePrefix = "gpuixui-chrome-",
): Promise<Session> => {
  const profile = mkdtempSync(join(tmpdir(), profilePrefix));
  const port = await freePort();
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--enable-unsafe-swiftshader",
      "--enable-unsafe-webgpu",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      "--window-size=640,720",
      `--remote-debugging-port=${port}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const stop = async (): Promise<void> => {
    socket.close();
    child.kill("SIGKILL");
    // Chrome may still be flushing its profile; a temp directory is not worth
    // failing the check over, so retry briefly and then leave it to the OS.
    try {
      rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    } catch {
      // The profile lives under the OS temp directory.
    }
  };

  let target: string | null = null;
  const deadline = Date.now() + 15_000;
  while (target === null && Date.now() < deadline) {
    await sleep(200);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = (await response.json()) as ReadonlyArray<{
        type: string;
        webSocketDebuggerUrl?: string;
      }>;
      target =
        pages.find((page) => page.type === "page")?.webSocketDebuggerUrl ??
        null;
    } catch {
      target = null;
    }
  }
  if (target === null) {
    await stop();
    throw new SetupError("Chrome exposed no CDP page target");
  }

  const socket = new WebSocket(target);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP socket")), {
      once: true,
    });
  });

  let nextId = 1;
  const pending = new Map<number, (value: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
    };
    const resolve =
      message.id === undefined ? undefined : pending.get(message.id);
    if (resolve !== undefined && message.id !== undefined) {
      pending.delete(message.id);
      resolve(message.result);
    }
  });

  const send = (method: string, params: object = {}): Promise<unknown> =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const evaluate = async (expression: string): Promise<unknown> => {
    const result = (await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })) as {
      result?: { value?: unknown };
      exceptionDetails?: { text: string; exception?: { description?: string } };
    };
    if (result.exceptionDetails !== undefined) {
      const detail =
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text;
      throw new Error(`page threw: ${detail}`);
    }
    return result.result?.value;
  };

  const navigate = async (url: string): Promise<void> => {
    await send("Page.navigate", { url });
  };

  // The docs page colour scheme must not depend on the host's preference: a
  // gate checks a named mode, so it forces one. The emulation survives
  // navigation for this target.
  const setColorScheme = async (mode: "light" | "dark"): Promise<void> => {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: mode }],
    });
  };

  const setViewport = async (width: number, height: number): Promise<void> => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    });
  };

  const waitFor = async (
    expression: string,
    timeoutMs = 15_000,
  ): Promise<boolean> => {
    const limit = Date.now() + timeoutMs;
    while (Date.now() < limit) {
      if ((await evaluate(expression)) === true) return true;
      await sleep(100);
    }
    return false;
  };

  // A focus assertion must come from the browser's own traversal: `press`
  // dispatches the same key events a reader produces, so Tab moves focus and
  // Enter activates the focused element (plan 496). Enter needs the `char`
  // event for the anchor's default action.
  const press = async (key: SessionKey): Promise<void> => {
    const code = KEY_CODES[key];
    const base = {
      key,
      code: key,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: code,
    };
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
    if (key === "Enter") {
      await send("Input.dispatchKeyEvent", {
        type: "char",
        ...base,
        text: "\r",
        unmodifiedText: "\r",
      });
    }
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  };

  const captureScreenshot = async (): Promise<string> => {
    const result = await send("Page.captureScreenshot", { format: "png" });
    return typeof result === "object" &&
      result !== null &&
      "data" in result &&
      typeof result.data === "string"
      ? result.data
      : "";
  };

  return {
    evaluate,
    navigate,
    setColorScheme,
    setViewport,
    press,
    waitFor,
    captureScreenshot,
    stop,
  };
};
