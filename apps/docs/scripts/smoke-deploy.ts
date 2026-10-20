#!/usr/bin/env node
/**
 * Deployment artifact smoke check (plan 609).
 *
 * A deploy needs Cloudflare credentials; packaging the artifact does not. This
 * check builds the docs app, runs `wrangler deploy --dry-run` against the config
 * the Cloudflare Vite plugin generated, and measures the real output directory
 * against Cloudflare's published limits. It is the evidence `/docs/deployment`
 * cites for "the artifact is verified" while the account deploy stays
 * explicitly unverified.
 *
 *   nub scripts/smoke-deploy.ts [--no-build]
 *
 * Exit `0` pass, `1` a config mismatch or a budget was exceeded, `2` the check
 * could not run (missing build output, no wrangler, or the build failed) — the
 * same "unverified is not a pass" rule as the other docs and native smokes.
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import {
  cloudflareLimits,
  docsWorker,
  jsoncString,
  jsoncStringArray,
  liveSurfaceAssets,
} from "../src/lib/deployment.ts";
import { SetupError } from "./setup-error.ts";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const clientDir = join(appRoot, "dist", "client");
const serverDir = join(appRoot, "dist", "server");
const generatedConfig = join(serverDir, "wrangler.json");
const wranglerSource = join(appRoot, "wrangler.jsonc");

/** The subset of the generated `wrangler.json` this check reads. */
const GeneratedConfig = Schema.Struct({
  name: Schema.String,
  main: Schema.String,
  assets: Schema.Struct({ directory: Schema.String }),
  compatibility_date: Schema.String,
  compatibility_flags: Schema.Array(Schema.String),
});
const decodeGeneratedConfig = Schema.decodeUnknownSync(
  Schema.fromJsonString(GeneratedConfig),
);

interface Options {
  readonly build: boolean;
}

interface Problem {
  readonly what: string;
}

interface Asset {
  readonly path: string;
  readonly bytes: number;
}

const usage = "usage: nub scripts/smoke-deploy.ts [--no-build]";

const parseOptions = (argv: ReadonlyArray<string>): Options => {
  const unknown = argv.filter((argument) => argument !== "--no-build");
  if (unknown.length > 0) {
    throw new SetupError(`${usage}; unknown argument "${unknown[0]}"`);
  }
  return { build: !argv.includes("--no-build") };
};

const megabytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

const walk = (directory: string): ReadonlyArray<Asset> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : [{ path, bytes: statSync(path).size }];
  });

const relativeToApp = (path: string): string => relative(appRoot, path);

const run = (
  args: ReadonlyArray<string>,
  capture: boolean,
): Promise<{ readonly code: number; readonly output: string }> =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn("nub", args, {
      cwd: repoRoot,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    if (capture) {
      child.stdout?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
    }
    child.once("error", rejectRun);
    child.once("exit", (code) => resolveRun({ code: code ?? 1, output }));
  });

const lastLines = (output: string, count: number): string =>
  output.trimEnd().split("\n").slice(-count).join("\n");

const checkConfig = (): ReadonlyArray<Problem> => {
  const source = readFileSync(wranglerSource, "utf8");
  const config = decodeGeneratedConfig(readFileSync(generatedConfig, "utf8"));
  const expectedFlags = jsoncStringArray(source, "compatibility_flags");
  const problems: Array<Problem> = [];

  if (config.name !== docsWorker.name) {
    problems.push({
      what: `generated Worker name "${config.name}" is not "${docsWorker.name}"`,
    });
  }
  if (jsoncString(source, "name") !== docsWorker.name) {
    problems.push({
      what: `wrangler.jsonc name is not "${docsWorker.name}"`,
    });
  }
  if (config.compatibility_date !== jsoncString(source, "compatibility_date")) {
    problems.push({
      what: `generated compatibility_date "${config.compatibility_date}" is not the one wrangler.jsonc declares`,
    });
  }
  if (config.compatibility_flags.join(",") !== expectedFlags.join(",")) {
    problems.push({
      what: `generated compatibility_flags [${config.compatibility_flags.join(", ")}] are not [${expectedFlags.join(", ")}]`,
    });
  }
  if (!existsSync(join(serverDir, config.main))) {
    problems.push({
      what: `generated Worker entry "${config.main}" does not exist`,
    });
  }
  if (resolve(serverDir, config.assets.directory) !== resolve(clientDir)) {
    problems.push({
      what: `generated assets directory "${config.assets.directory}" does not resolve to dist/client`,
    });
  }

  return problems;
};

