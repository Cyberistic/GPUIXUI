#!/usr/bin/env node
/**
 * The build → preview plumbing both smoke checks share (plan 446). `smoke:build`
 * crawls the server HTML; `smoke:browser` hydrates it in headless Chrome. Each
 * needs the same "build, serve on a free loopback port, wait until it answers,
 * always stop it" sequence, and neither may mistake a setup failure for a pass.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { SetupError } from "./setup-error.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
/**
 * The merged toolchain starts `vite preview` through wrangler/workerd, and on
 * this host a cold start was measured at 45 s (`apps/docs/.wrangler` absent,
 * no competing preview). 30 s reported "could not verify" for a site that was
 * fine; the budget is 90 s so a slow start is still a pass but a hung one is
 * still a failure.
 */
const READY_TIMEOUT_MS = 90_000;

/** The CLI boundary: a setup failure is reported, never mistaken for a pass. */
export { SetupError };

export interface PreviewServer {
  readonly baseUrl: string;
  readonly stop: () => Promise<void>;
}

const run = (args: ReadonlyArray<string>): Promise<number> =>
  new Promise((resolve) => {
    const child = spawn("nub", [...args], { cwd: repoRoot, stdio: "inherit" });
    child.once("error", (error) => {
      console.error(`smoke: cannot run nub: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        address !== null && typeof address === "object" ? address.port : 0;
      server.close(() => {
        if (port === 0) reject(new SetupError("no free loopback port"));
        else resolve(port);
      });
    });
  });

const waitForServer = async (baseUrl: string): Promise<void> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "no attempt";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new SetupError(
    `preview did not answer on ${baseUrl} within ${READY_TIMEOUT_MS}ms (last: ${lastError})`,
  );
};

const stop = (child: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });

/** Build (unless asked not to), serve the production output, wait for it. */
export const startDocsPreview = async ({
  build,
  port: requestedPort = null,
  log = true,
}: {
  readonly build: boolean;
  readonly port?: number | null;
  readonly log?: boolean;
}): Promise<PreviewServer> => {
  if (build) {
    console.log("smoke: building apps/docs");
    const code = await run(["run", "--filter", "docs", "build"]);
    if (code !== 0) {
      throw new SetupError("build failed; the site was not verified");
    }
  }

  const port =
    requestedPort ??
    (await freePort().catch(() => {
      throw new SetupError("could not find a free loopback port");
    }));
  const child = spawn(
    "nub",
    [
      "run",
      "--filter",
      "docs",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl);
  } catch (error) {
    await stop(child);
    if (error instanceof SetupError) {
      throw new SetupError(`${error.message}\n${output}`);
    }
    throw error;
  }
  if (log) console.log(`smoke: serving ${baseUrl}`);
  return { baseUrl, stop: () => stop(child) };
};
