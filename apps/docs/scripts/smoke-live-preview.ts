#!/usr/bin/env node
/**
 * The live-surface smoke check (plan 455).
 *
 * Unlike `smoke:browser` this cannot use `--dump-dom` and virtual time: GPUI
 * presents its WebGPU canvas on a real frame, and a virtual-time screenshot is
 * black. It drives Chrome through CDP in real time and asserts what GPUI itself
 * reports:
 *
 * - `data-gpuix="ready"` on the document once the canvas exists;
 * - the scene's real text in `getAllText()` — the component reached the tree;
 * - an unknown scene reports `data-gpuix="failed"` with a reason.
 *
 *   nub scripts/smoke-live-preview.ts [--base-url <url>] [--chrome <path>] [--no-build]
 *
 * Exit `0` pass, `1` the surface is wrong, `2` the check could not run.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

const READY_TIMEOUT_MS = 30_000;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].flatMap((candidate) => (candidate === undefined ? [] : [candidate]));

interface Options {
  readonly baseUrl: string | null;
  readonly chrome: string | null;
  readonly build: boolean;
}

const usage =
  "usage: nub scripts/smoke-live-preview.ts [--base-url <url>] [--chrome <path>] [--no-build]";

const parseOptions = (argv: ReadonlyArray<string>): Options => {
  let baseUrl: string | null = null;
  let chrome: string | null = null;
  let build = true;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--no-build") build = false;
    else if (argument === "--help" || argument === "-h") {
      console.log(usage);
      process.exit(0);
    } else if (argument === "--base-url" || argument === "--chrome") {
      const value = argv[index + 1];
      if (value === undefined)
        throw new SetupError(`${argument} needs a value`);
      if (argument === "--base-url") {
        try {
          new URL(value);
        } catch {
          throw new SetupError(`--base-url is not a URL: ${value}`);
        }
        baseUrl = value;
      } else chrome = value;
      index += 1;
    } else throw new SetupError(`unknown argument: ${argument}`);
  }
  return { baseUrl, chrome, build };
};

const findChrome = (requested: string | null): string => {
  const candidates = requested === null ? CHROME_CANDIDATES : [requested];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found !== undefined) return found;
  throw new SetupError(
    `no Chrome found (tried ${candidates.join(", ")}); set CHROME_PATH or pass --chrome`,
  );
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

interface Session {
  readonly evaluate: (expression: string) => Promise<unknown>;
  readonly navigate: (url: string) => Promise<void>;
  readonly stop: () => Promise<void>;
}

/** Launch Chrome and connect to the first page target. */
const startSession = async (chrome: string): Promise<Session> => {
  const profile = mkdtempSync(join(tmpdir(), "gpuixui-live-"));
  const port = await freePort();
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--enable-unsafe-swiftshader",
      "--enable-unsafe-webgpu",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      "--window-size=640,360",
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

  return { evaluate, navigate, stop };
};

interface SurfaceState {
  readonly state: string;
  readonly reason?: string;
  readonly canvas: [number, number];
}

const readSurface = async (session: Session): Promise<SurfaceState> => {
  const raw = await session.evaluate(
    "JSON.stringify({ state: document.documentElement.dataset.gpuix, reason: document.documentElement.dataset.reason, canvas: [document.querySelector('canvas')?.width ?? 0, document.querySelector('canvas')?.height ?? 0] })",
  );
  return JSON.parse(String(raw)) as SurfaceState;
};

const waitForSurface = async (session: Session): Promise<SurfaceState> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    const surface = await readSurface(session);
    if (surface.state === "ready" || surface.state === "failed") return surface;
    if (Date.now() > deadline) {
      return { state: "timeout", canvas: surface.canvas };
    }
    await sleep(250);
  }
};

const paintedText = async (
  session: Session,
): Promise<ReadonlyArray<string>> => {
  const raw = await session.evaluate(
    "(async () => globalThis.gpuix === undefined ? '[]' : JSON.stringify((await globalThis.gpuix.call('getAllText', {})).text))()",
  );
  return JSON.parse(String(raw)) as ReadonlyArray<string>;
};

interface PageSurface {
  readonly state: string;
  readonly reason?: string;
  readonly src?: string;
  readonly canvas?: [number, number];
}

/**
 * Open a docs page, click its live-preview control and read the iframe.
 * The SSR markup ships the control before React attaches its handler, so the
 * click waits for hydration and retries while the iframe boots.
 */
