/**
 * A headless Chrome page, enough of it to evaluate a script and capture a frame.
 *
 * Two docs probes drive a browser: `live-surface-probe.ts` (the spike that
 * proved the wasm paints) and `live-route-probe.ts` (that proof, through the
 * `/live` route). Neither can use `--screenshot`: headless Chrome captures at
 * load, and with `--virtual-time-budget` it fast-forwards the page's timers and
 * captures before the renderer's first frame. Measured — see
 * `docs/preview-strategy.md` §The paint is measured. So both speak DevTools.
 *
 * A host tool: it is never imported by a route.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The browser to drive: an argument, the environment, or this host's Chrome. */
export const findChrome = (
  given: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined =>
  given ??
  environment.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** One field of a JSON-RPC result, narrowed rather than asserted. */
const field = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

interface Reply {
  readonly error?: unknown;
  readonly result?: unknown;
}

interface DevTools {
  readonly send: (
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string,
  ) => Promise<unknown>;
  readonly close: () => void;
}

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
        if (reply.error !== undefined) {
          fail(
            new Error(
              `${method}: ${asText(field(reply.error, "message")) ?? "failed"}`,
            ),
          );
        } else done(reply.result);
      });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  };

  return { send, close: () => socket.close() };
};

/** A page open in the browser, and the frame it paints. */
export interface ChromePage {
  /** Evaluate an expression in the page, and read its string result. */
  readonly text: (expression: string) => Promise<string>;
  /** Evaluate an expression for its side effect. */
  readonly run: (expression: string) => Promise<void>;
  /** The page as a PNG. */
  readonly capture: () => Promise<Uint8Array>;
}

/** Open `url` in a headless browser at `width`×`height` CSS pixels. */
export const openChrome = async (
  chrome: string,
  url: string,
  width = 800,
  height = 600,
): Promise<{
  readonly page: ChromePage;
  readonly close: () => Promise<void>;
}> => {
  const profile = await mkdtemp(join(tmpdir(), "gpuix-chrome-"));
  const child = spawn(
    chrome,
    [
      "--headless",
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      `--window-size=${width},${height}`,
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const stop = async (): Promise<void> => {
    child.kill();
    await new Promise<void>((gone) => {
      if (child.exitCode !== null) gone();
      else {
        child.once("exit", () => gone());
        setTimeout(gone, 2000);
      }
    });
    await rm(profile, { force: true, recursive: true }).catch(() => undefined);
  };

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

    const evaluate = async (expression: string): Promise<unknown> =>
      field(
        await devtools.send(
          "Runtime.evaluate",
          { expression, returnByValue: true, awaitPromise: true },
          sessionId,
        ),
        "result",
      );

    const page: ChromePage = {
      text: async (expression) => {
        const result = await evaluate(expression);
        return asText(field(result, "value")) ?? "";
      },
      run: async (expression) => {
        await evaluate(expression);
      },
      capture: async () => {
        const captured = await devtools.send(
          "Page.captureScreenshot",
          { format: "png" },
          sessionId,
        );
        return new Uint8Array(
          Buffer.from(asText(field(captured, "data")) ?? "", "base64"),
        );
      },
    };

    return {
      page,
      close: async () => {
        devtools.close();
        await stop();
      },
    };
  } catch (error) {
    await stop();
    throw error;
  }
};
