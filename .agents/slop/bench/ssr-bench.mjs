// Local SSR CPU benchmark against the built Worker entry.
//
// Runs the real `dist/server/server.js` fetch handler in Node, so the measured
// work is the same code the Worker runs per document request. CPU is read from
// `process.cpuUsage()`, which is what a Worker's CPU limit meters; wall time is
// reported for reference only.
//
// The deploy bundles the Worker with `process.env.NODE_ENV` baked to
// `"production"` (alchemy's rolldown build), so the harness sets it before
// importing; without it Node resolves react-dom's development build and every
// render measures roughly twice its deployed cost.
//
// usage: node .agents/slop/bench/ssr-bench.mjs [iterations] [route ...]

process.env.NODE_ENV = "production";

const [, , iterationsArg, ...routeArgs] = process.argv;
const iterations = Number(iterationsArg ?? 7);
const routes =
  routeArgs.length > 0
    ? routeArgs
    : [
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

const entry = await import(
  new URL("../../../apps/docs/dist/server/server.js", import.meta.url).href
);

const base = "http://localhost";

const request = async (path) => {
  const started = performance.now();
  const before = process.cpuUsage();
  const response = await entry.default.fetch(new Request(`${base}${path}`), {
    waitUntil() {},
    passThroughOnException() {},
  });
  const html = await response.text();
  const cpu = process.cpuUsage(before);
  return {
    status: response.status,
    bytes: html.length,
    cpuMs: (cpu.user + cpu.system) / 1000,
    wallMs: performance.now() - started,
    html,
  };
};

// Warm every route first: module evaluation and the first render of each route's
// chunks are startup cost, not the per-request cost the Worker limit meters.
for (const route of routes) await request(route);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const rows = [];
for (const route of routes) {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    samples.push(await request(route));
  }
  rows.push({
    route,
    status: samples[0].status,
    bytes: samples[0].bytes,
    cpuMs: median(samples.map((sample) => sample.cpuMs)).toFixed(2),
    wallMs: median(samples.map((sample) => sample.wallMs)).toFixed(1),
  });
}

console.table(rows);
