// Serve the built docs the way the deployed Worker does, and measure both
// layers the way Cloudflare meters them.
//
// Cloudflare answers a request that matches a static asset *before* the Worker
// is invoked, with `html_handling: drop-trailing-slash`
// (packages/deploy/alchemy.run.docs.ts): `/docs/x` is `docs/x/index.html`. A
// request with no asset falls through to the Worker, which is this script's
// second layer. CPU is read from `process.cpuUsage()` around a request that
// reaches the Worker, the same quantity a Worker's CPU limit meters, and is
// reported as `-` when the asset layer answered: no Worker ran.
//
// The deploy bundles the Worker with `process.env.NODE_ENV` baked to
// `"production"` (alchemy's rolldown build), so the harness sets it before
// importing; without it Node resolves react-dom's development build and every
// render measures roughly twice its deployed cost.
//
// usage: node .agents/slop/bench/preview-server.mjs [port]
//        node .agents/slop/bench/preview-server.mjs --bench [iterations] [route ...]
//
// In server mode the response carries `x-gpuix-layer: asset|worker`, so a
// request that did no render work says so.

process.env.NODE_ENV = "production";

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("../../../apps/docs/", import.meta.url));
const clientDir = join(appDir, "dist/client");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
};

const isFile = async (path) => {
  const found = await stat(path).catch(() => undefined);
  return found?.isFile() === true;
};

/**
 * The asset the request path names, or `undefined`.
 *
 * An exact file wins (`/llms.txt`, `/assets/x.js`); otherwise
 * `drop-trailing-slash` serves `/x` from `x.html` or `x/index.html`, and `/x/`
 * is a redirect to `/x`. `/` is `index.html`.
 */
export const assetOf = async (pathname) => {
  const exact = join(clientDir, pathname);
  if (pathname !== "/" && (await isFile(exact))) return exact;

  const path = pathname === "/" ? "/index.html" : pathname;
  if (path === "/index.html") return join(clientDir, "index.html");
  for (const candidate of [`${path}.html`, join(path, "index.html")]) {
    const found = join(clientDir, candidate);
    if (await isFile(found)) return found;
  }
  return undefined;
};

/** The Worker entry the deploy uploads, loaded once. */
const worker = async () => {
  const entry = await import(
    new URL("../../../apps/docs/dist/server/server.js", import.meta.url).href
  );
  return entry.default;
};

const respond = async (request, response, layers, entry) => {
  const url = new URL(request.url, "http://localhost");
  const asset = await assetOf(url.pathname);
  const body = asset === undefined ? undefined : await readFile(asset);

  if (body !== undefined) {
    layers.asset += 1;
    response.writeHead(200, {
      "content-type": types[extname(asset)] ?? "application/octet-stream",
      "cache-control":
        extname(asset) === ".html"
          ? "public, max-age=0, must-revalidate"
          : "public, max-age=31536000, immutable",
      "x-gpuix-layer": "asset",
    });
    response.end(body);
    return;
  }

  layers.worker += 1;
  const answer = await entry.fetch(new Request(url, { method: request.method }), {
    waitUntil() {},
    passThroughOnException() {},
  });
  const html = new Uint8Array(await answer.arrayBuffer());
  response.writeHead(answer.status, {
    ...Object.fromEntries(answer.headers),
    "content-length": String(html.byteLength),
    "x-gpuix-layer": "worker",
  });
  response.end(html);
};

/** Start the emulated deployment: asset layer first, then the Worker. */
export const startServer = async (port = 0) => {
  const entry = await worker();
  const layers = { asset: 0, worker: 0 };
  const server = createServer((request, response) => {
    respond(request, response, layers, entry).catch((error) => {
      response.writeHead(500, { "content-type": "text/plain" });
      response.end(String(error));
    });
  });
  await new Promise((done) => server.listen(port, "127.0.0.1", done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    layers,
    close: () => new Promise((done) => server.close(done)),
  };
};

const serve = async (port) => {
  const { url, layers, close } = await startServer(port);
  console.log(`listening on ${url}`);
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(JSON.stringify(layers));
      close();
    });
  }
};

const bench = async (iterations, routes) => {
  const entry = await worker();
  const server = createServer((request, response) => {
    respond(request, response, { asset: 0, worker: 0 }, entry).catch(() => {});
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address();

  // One request per route first: module evaluation and a route's first render
  // are startup cost, not the per-request cost the Worker limit meters.
  for (const route of routes) await fetch(`http://127.0.0.1:${port}${route}`);

  const request = async (path) => {
    const before = process.cpuUsage();
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    const body = await response.arrayBuffer();
    const cpu = process.cpuUsage(before);
    return {
      status: response.status,
      layer: response.headers.get("x-gpuix-layer"),
      bytes: body.byteLength,
      cpuMs: (cpu.user + cpu.system) / 1000,
    };
  };

  const median = (values) => {
    const sorted = [...values].toSorted((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const rows = [];
  for (const route of routes) {
    const samples = [];
    for (let index = 0; index < iterations; index += 1) {
      samples.push(await request(route));
    }
    const served = samples[0];
    rows.push({
      route,
      status: served.status,
      layer: served.layer,
      bytes: served.bytes,
      // The asset layer is not the Worker: Cloudflare answers it before the
      // Worker is invoked, so there is no Worker CPU to report. A `-` says so
      // rather than printing the file read this harness did in-process.
      workerCpuMs:
        served.layer === "worker"
          ? median(samples.map((sample) => sample.cpuMs)).toFixed(2)
          : "-",
    });
  }
  console.table(rows);
  server.close();
};

const [, , mode, ...rest] = process.argv;

const routes = [
  "/",
  "/docs",
  "/docs/getting-started",
  "/docs/components/button",
  "/docs/components/table",
  "/docs/data-display/charts",
  "/docs/blocks/dashboard",
  "/docs/files/file-tree",
  "/docs/reference",
  "/live",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/api/search?query=button",
];

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  if (mode === "--bench") {
    await bench(Number(rest[0] ?? 7), rest.length > 1 ? rest.slice(1) : routes);
  } else {
    await serve(Number(mode ?? 4195));
  }
}
