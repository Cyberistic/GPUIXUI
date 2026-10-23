/**
 * Locating and running the Netherite CLI.
 *
 * The checkout is found the way the binary finds its own root: a directory that
 * holds `AGENTS.md` and `csrc/Makefile`. `NETHERITE_DIR` wins when set, then
 * the reference clone, then the walk up from the app.
 *
 * Spawning stays at this boundary — the app hands a verb over and receives
 * lines, so the UI never owns a process handle.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The binary inside a checkout. */
export const binaryOf = (root: string): string => join(root, "out", "bin", "netherite");

/** Whether a directory is a Netherite checkout. */
export const isCheckout = (dir: string): boolean =>
  existsSync(join(dir, "AGENTS.md")) && existsSync(join(dir, "csrc", "Makefile"));

/** The checkout, or `undefined` when none is reachable. */
export const findRoot = (
  from: string = process.cwd(),
  env: string | undefined = process.env.NETHERITE_DIR,
): string | undefined => {
  if (env !== undefined && isCheckout(env)) return resolve(env);
  let dir = resolve(from);
  while (true) {
    if (isCheckout(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
};

/** What the header reports about a checkout. */
export interface Checkout {
  readonly root: string;
  readonly built: boolean;
  readonly assets: boolean;
}

export const inspect = (root: string): Checkout => ({
  root,
  built: existsSync(binaryOf(root)),
  assets: existsSync(join(root, "out", "assets")),
});

/** One running verb: lines in, a cancel out. */
export interface Run {
  readonly cancel: () => void;
}

/**
 * Run `out/bin/netherite <verb>`, streaming stdout and stderr line by line.
 * Resolves through `onLine`; `onExit` reports the code (or `undefined` when the
 * spawn failed before a process existed).
 */
export const startVerb = (
  checkout: Checkout,
  argv: ReadonlyArray<string>,
  onLine: (line: string) => void,
  onExit: (code: number | undefined) => void,
): Run => {
  if (!checkout.built) {
    onLine(`netherite is not built at ${checkout.root}`);
    onLine("run `make` in the checkout, or run setup from this list");
    onExit(undefined);
    return { cancel: () => {} };
  }

  let child: ChildProcess | undefined;
  try {
    child = spawn(binaryOf(checkout.root), [...argv], {
      cwd: checkout.root,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
  } catch (cause) {
    onLine(`netherite could not start: ${String(cause)}`);
    onExit(undefined);
    return { cancel: () => {} };
  }

  const push = (chunk: Buffer): void => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.length > 0) onLine(line);
    }
  };
  child.stdout?.on("data", push);
  child.stderr?.on("data", push);
  child.on("error", (cause) => {
    onLine(`netherite failed: ${cause.message}`);
    onExit(undefined);
  });
  child.on("close", (code) => onExit(code ?? undefined));

  return {
    cancel: () => {
      child?.kill("SIGTERM");
    },
  };
};
