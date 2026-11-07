import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome, openChrome } from "./chrome-session.ts";
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

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const nativeDir = (root: string): string =>
  join(root, "apps/docs/node_modules/@gpuix/native");

const types: Readonly<Record<string, string>> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
};

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
    const sampled = await openChrome(
      chrome,
      served.url,
      probeBox.width + 380,
      600,
    )
      .then(async (session) => {
        let text = "";
        for (let attempt = 0; attempt < 150; attempt += 1) {
          text = await session.page.text(
            "document.getElementById('out')?.textContent ?? 'pending'",
          );
          if (text.includes("status=")) break;
          await new Promise((wait) => setTimeout(wait, 100));
        }

        await new Promise((wait) => setTimeout(wait, 500));
        const png = await session.page.capture();
        await writeFile(screenshot, png);
        return {
          report: parseReport(text),
          pixel: fillAt(png, probePoint.x, probePoint.y),
        };
      })
      .finally(() => {
        served.close();
        return rm(`${screenshot}.profile`, { force: true, recursive: true });
      });

    const verdict = judge({ ...sampled, colour });
    if (verdict.ok) console.log(`PASS ${colour} painted ${screenshot}`);
    else failures.push(`${colour}: ${verdict.reasons.join("; ")}`);
  }

  for (const failure of failures) console.error(`FAIL ${failure}`);
  return failures.length === 0 ? 0 : 1;
};

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
