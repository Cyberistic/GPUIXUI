/**
 * Prove that a real GPUix surface paints in a headless browser.
 *
 * Plan `440-live-gpuix-web-surface` rests on one unknown: `@gpuix/native` ships
 * a wasm browser build, and nobody had seen it paint, so the docs could not move
 * past a labelled reproduction. This probe is that measurement. For each fill in
 * `probeColours` it serves a cross-origin-isolated page, boots the published
 * glue against the published wasm, applies one mutation batch, waits for the
 * page to report itself, captures the frame over the DevTools protocol and
 * reads a pixel back out of the PNG. It passes only when
 *
 * 1. the renderer started and appended its `<canvas>`,
 * 2. the retained tree carries the text the batch set, and
 * 3. the sampled pixel **is the fill the batch set** — a blank frame captures
 *    perfectly well, so its existence proves nothing.
 *
 * The CLI screenshot flag cannot do this: headless Chrome captures at load, and
 * with `--virtual-time-budget` it fast-forwards the page's timers and captures
 * before the renderer's first frame — measured, and the reason this driver
 * speaks DevTools instead.
 *
 * It lives outside `src/` because it is a host tool, not a route: the docs app
 * still does not import the renderer, so `docs/preview-strategy.md` may keep
 * saying the surface is unmounted. The module is read from the copy
 * `apps/playground` installs — the same path `src/lib/gpuix-web.test.ts` reads —
 * because adding the dependency to the docs app is plan 440's first step and
 * belongs with the lockfile change it implies.
 *
 * Run: `nub apps/docs/scripts/live-surface-probe.ts`
 * Frames: `.artifacts/live/docs-live-surface-*.png` (verification-only).
 *
 * Measured on macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80 over
 * SwiftShader. See `docs/preview-strategy.md` §The paint is measured.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fillAt,
  isolationHeaders,
  judge,
  parseReport,
  probeBox,
  probeColours,
  probeHtml,
  probePoint,
} from "./live-frame.ts";

/** Where the repository root sits from this file. */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** The browser to drive: an argument, the environment, or this host's Chrome. */
export const findChrome = (
  given: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined =>
  given ??
  environment.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** The installed copy of the browser build the probe drives. */
export const nativeDir = (root: string): string =>
  join(root, "apps/playground/node_modules/@gpuix/native");

const types: Readonly<Record<string, string>> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
};

/** Serve the probe page and the wasm it loads, isolated and same-origin. */
const serve = async (
  native: string,
  colour: string,
): Promise<{ readonly url: string; readonly close: () => void }> => {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://probe").pathname;
    const file = path === "/" ? undefined : resolve(native, path.slice(1));

    if (path === "/") {
      response.writeHead(200, {
        "content-type": "text/html",
        ...isolationHeaders,
      });
      response.end(probeHtml(colour));
      return;
    }

    if (file === undefined || !file.startsWith(native)) {
      response.writeHead(403);
      response.end("outside the package");
      return;
    }

    try {
      const body = await readFile(file);
      const extension = file.slice(file.lastIndexOf("."));
      response.writeHead(200, {
        "content-type": types[extension] ?? "application/octet-stream",
        ...isolationHeaders,
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });

  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("the probe server did not bind a port");

  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => server.close(),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** One field of a JSON-RPC result, narrowed rather than asserted. */
const field = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

interface DevTools {
  readonly send: (
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string,
  ) => Promise<unknown>;
  readonly close: () => void;
}

interface Reply {
  readonly error?: unknown;
  readonly result?: unknown;
}

/** The browser's DevTools socket, once the endpoint is actually listening. */
const socketOf = async (port: number): Promise<string> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const version: unknown = await fetch(
      `http://127.0.0.1:${port}/json/version`,
    )
      .then((response) => response.json())
      .catch(() => undefined);
    const socketUrl = asText(field(version, "webSocketDebuggerUrl"));
    if (socketUrl !== undefined) return socketUrl;
    await new Promise((wait) => setTimeout(wait, 100));
  }

  throw new Error("the browser published no DevTools socket");
};

