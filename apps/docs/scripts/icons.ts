#!/usr/bin/env node
/**
 * Writes the committed icon catalogue (plan 507):
 * `src/lib/icon-catalogue.generated.ts`, derived from `packages/icons`. Run it
 * whenever an icon is added, renamed or re-drawn; `src/lib/icon-catalogue.test.ts`
 * fails while the file is stale.
 *
 *   nub run --filter docs icons
 *
 * Exit `0` when written, `1` when the derivation is incomplete — a name with no
 * shape, a stray paint or a moved source anchor. Writing a knowingly broken
 * catalogue is worse than not writing one.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  catalogueProblems,
  deriveIconCatalogue,
  renderGeneratedModule,
} from "../src/lib/icon-catalogue.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = fileURLToPath(
  new URL("../src/lib/icon-catalogue.generated.ts", import.meta.url),
);

const entries = deriveIconCatalogue({ root });
const problems = catalogueProblems({ root, entries });

if (problems.length > 0) {
  console.error(`icons: ${problems.length} problem(s), nothing written`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
} else {
  writeFileSync(output, renderGeneratedModule(entries));
  console.log(`icons: ${entries.length} icons from packages/icons`);
}
