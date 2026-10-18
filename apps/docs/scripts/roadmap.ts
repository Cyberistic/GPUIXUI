#!/usr/bin/env node
/**
 * Writes the committed roadmap (plan 518): `src/lib/roadmap.generated.ts`,
 * derived from `COMPONENTS.md`'s Tier 3–5 tables. Run it whenever the inventory
 * changes; `src/lib/roadmap.test.ts` fails while the file is stale.
 *
 *   nub run --filter docs roadmap
 *
 * Exit `0` when written, `1` when the derivation is incomplete — an empty cell,
 * a duplicate target or a missing tier. Writing a knowingly broken roadmap is
 * worse than not writing one.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  deriveRoadmap,
  renderGeneratedModule,
  roadmapProblems,
} from "../src/lib/roadmap.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = fileURLToPath(
  new URL("../src/lib/roadmap.generated.ts", import.meta.url),
);

const targets = deriveRoadmap({ root });
const problems = roadmapProblems(targets);

if (problems.length > 0) {
  console.error(`roadmap: ${problems.length} problem(s), nothing written`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
} else {
  writeFileSync(output, renderGeneratedModule(targets));
  console.log(`roadmap: ${targets.length} targets from COMPONENTS.md`);
}