const checkBudgets = (): {
  readonly problems: ReadonlyArray<Problem>;
  readonly files: number;
  readonly largest: Asset;
  readonly workerBytes: number;
} => {
  const assets = walk(clientDir);
  const largest = assets.reduce((biggest, asset) =>
    asset.bytes > biggest.bytes ? asset : biggest,
  );
  const workerBytes = walk(serverDir)
    .filter((asset) => /\.m?js$/.test(asset.path))
    .reduce((total, asset) => total + asset.bytes, 0);
  const wasmRoot = join(repoRoot, liveSurfaceAssets);
  const wasm =
    existsSync(wasmRoot) &&
    walk(wasmRoot).some((asset) => asset.path.endsWith(".wasm"));

  const problems: Array<Problem> = [];
  if (assets.length > cloudflareLimits.assetsPerVersion) {
    problems.push({
      what: `${assets.length} files exceed the ${cloudflareLimits.assetsPerVersion} assets-per-version limit`,
    });
  }
  if (largest.bytes > cloudflareLimits.bytesPerAsset) {
    problems.push({
      what: `${relativeToApp(largest.path)} is ${megabytes(largest.bytes)}, over the ${megabytes(cloudflareLimits.bytesPerAsset)} per-asset limit`,
    });
  }
  if (workerBytes > cloudflareLimits.workerBytes) {
    problems.push({
      what: `the Worker's JavaScript is ${megabytes(workerBytes)}, over the ${megabytes(cloudflareLimits.workerBytes)} limit`,
    });
  }
  if (!wasm) {
    problems.push({
      what: `no wasm under ${liveSurfaceAssets}; the live surface's budget was not measured`,
    });
  }

  return { problems, files: assets.length, largest, workerBytes };
};

const main = async (): Promise<number> => {
  const options = parseOptions(process.argv.slice(2));

  if (options.build) {
    console.log("deploy: building apps/docs");
    const build = await run(["run", "--filter", "docs", "build"], false);
    if (build.code !== 0) {
      throw new SetupError("build failed; the deployment was not verified");
    }
  }
  if (!existsSync(generatedConfig)) {
    throw new SetupError(
      "dist/server/wrangler.json is missing; run the build first",
    );
  }

  const configProblems = checkConfig();
  if (configProblems.length > 0) {
    for (const problem of configProblems) console.error(`FAIL ${problem.what}`);
    return 1;
  }

  const outdir = mkdtempSync(join(tmpdir(), "gpuixui-deploy-"));
  try {
    const dryRun = await run(
      [
        "x",
        "wrangler",
        "deploy",
        "--dry-run",
        "--config",
        generatedConfig,
        "--outdir",
        outdir,
      ],
      true,
    );
    if (dryRun.code !== 0) {
      console.error(lastLines(dryRun.output, 10));
      console.error(
        "FAIL wrangler deploy --dry-run did not accept the artifact",
      );
      return 1;
    }
  } finally {
    rmSync(outdir, { recursive: true, force: true });
  }

  const measured = checkBudgets();
  if (measured.problems.length > 0) {
    for (const problem of measured.problems)
      console.error(`FAIL ${problem.what}`);
    return 1;
  }

  console.log(
    `deploy: ${measured.files} files, largest ${relativeToApp(measured.largest.path)} ${megabytes(measured.largest.bytes)}, worker ${megabytes(measured.workerBytes)}, dry run 0`,
  );
  return 0;
};

try {
  process.exitCode = await main();
} catch (error) {
  console.error(
    `deploy: not verified — ${error instanceof SetupError ? error.message : String(error)}`,
  );
  process.exitCode = 2;
}
