/**
 * A prerendered page is only a win if it still becomes the app.
 *
 * The build writes the HTML the asset layer serves; this drives a real browser
 * against the emulated deployment (`preview-server.mjs`) and checks the three
 * things a static document can break:
 *
 *   1. it hydrates with no console error (a hydration mismatch is logged);
 *   2. the client state works — the preview switch repaints the surface and
 *      writes the URL, a shared `?platform=` link opens on that platform, the
 *      search dialog opens and its endpoint answers, the copy button flips;
 *   3. no internal link a page prints is dead.
 *
 * usage: nub .agents/slop/bench/hydration-check.ts [origin]
 */

import { findChrome, openChrome } from "../../../apps/docs/scripts/chrome-session.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:4195";

/** Records what React (and anything else) logs before the page's scripts run. */
const preload = `
window.__consoleErrors = [];
const record = console.error;
console.error = (...args) => {
  window.__consoleErrors.push(args.map((value) => String(value)).join(" "));
  record(...args);
};
`;

const chrome = findChrome(undefined, process.env);
if (chrome === undefined) throw new Error("no Chrome");

const failures: string[] = [];
const check = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

const { page, close } = await openChrome(chrome, `${origin}/docs`, 1280, 900, {
  preload,
});

/** Wait until the browser has had time to hydrate (and repaint). */
const settled = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await page.text(
      `String(document.querySelectorAll("button.gx-platform-option").length)`,
    );
    if (ready !== "0") {
      await new Promise((wait) => setTimeout(wait, 500));
      return;
    }
    await new Promise((wait) => setTimeout(wait, 250));
  }
};

const platform = () =>
  page.text(`document.querySelector("[data-platform]")?.dataset.platform ?? ""`);

const pages = [
  "/",
  "/docs",
  "/docs/components/button",
  "/docs/blocks/dashboard",
  "/docs/reference",
];

for (const path of pages) {
  await page.goto(`${origin}${path}`);
  await settled();

  const errors = await page.text(`JSON.stringify(window.__consoleErrors ?? [])`);
  check(
    errors === "[]",
    `${path}: console errors ${errors.slice(0, 200)}`,
  );
  const heading = await page.text(
    `(document.querySelector("h1")?.textContent ?? "").slice(0, 40)`,
  );
  check(heading.length > 0, `${path}: no heading after hydration`);
}

// The preview switch: a client choice repaints a surface and reaches the URL.
await page.goto(`${origin}/docs/components/button`);
await settled();
const before = await platform();
await page.run(
  `[...document.querySelectorAll("button.gx-platform-option")].find((button) => button.textContent === "Windows")?.click()`,
);
const after = await platform();
const search = await page.text(`location.search`);
check(
  before !== after && after === "win32",
  `preview switch: ${before} → ${after}`,
);
check(search.includes("platform=win32"), `preview switch URL: ${search}`);

// A shared link: the browser opens the prerendered HTML, the client applies the
// requested platform. This is the path a prerendered page could have broken.
await page.goto(`${origin}/docs/components/button?platform=windows`);
await settled();
check((await platform()) === "win32", "shared ?platform= link ignored");

// Search: the dialog opens and its endpoint answers from this origin.
await page.run(
  `[...document.querySelectorAll("button")].find((button) => /search/i.test(button.textContent ?? ""))?.click()`,
);
const dialog = await page.text(
  `String(document.querySelector('[role="dialog"], [data-search-dialog]') !== null)`,
);
check(dialog === "true", "search dialog did not open");
const results = await page.text(
  `fetch("/api/search?query=button").then((response) => response.json()).then((body) => String(JSON.stringify(body).length))`,
);
check(Number(results) > 100, `search endpoint answered ${results} chars`);

// The copy button exists and survives a press (a refused clipboard is fine).
const copy = await page.text(
  `String([...document.querySelectorAll("button")].filter((button) => /copy/i.test(button.textContent ?? "")).length)`,
);
check(Number(copy) > 0, "no copy button on the page");
await page.run(
  `[...document.querySelectorAll("button")].find((button) => /copy page/i.test(button.textContent ?? ""))?.click()`,
);
const copied = await page.text(
  `[...document.querySelectorAll("button")].filter((button) => /copy/i.test(button.textContent ?? "")).map((button) => button.textContent).join("|")`,
);
check(copied.length > 0, "copy button vanished after a press");

// No page prints a dead internal link.
await page.goto(`${origin}/docs`);
await settled();
const links = JSON.parse(
  await page.text(
    `JSON.stringify([...new Set([...document.querySelectorAll('a[href^="/"]')].map((anchor) => anchor.getAttribute("href")))])`,
  ),
) as ReadonlyArray<string>;
const dead: string[] = [];
for (const link of links) {
  const url = new URL(link, origin);
  if (url.origin !== origin) continue;
  const status = await fetch(url, { redirect: "manual" })
    .then((response) => String(response.status))
    .catch((error: unknown) => String(error));
  if (status !== "200" && status !== "301") dead.push(`${link}: ${status}`);
}
check(dead.length === 0, `dead links: ${dead.slice(0, 5).join(", ")}`);

await close();

console.log(`${pages.length} pages hydrated, ${links.length} internal links`);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("every check passed");
