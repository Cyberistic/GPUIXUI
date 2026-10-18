#!/usr/bin/env node
/**
 * Writes the committed value index (plan 490):
 * `src/lib/api-values.generated.ts`, derived from the packages' real entry
 * points. Run it whenever an export, its TSDoc or a classification changes;
 * `src/api-values.test.ts` fails while the file is stale.
 *
 *   nub run --filter docs api:values
 *
 * Exit `0` when written, `1` when the derivation itself has an undocumented or
 * unclassified export — writing a knowingly broken index is worse than not
 * writing one.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  deriveValueExports,
  indexProblems,
  renderGeneratedModule,
} from "../src/lib/api-values.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = fileURLToPath(
  new URL("../src/lib/api-values.generated.ts", import.meta.url),
);

const values = deriveValueExports({ root });
const problems = indexProblems({ root, values, generated: values });

if (problems.length > 0) {
  console.error(`api-values: ${problems.length} problem(s), nothing written`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
} else {
  writeFileSync(output, renderGeneratedModule(values));
  console.log(
    `api-values: ${values.length} exports from ${new Set(values.map((value) => value.package)).size} entries`,
  );
}
