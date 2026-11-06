/**
 * The docs server a capture script drives, and the poll that finds it.
 *
 * Two scripts need the same rule — the block thumbnails and the native
 * previews — so the process lifecycle lives here: reuse the server `--url`
 * names, else one already answering on this app's own port, else start one and
 * stop it when the run is done. The readiness path is content, not `/live`,
 * because booting the wasm to ask whether the server is up would make the
 * check cost a renderer initialisation.
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The docs server's own port (`apps/docs/vite.config.ts`). */
export const docsPort = 4175;

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

const reachable = (url: string): Promise<boolean> =>
  fetch(url).then(
    (response) => response.ok,
    () => false,
  );

/** The docs server to capture from, and the close that stops one we started. */
export const docsServer = async (
  url: string | undefined,
): Promise<{ readonly url: string; readonly close: () => Promise<void> }> => {
  const base = url ?? `http://localhost:${docsPort}`;
  const ready = `${base}/introduction`;
  if (await reachable(ready)) {
    return { url: base, close: () => Promise.resolve() };
  }
  if (url !== undefined) {
    throw new Error(`no docs server answers at ${url}`);
  }

  const server = spawn("nub", ["run", "dev"], {
    cwd: appRoot,
    detached: true,
    stdio: "ignore",
  });
  let spawnError: Error | undefined;
  server.once("error", (error) => {
    spawnError = error;
  });
  const stop = async (): Promise<void> => {
    if (server.pid !== undefined) process.kill(-server.pid, "SIGTERM");
  };

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (spawnError !== undefined) {
      await stop();
      throw new Error(`\`nub run dev\` did not start: ${spawnError.message}`);
    }
    if (await reachable(ready)) {
      return { url: base, close: stop };
    }
    await sleep(500);
  }
  await stop();
  throw new Error(
    `the docs server never answered at ${base}; run \`nub run dev:docs\` and pass --url`,
  );
};
