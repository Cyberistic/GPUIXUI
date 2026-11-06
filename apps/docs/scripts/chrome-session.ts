import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const findChrome = (
  given: string | undefined,
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined =>
  given ??
  environment.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

export interface ChromeOptions {
  readonly preload?: string;
}

export interface CaptureOptions {
  readonly clip?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly format?: "png" | "webp";

  readonly quality?: number;
}

export interface ChromePage {
  readonly text: (expression: string) => Promise<string>;

  readonly run: (expression: string) => Promise<void>;

  readonly goto: (url: string) => Promise<void>;

  readonly capture: (options?: CaptureOptions) => Promise<Uint8Array>;
}

export const openChrome = async (
  chrome: string,
  url: string,
  width = 800,
  height = 600,
  options: ChromeOptions = {},
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
      field(
        await devtools.send("Target.createTarget", {
          url: options.preload === undefined ? url : "about:blank",
        }),
        "targetId",
      ),
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

    if (options.preload !== undefined) {
      await devtools.send("Page.enable", {}, sessionId);
      await devtools.send(
        "Page.addScriptToEvaluateOnNewDocument",
        { source: options.preload },
        sessionId,
      );
      await devtools.send("Page.navigate", { url }, sessionId);
    }

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
      goto: async (url) => {
        await devtools.send("Page.navigate", { url }, sessionId);
      },
      capture: async (options = {}) => {
        const { clip, format = "png", quality } = options;
        const captured = await devtools.send(
          "Page.captureScreenshot",
          {
            format,
            ...(quality === undefined ? {} : { quality }),
            ...(clip === undefined
              ? {}
              : { clip: { ...clip, scale: 1 }, captureBeyondViewport: true }),
          },
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
