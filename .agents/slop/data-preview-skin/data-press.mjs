import { chromium } from "playwright-core";

const base = "http://localhost:4319/docs/data-display";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const failures = [];
const check = (name, cond, actual) => {
  if (cond) console.log(`PASS ${name}`);
  else { failures.push(`${name} (got ${JSON.stringify(actual)})`); console.log(`FAIL ${name} -> ${JSON.stringify(actual)}`); }
};
const go = async (name) => {
  await page.goto(`${base}/${name}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
};
const caption = () => page.locator(".gx-dt-caption, .gx-data-readout").first().innerText();
const rows = () => page.locator("[data-row]").count();

// table-sorting
await go("table-sorting");
check("sorting: opens unsorted", (await caption()).includes("source order"));
const firstSort = page.locator(".gx-dt-sort").first();
await firstSort.click();
check("sorting: a header press sorts", (await caption()).includes("Service ↑"), await caption());
check("sorting: rows reorder", (await page.locator("[data-row]").first().innerText()).includes("auth-service"), await page.locator("[data-row]").first().innerText());
await page.locator(".gx-dt-sort").nth(3).click({ modifiers: ["Shift"] });
check("sorting: shift adds a tie-break", (await caption()).includes("Service ↑1") && (await caption()).includes("Duration ↓2"), await caption());

// table-selection
await go("table-selection");
await page.locator('[data-row="billing"]').click();
check("selection: a row press chooses it", (await caption()).includes("1 of 6 chosen: billing"), await caption());
check("selection: the row announces chosen", (await page.locator('[data-row="billing"]').getAttribute("aria-selected")) === "true");
await page.locator('[aria-label="Choose every deploy"]').click();
check("selection: the header chooses every row", (await caption()).includes("6 of 6 chosen"), await caption());
await page.locator('[aria-label="Choose billing-api"]').click();
check("selection: one checkbox removes its row", !(await caption()).includes("billing-api"), await caption());

// table-filtering
await go("table-filtering");
await page.locator('input[type="search"]').fill("PROD");
check("filtering: the query narrows the rows", (await rows()) === 3, await rows());
check("filtering: the readout counts what is kept", (await caption()).includes("3 of 5 rows"), await caption());
await page.getByRole("button", { name: "Find a service" }).click();
check("filtering: the name toggle renames the field", (await page.locator('input[type="search"]').getAttribute("aria-label")) === "Find a service");

// tree-view
await go("tree-view");
const treeRows = () => page.locator(".gx-dtree-row").count();
const before = await treeRows();
await page.locator('[aria-label="Collapse @gpuixui/docs"]').click();
check("tree: a chevron closes its branch", (await treeRows()) < before, [before, await treeRows()]);
await page.locator(".gx-dtree-row").nth(1).click();
check("tree: a press moves the cursor", (await page.locator('.gx-dtree-row[data-current="true"]').count()) === 1);
const current = await page.locator('.gx-dtree-row[data-current="true"]').innerText();
await page.locator(".gx-dtree").press("ArrowUp");
check("tree: ArrowUp moves the cursor", (await page.locator('.gx-dtree-row[data-current="true"]').innerText()) !== current, await page.locator('.gx-dtree-row[data-current="true"]').innerText());

// virtual-tree
await go("virtual-tree");

const firstIndex = () =>
  page.evaluate(
    () =>
      document.querySelector('.gx-dtree-window .gx-dtree-row[aria-level="1"]')
        ?.textContent ?? "none",
  );
const topBefore = await firstIndex();
await page.locator('input[aria-label="Scroll offset"]').fill("370");
await page.waitForTimeout(100);
check("virtual-tree: the offset moves the window", (await firstIndex()) !== topBefore, [topBefore, await firstIndex()]);
const offsetBefore = await page.locator(".gx-data-readout").innerText();
await page.getByRole("button", { name: "Scroll down one row" }).click();
check(
  "virtual-tree: the stepper moves one row",
  (await page.locator(".gx-data-readout").innerText()) !== offsetBefore,
  [offsetBefore, await page.locator(".gx-data-readout").innerText()],
);
await page.getByRole("button", { name: "Reveal the last row" }).click();
await page.waitForTimeout(100);
const windowText = await page.evaluate(
  () => document.querySelector(".gx-dtree-window")?.textContent ?? "",
);
check("virtual-tree: the reveal lands the last row", windowText.includes("package-12"), windowText);

// stat-card
await go("stat-card");
await page.getByRole("button", { name: "12 × 7" }).click();
check("stat: the reading is derived from the box", (await page.locator(".gx-dstat-value").first().innerText()) === "84", await page.locator(".gx-dstat-value").first().innerText());
check("stat: the trend follows the reading", (await page.locator(".gx-dstat-trend").getAttribute("data-direction")) === "up");

// key-value
await go("key-value");
await page.getByRole("button", { name: "168" }).click();
check("key-value: a wider track is painted", (await page.locator(".gx-dkv-label").first().evaluate((n) => Math.round(n.getBoundingClientRect().width))) === 168);
await page.getByRole("button", { name: "NaN" }).click();
check("key-value: an unreadable width falls back", (await page.locator(".gx-dkv-label").first().evaluate((n) => Math.round(n.getBoundingClientRect().width))) === 120);

// data-toolbar
await go("data-toolbar");
await page.locator(".gx-dtoolbar input").fill("staging");
await page.waitForTimeout(300);
check("toolbar: the pause reports and the rows narrow", (await rows()) === 3, await rows());
check("toolbar: the readout names the report", (await caption()).includes('reported “staging”'), await caption());
await page.getByRole("button", { name: "Reset" }).click();
check("toolbar: Reset restores the set", (await rows()) === 6, await rows());
await page.getByRole("button", { name: "0 ms", exact: true }).click();
await page.locator(".gx-dtoolbar input").fill("prod");
await page.waitForTimeout(50);
check("toolbar: a zero wait reports at once", (await rows()) === 3, await rows());

// expandable-rows
await go("expandable-rows");
await page.getByText("notes.md").click();
check("expandable: a second row opens", (await page.locator(".gx-dt-detail").count()) === 2, await page.locator(".gx-dt-detail").count());
await page.getByText("notes.md").click();
check("expandable: a second press closes it", (await page.locator(".gx-dt-detail").count()) === 1);

// frozen-columns
await go("frozen-columns");
await page.locator('[data-row="r3"]').first().click();
check("frozen: a press chooses the record in both panes", (await caption()).includes("chosen r3"), await caption());
await page.getByRole("button", { name: "NaN" }).click();
const h = await page.locator(".gx-dt-frozen").evaluate((n) => n.getBoundingClientRect().height);
check("frozen: an unreadable height lets the panes share", h > 200, h);
await page.getByRole("button", { name: "200 px" }).click();
await page.locator('[data-pane="data"] .gx-dt-frozen-body').evaluate((n) => { n.scrollTop = 72; n.dispatchEvent(new Event("scroll")); });
await page.waitForTimeout(100);
const top = await page.locator('[data-pane="frozen"] .gx-dt-frozen-body').evaluate((n) => Math.round(n.scrollTop));
check("frozen: the data pane's wheel mirrors the frozen column", top === 72, top);

// virtualization
await go("virtualization");
const firstVirt = () => page.locator(".gx-virt-row").first().getAttribute("data-index");
const virtBefore = await firstVirt();
await page.locator('input[aria-label="Scroll offset"]').fill("370");
await page.waitForTimeout(100);
check("virtualization: the offset mounts a new window", (await firstVirt()) !== virtBefore, [virtBefore, await firstVirt()]);
await page.getByRole("button", { name: "Reveal row 500" }).click();
await page.waitForTimeout(100);
check("virtualization: the reveal mounts row 500", (await page.locator('[data-index="499"]').count()) === 1);

// column-configuration
await go("column-configuration");
await page.locator(".gx-data-scene").getByRole("button", { name: "Columns", exact: true }).click();
check("columns: the menu opens", (await page.locator(".gx-dmenu").count()) === 1);
await page.getByRole("menuitemcheckbox", { name: "Updated" }).click();
check("columns: a row hides its column", (await page.locator('[data-resize="updated"]').count()) === 0);
await page.getByRole("button", { name: "Move Size left" }).click();
const order = await page.locator(".gx-dt-hcell").allInnerTexts();
check("columns: a move reorders the tracks", order.join(",") === "Name,Size,Status", order);
await page.getByRole("menuitem", { name: "Reset columns" }).click();
check("columns: Reset restores the definition", (await page.locator('[data-resize="updated"]').count()) === 1);
const width = Number(await page.locator('[data-resize="name"]').getAttribute("aria-valuenow"));
await page.locator('[data-resize="name"]').press("ArrowRight");
check("columns: a divider key steps the width", Number(await page.locator('[data-resize="name"]').getAttribute("aria-valuenow")) === width + 16);

// charts
await go("charts");
await page.getByRole("button", { name: "lines" }).click();
check("charts: the line mode paints paths", (await page.locator(".gx-dchart-plot path").count()) === 2 && (await page.locator(".gx-dchart-plot rect").count()) === 0);
await page.getByRole("button", { name: "bars" }).click();
check("charts: the bar mode paints rects", (await page.locator(".gx-dchart-plot rect").count()) > 0);

// property-panel
await go("property-panel");
await page.locator('input[aria-label="Tag"]').fill("hero");
check("inspector: the edit reaches the caption", (await page.locator(".gx-dpanel-title").first().innerText()).includes("#hero"), await page.locator(".gx-dpanel-title").first().innerText());
check("inspector: the edit reaches the readout", (await page.locator(".gx-inspector-readout").innerText()).includes("hero"));
await page.getByRole("button", { name: "Wide" }).click();
check("inspector: Wide widens the box", (await page.locator(".gx-inspector-box").evaluate((n) => Math.round(n.getBoundingClientRect().width))) === 240);
await page.getByRole("button", { name: "Reset size" }).click();
check("inspector: Reset restores the size", (await page.locator(".gx-inspector-box").evaluate((n) => Math.round(n.getBoundingClientRect().width))) === 120);

// advanced-filter
await go("advanced-filter");
const filterRows = () => page.locator("[data-file]").count();
await page.getByRole("button", { name: "any", exact: true }).click();
check("filter: any becomes the combinator", (await page.locator(".gx-dfilter-sentence").innerText()).startsWith("any of"), await page.locator(".gx-dfilter-sentence").innerText());
check("filter: any keeps more rows", (await filterRows()) === 4, await filterRows());
await page.locator('input[aria-label="Size value"]').fill("2000");
check("filter: the value narrows the rows", (await filterRows()) === 4, await filterRows());
await page.getByRole("button", { name: "Field" }).first().click();
check("filter: the field menu opens", (await page.locator('.gx-dmenu[aria-label="Field"]').count()) === 1);
await page.locator('.gx-dmenu[aria-label="Field"]').getByRole("menuitem", { name: "Size" }).click();
check("filter: the field pick rewrites the clause", (await page.locator(".gx-dfilter-clause").first().innerText()).startsWith("Size"), await page.locator(".gx-dfilter-clause").first().innerText());
await page.locator('input[aria-label="Size value"]').first().fill("500");
await page.getByRole("button", { name: "Comparison" }).first().click();
await page.locator('.gx-dmenu[aria-label="Comparison"]').getByRole("menuitem", { name: "less than" }).click();
check("filter: the comparison pick rewrites the clause", (await page.locator(".gx-dfilter-sentence").innerText()).includes("lessThan"), await page.locator(".gx-dfilter-sentence").innerText());
await page.getByRole("button", { name: "Remove clause" }).first().click();
check("filter: Remove drops a clause", (await page.locator(".gx-dfilter-clause").count()) === 1);
await page.getByRole("button", { name: "Add clause" }).click();
check("filter: Add appends a clause", (await page.locator(".gx-dfilter-clause").count()) === 2);
await page.getByRole("button", { name: "Clear", exact: true }).click();
check("filter: Clear empties the tree", (await page.locator(".gx-dfilter-clause").count()) === 0 && (await filterRows()) === 5, [await page.locator(".gx-dfilter-clause").count(), await filterRows()]);
await page.getByRole("button", { name: "Load a query from an older release" }).click();
check("filter: a stored query is refused with Clear", (await page.locator(".gx-dfilter-sentence").innerText()).includes("cannot read") && (await filterRows()) === 0, [await page.locator(".gx-dfilter-sentence").innerText(), await filterRows()]);
check("filter: the refusal paints no editor", (await page.locator(".gx-dfilter-clause").count()) === 0);
await page.getByRole("button", { name: /Clear “/ }).click();
check("filter: Clear recovers from the refusal", (await page.locator(".gx-dfilter-clause").count()) === 2);

await browser.close();
console.log(failures.length === 0 ? "ALL PASS" : `FAILURES ${failures.length}`);
process.exitCode = failures.length === 0 ? 0 : 1;