const openPageSurface = async (
  session: Session,
  page: string,
): Promise<PageSurface> => {
  await session.navigate(page);
  await sleep(2_500);
  const clicked = await session.evaluate(`(async () => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const button = [...document.querySelectorAll("button")].find(
        (candidate) => candidate.textContent === "Load live preview",
      );
      if (button !== undefined) {
        button.click();
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  })()`);
  if (clicked !== true) return { state: "no-control" };

  const embedded = await session.evaluate(`(async () => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const frame = document.querySelector('iframe[title^="Live GPUix surface"]');
      const state = frame?.contentDocument?.documentElement?.dataset.gpuix;
      if (state === "ready") {
        const canvas = frame?.contentDocument?.querySelector("canvas");
        return JSON.stringify({
          state,
          src: frame?.getAttribute("src") ?? "",
          canvas: [canvas?.width ?? 0, canvas?.height ?? 0],
        });
      }
      if (state === "failed") {
        return JSON.stringify({
          state,
          reason: frame?.contentDocument?.documentElement?.dataset.reason,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return JSON.stringify({ state: "timeout" });
  })()`);
  return JSON.parse(String(embedded)) as PageSurface;
};

const main = async (): Promise<number> => {
  let preview: PreviewServer | null = null;
  let session: Session | null = null;
  try {
    const options = parseOptions(process.argv.slice(2));
    const chrome = findChrome(options.chrome);
    let baseUrl = options.baseUrl;
    if (baseUrl === null) {
      const server = await startDocsPreview({ build: options.build });
      preview = server;
      baseUrl = server.baseUrl;
    }

    session = await startSession(chrome);
    const scene = `${baseUrl}/gpuix-preview/?scene=button&platform=win32&mode=dark`;
    console.log(`smoke: loading ${scene}`);
    await session.navigate(scene);
    const surface = await waitForSurface(session);

    if (surface.state !== "ready") {
      console.error(
        `FAIL live surface: state=${surface.state}${surface.reason === undefined ? "" : ` reason=${surface.reason}`}`,
      );
      return 1;
    }
    if (surface.canvas[0] === 0 || surface.canvas[1] === 0) {
      console.error("FAIL live surface: GPUI created no sized canvas");
      return 1;
    }
    const text = await paintedText(session);
    if (!text.includes("Save changes")) {
      console.error(
        `FAIL live surface: the Button scene did not reach the GPUI tree (${JSON.stringify(text)})`,
      );
      return 1;
    }
    console.log(
      `smoke: live surface ready — ${surface.canvas[0]}x${surface.canvas[1]} canvas, ${text.length} text nodes`,
    );

    await session.navigate(`${baseUrl}/gpuix-preview/?scene=not-a-scene`);
    const failed = await waitForSurface(session);
    if (failed.state !== "failed" || failed.reason === undefined) {
      console.error(
        `FAIL live surface: an unknown scene reported ${failed.state}, not a reason`,
      );
      return 1;
    }
    console.log(`smoke: unknown scene reported — ${failed.reason}`);

    // The surface working on its own is not the feature: the page must load it
    // on request, with the docs' platform and mode, and the iframe must reach
    // GPUI. This drives the real component page, then the Theming page with the
    // Windows platform in the URL.
    const componentPage = await openPageSurface(
      session,
      `${baseUrl}/docs/components/button`,
    );
    if (componentPage.state !== "ready") {
      console.error(
        `FAIL live surface: the component page reported ${componentPage.state}${componentPage.reason === undefined ? "" : ` (${componentPage.reason})`}`,
      );
      return 1;
    }
    if (!(componentPage.src ?? "").includes("scene=button")) {
      console.error(
        `FAIL live surface: the component page's iframe lost its scene (${componentPage.src ?? ""})`,
      );
      return 1;
    }
    console.log(
      `smoke: component page loaded the live iframe — ${componentPage.src} (${componentPage.canvas?.[0] ?? 0}x${componentPage.canvas?.[1] ?? 0})`,
    );

    const themed = await openPageSurface(
      session,
      `${baseUrl}/docs/theming?platform=win32`,
    );
    if (themed.state !== "ready") {
      console.error(
        `FAIL live surface: the Theming page reported ${themed.state}${themed.reason === undefined ? "" : ` (${themed.reason})`}`,
      );
      return 1;
    }
    if (!(themed.src ?? "").includes("platform=win32")) {
      console.error(
        `FAIL live surface: the platform toggle did not reach the iframe (${themed.src ?? ""})`,
      );
      return 1;
    }
    console.log(
      `smoke: the platform toggle reached the live surface — ${themed.src}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof SetupError) {
      console.error(`smoke: not verified — ${error.message}`);
      return 2;
    }
    throw error;
  } finally {
    if (session !== null) await session.stop();
    if (preview !== null) await preview.stop();
  }
};

// A hung CDP command must not keep the command alive forever; the gate reports
// "could not verify" rather than hanging a release check.
setTimeout(() => {
  console.error("smoke: not verified — the check did not finish in 120s");
  process.exit(2);
}, 120_000).unref();

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(
      `smoke: failed — ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 2;
  },
);
