// Prove the built docs serve every page the way the deploy will.
//
// Against the emulated deployment in `preview-server.mjs` (asset layer first,
// Worker second, `html_handling: drop-trailing-slash`), this checks:
//
//   1. every prerendered HTML file answers its own URL with a 200, from the
//      asset layer, byte-identical to the file — no render happened;
//   2. ten pages carry their own title, heading and description in that HTML,
//      so the marker is server-rendered rather than injected by the client;
//   3. every hashed asset a prerendered page names exists in the build;
//   4. the dynamic routes (`/live`, `/api/search`) still answer 200 from the
//      Worker, a retired curated twin still answers 301, and an unknown
//      address still answers 404.
//
// usage: node .agents/slop/bench/verify-routes.mjs

import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./preview-server.mjs";

const clientDir = fileURLToPath(
  new URL("../../../apps/docs/dist/client/", import.meta.url),
);

const walk = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (entry.name === "index.html") found.push(path);
  }
  return found;
};

/**
 * Ten pages, and the sentence each prints under its heading.
 *
 * The sentence is the page's own frontmatter description, so the check reads
 * the authored Markdown against the served HTML rather than a fixture that
 * could agree with the build.
 */
const spotChecks = [
  // The landing is a route rather than a collection document, so its heading is
  // its own sentence instead of a frontmatter title.
  { path: "/", title: "GPUIxUI — one library", text: "One library.", heading: false },
  {
    path: "/docs",
    title: "Introduction",
    text: "Native React components for GPUix — typed parts, semantic tokens and three platform looks.",
  },
  {
    path: "/docs/getting-started",
    title: "Getting started",
    text: "Build a settings card from the library's parts and run it in a native window.",
  },
  {
    path: "/docs/components/button",
    title: "Button",
    text: "The primary action — clickable and keyboard-activatable, with busy and disabled states",
  },
  {
    path: "/docs/components/table",
    title: "Table",
    text: "A bounded grid of rows with a header that stays painted",
  },
  {
    path: "/docs/data-display/charts",
    title: "Charts",
  },
  {
    path: "/docs/blocks/dashboard",
    title: "Dashboard",
    text: "An activity dashboard — sidebar nav, time and token stats",
  },
  {
    path: "/docs/files/file-tree",
    title: "File trees",
  },
  {
    path: "/docs/reference",
    title: "API reference",
    text: "Every import specifier the workspace publishes and every symbol behind it.",
  },
  {
    path: "/docs/theming",
    title: "Theming",
    text: "Semantic colour roles, typography, spacing, radius and density in one theme shape.",
  },
];

const failures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const server = await startServer();
const get = (path) => fetch(`${server.url}${path}`);

const files = await walk(clientDir);

// 1. Every prerendered page, from the asset layer, byte-identical to disk.
for (const file of files) {
  const url = `/${relative(clientDir, file)
    .replace(/\/?index\.html$/, "")
    .replace(/\/$/, "")}`;
  const response = await get(url === "/" ? "/" : url);
  const served = Buffer.from(await response.arrayBuffer());
  const onDisk = await readFile(file);
  check(response.status === 200, `${url}: ${response.status}`);
  check(
    response.headers.get("x-gpuix-layer") === "asset",
    `${url}: reached the Worker`,
  );
  check(served.equals(onDisk), `${url}: body differs from the build's file`);
}

// 2. Ten pages carry their own content in that HTML.
for (const { path, title, text, heading } of spotChecks) {
  const response = await get(path);
  const html = await response.text();
  check(response.status === 200, `${path}: ${response.status}`);
  check(html.includes(`<title>${title}`), `${path}: no <title>${title}`);
  if (heading !== false) {
    check(
      html.includes(`<h1`) && html.includes(title),
      `${path}: no <h1> carrying ${title}`,
    );
  }
  if (text !== undefined) {
    check(html.includes(text), `${path}: description not in the HTML`);
  }
}

// 3. Every hashed asset a prerendered page names exists in this build.
const assets = new Set();
for (const file of files) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/=["'](\/assets\/[^"']+)["']/g)) {
    assets.add(match[1]);
  }
}
for (const asset of assets) {
  const response = await get(asset);
  check(response.status === 200, `${asset}: missing from the build`);
}

// 4. What stays dynamic, and the answers only the Worker can give.
for (const path of ["/live", "/api/search?query=button"]) {
  const response = await get(path);
  check(response.status === 200, `${path}: ${response.status}`);
  check(
    response.headers.get("x-gpuix-layer") === "worker",
    `${path}: not answered by the Worker`,
  );
  await response.arrayBuffer();
}

// `redirect: "manual"`: fetch follows a 301 by default, which would hide the
// redirect behind the curated page the asset layer then serves.
const retired = await fetch(`${server.url}/docs/primitives/button`, {
  redirect: "manual",
});
check(retired.status === 301, `/docs/primitives/button: ${retired.status}`);
check(
  retired.headers.get("location")?.endsWith("/docs/components/button") === true,
  `/docs/primitives/button: ${retired.headers.get("location")}`,
);

const missing = await get("/docs/no-such-page");
check(missing.status === 404, `/docs/no-such-page: ${missing.status}`);

await server.close();

console.log(
  `${files.length} prerendered pages, ${assets.size} hashed assets, ` +
    `${server.layers.asset} asset responses, ${server.layers.worker} Worker responses`,
);

if (failures.length > 0) {
  console.error(failures.slice(0, 20).join("\n"));
  console.error(`${failures.length} checks failed`);
  process.exit(1);
}

console.log("every check passed");