/** A DevTools session, enough of it to open a page and capture a frame. */
const connect = async (port: number): Promise<DevTools> => {
  const socket = new WebSocket(await socketOf(port));
  await new Promise<void>((open, fail) => {
    socket.addEventListener("open", () => open(), { once: true });
    socket.addEventListener(
      "error",
      () => fail(new Error("no DevTools socket")),
      {
        once: true,
      },
    );
  });

  const waiting = new Map<number, (reply: Reply) => void>();
  let next = 0;

  socket.addEventListener("message", (event) => {
    const parsed: unknown = JSON.parse(String(event.data));
    if (!isRecord(parsed) || typeof parsed.id !== "number") return;

    const settle = waiting.get(parsed.id);
    if (settle === undefined) return;
    waiting.delete(parsed.id);
    settle({ error: parsed.error, result: parsed.result });
  });

  const send = (
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<unknown> => {
    next += 1;
    const id = next;

    return new Promise((done, fail) => {
      waiting.set(id, (reply) => {
        if (reply.error !== undefined)
          fail(
            new Error(
              `${method}: ${asText(field(reply.error, "message")) ?? "failed"}`,
            ),
          );
        else done(reply.result);
      });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  };

  return { send, close: () => socket.close() };
};

/** Wait for the port Chrome writes into its profile directory. */
const portOf = async (profile: string): Promise<number> => {
  const file = join(profile, "DevToolsActivePort");

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const text = await readFile(file, "utf8").catch(() => undefined);
    const port = text === undefined ? Number.NaN : Number(text.split("\n")[0]);
    if (Number.isInteger(port) && port > 0) return port;
    await new Promise((wait) => setTimeout(wait, 100));
  }

  throw new Error("Chrome never opened a DevTools port");
};

/** Wait for the page's report, then capture and sample its frame. */
const run = async (
  chrome: string,
  url: string,
  screenshot: string,
): Promise<{
  readonly report: Readonly<Record<string, string>>;
  readonly pixel: string | undefined;
}> => {
  const profile = `${screenshot}.profile`;
  const child = spawn(
    chrome,
    [
      "--headless",
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      `--window-size=${probeBox.width + 380},600`,
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
    const devtools = await connect(await portOf(profile));
    const targetId = asText(
      field(await devtools.send("Target.createTarget", { url }), "targetId"),
    );
    if (targetId === undefined) throw new Error("the browser opened no page");

    const sessionId = asText(
      field(
        await devtools.send("Target.attachToTarget", {
          targetId,
          flatten: true,
        }),
        "sessionId",
      ),
    );
    if (sessionId === undefined) throw new Error("the page never attached");

    const read = async (): Promise<string> => {
      const result = await devtools.send(
        "Runtime.evaluate",
        {
          expression:
            "document.getElementById('out')?.textContent ?? 'pending'",
          returnByValue: true,
        },
        sessionId,
      );
      return asText(field(field(result, "result"), "value")) ?? "";
    };

    let text = "";
    for (let attempt = 0; attempt < 150; attempt += 1) {
      text = await read();
      if (text.includes("status=")) break;
      await new Promise((wait) => setTimeout(wait, 100));
    }

    // The report is written a frame after the batch; give the compositor the
    // same frame to paint before capturing it.
    await new Promise((wait) => setTimeout(wait, 500));
    const captured = await devtools.send(
      "Page.captureScreenshot",
      { format: "png" },
      sessionId,
    );
    const png = new Uint8Array(
      Buffer.from(asText(field(captured, "data")) ?? "", "base64"),
    );
    await writeFile(screenshot, png);
    devtools.close();

    return {
      report: parseReport(text),
      pixel: fillAt(png, probePoint.x, probePoint.y),
    };
  } finally {
    child.kill();
    // Wait for Chrome to let go of the profile, then delete the scratch dir: the
    // frame is the artefact, not the browser's state.
    await new Promise<void>((gone) => {
      if (child.exitCode !== null) gone();
      else {
        child.once("exit", () => gone());
        setTimeout(gone, 2000);
      }
    });
    await rm(profile, { force: true, recursive: true }).catch(() => undefined);
  }
};

/** Run the probe. Returns the process exit code. */
export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const outIndex = argv.indexOf("--out");
  const out = resolve(
    outIndex === -1
      ? join(repoRoot, ".artifacts/live")
      : (argv[outIndex + 1] ?? ""),
  );
  const chromeIndex = argv.indexOf("--chrome");
  const chrome = findChrome(
    chromeIndex === -1 ? undefined : argv[chromeIndex + 1],
    process.env,
  );
  if (chrome === undefined) {
    console.error("no browser: pass --chrome <path> or set CHROME_PATH");
    return 2;
  }

  const native = nativeDir(repoRoot);
  await mkdir(out, { recursive: true });

  const failures: Array<string> = [];

  for (const colour of probeColours) {
    const screenshot = join(
      out,
      `docs-live-surface-${colour.replace("#", "").toLowerCase()}.png`,
    );
    const served = await serve(native, colour);
    const sample = await run(chrome, served.url, screenshot).finally(
      served.close,
    );
    const verdict = judge({ ...sample, colour });
    if (verdict.ok) console.log(`PASS ${colour} painted ${screenshot}`);
    else failures.push(`${colour}: ${verdict.reasons.join("; ")}`);
  }

  for (const failure of failures) console.error(`FAIL ${failure}`);
  return failures.length === 0 ? 0 : 1;
};

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
