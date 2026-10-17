#!/usr/bin/env node
/**
 * Builds the live preview surface (plan 455) into `public/gpuix-preview/`.
 *
 * The output is a build artefact, not repository content: it is gitignored and
 * rebuilt by `dev` and `build`. The script only exists so the size the reader
 * downloads is visible in the log, and so a missing wasm fails here rather than
 * in a browser.
 */

import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const output = fileURLToPath(
  new URL("../public/gpuix-preview", import.meta.url),
);

const megabytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const main = async (): Promise<number> => {
  await build({
    configFile: fileURLToPath(
      new URL("../vite.preview.config.ts", import.meta.url),
    ),
  });

  const assets = readdirSync(`${output}/assets`);
  const wasm = assets.find((name) => name.endsWith(".wasm"));
  if (wasm === undefined) {
    console.error("preview: the build emitted no wasm asset");
    return 1;
  }
  const bytes = statSync(`${output}/assets/${wasm}`).size;
  console.log(`preview: built ${output} (${megabytes(bytes)} renderer)`);
  return 0;
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(
      `preview: build failed — ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  },
);
