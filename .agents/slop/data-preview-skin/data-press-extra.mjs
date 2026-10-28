import { chromium } from "playwright-core";

const base = "http://localhost:4319/docs/data-display";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const failures = [];
const check = (name, cond, actual) => {
  if (cond) console.log(`PASS ${name}`);
  else { failures.push(name); console.log(`FAIL ${name} -> ${JSON.stringify(actual)}`); }
};
const go = async (name) => {
  await page.goto(`${base}/${name}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
};

await go("table-sorting");
const headers = page.locator(".gx-dt-sort");
const seen = new Set();
for (let i = 0; i < 4; i += 1) {
  const before = await page.locator(".gx-dt-caption").innerText();
  await headers.nth(i).click();
  const after = await page.locator(".gx-dt-caption").innerText();
  seen.add(after);
  check(`sorting: header ${i + 1} changes the order`, after !== before, [before, after]);
}
check("sorting: all four headers sort", seen.size >= 3, [...seen]);
await headers.nth(0).click();
const once = await page.locator(".gx-dt-caption").innerText();
await headers.nth(0).click();
const twice = await page.locator(".gx-dt-caption").innerText();
check("sorting: a repeat press flips the direction", once !== twice, [once, twice]);

await go("table-selection");
await page.locator('[data-row="billing"]').click();
await page.locator('[data-row="search"]').click({ modifiers: ["Shift"] });
check("selection: Shift spans the painted range", (await page.locator(".gx-dt-caption").innerText()).includes("of 6 chosen"), await page.locator(".gx-dt-caption").innerText());
await page.locator('[data-row="auth"]').click({ modifiers: ["Control"] });
check("selection: Ctrl adds one record", (await page.locator("[aria-selected=\"true\"]").count()) >= 4);

await go("table-filtering");
await page.locator('input[type="search"]').fill("staging");
check("filtering: a second query narrows again", (await page.locator("[data-row]").count()) === 2, await page.locator("[data-row]").count());
await page.getByRole("button", { name: "blank (default)" }).click();
check("filtering: the name toggles back", (await page.locator('input[type="search"]').getAttribute("aria-label")) === "Filter rows");

await go("data-toolbar");
await page.getByRole("button", { name: "NaN", exact: true }).click();
check("toolbar: an unreadable wait is the default", (await page.locator(".gx-data-readout").innerText()).includes("wait 150 ms"));
await page.getByRole("button", { name: "150 ms (default)", exact: true }).click();
check("toolbar: the default wait is selectable", (await page.locator(".gx-data-readout").innerText()).includes("wait 150 ms"));

await go("frozen-columns");
await page.getByRole("button", { name: "NaN" }).click();
await page.getByRole("button", { name: "200 px" }).click();
check("frozen: both height choices are reachable", (await page.locator(".gx-dt-frozen").evaluate((n) => Math.round(n.getBoundingClientRect().height))) === 200);
await page.locator('[data-pane="frozen"] .gx-dt-frozen-body').evaluate((n) => { n.scrollTop = 72; n.scrollLeft = 40; n.dispatchEvent(new Event("scroll")); });
await page.waitForTimeout(80);
const panes = await page.evaluate(() => {
  const read = (p) => {
    const n = document.querySelector(`[data-pane="${p}"] .gx-dt-frozen-body`);
    return `${Math.round(n.scrollTop)},${Math.round(n.scrollLeft)}`;
  };
  return `${read("frozen")}|${read("data")}`;
});
check("frozen: the frozen pane never pans sideways", panes === "72,0|72,0", panes);

await go("virtualization");
const readout = () => page.locator(".gx-dt-caption").innerText();
const beforeV = await readout();
await page.getByRole("button", { name: "Scroll down one row" }).click();
const afterV = await readout();
await page.getByRole("button", { name: "Scroll up one row" }).click();
check("virtualization: both steppers move the window", afterV !== beforeV && (await readout()) === beforeV, [beforeV, afterV, await readout()]);

await go("column-configuration");
await page.locator(".gx-data-row").getByRole("button", { name: "Columns", exact: true }).click();
await page.getByRole("button", { name: "Move Name right" }).click();
check("columns: a right move reorders", (await page.locator(".gx-dt-hcell").allInnerTexts()).join(",") === "Status,Name,Size,Updated");
await page.locator('[data-resize="status"]').press("End");
check("columns: End names the track's cap", (await page.locator('[data-resize="status"]').getAttribute("aria-valuenow")) === "640", await page.locator('[data-resize="status"]').getAttribute("aria-valuenow"));
await page.locator('[data-resize="status"]').press("Home");
check("columns: Home names the track's floor", (await page.locator('[data-resize="status"]').getAttribute("aria-valuenow")) === "80", await page.locator('[data-resize="status"]').getAttribute("aria-valuenow"));

await go("tree-view");
await page.locator('[aria-label="Collapse @gpuixui/docs"]').click();
const closed = await page.locator(".gx-dtree-row").count();
await page.locator('[aria-label="Expand @gpuixui/docs"]').click();
check("tree: the chevron opens the branch again", (await page.locator(".gx-dtree-row").count()) > closed, [closed, await page.locator(".gx-dtree-row").count()]);
await page.locator(".gx-dtree").press("Enter");
check("tree: Enter toggles the row it stands on", (await page.locator(".gx-dtree-row").count()) !== 11);

await go("virtual-tree");
const top = () => page.locator(".gx-data-readout").innerText();
const beforeT = await top();
await page.getByRole("button", { name: "Scroll up one row" }).click();
check("virtual-tree: the up stepper moves the window", (await top()) === beforeT, [beforeT, await top()]);

await go("stat-card");
await page.getByRole("button", { name: "4 × 3" }).click();
check("stat: the smallest box reads 12", (await page.locator(".gx-dstat-value").first().innerText()) === "12");
await page.getByRole("button", { name: "8 × 5" }).click();
check("stat: the middle box reads 40", (await page.locator(".gx-dstat-value").first().innerText()) === "40");

await go("advanced-filter");
await page.getByRole("button", { name: "Load a query from an older release" }).click();
await page.getByRole("button", { name: /Clear “/ }).click();
await page.getByRole("button", { name: "any", exact: true }).click();
await page.getByRole("button", { name: "all", exact: true }).click();
check("filter: the pair toggles both ways", (await page.locator(".gx-dfilter-sentence").innerText()).startsWith("all of"), await page.locator(".gx-dfilter-sentence").innerText());

await browser.close();
console.log(failures.length === 0 ? "ALL PASS" : `FAILURES ${failures.length}`);
process.exitCode = failures.length === 0 ? 0 : 1;
