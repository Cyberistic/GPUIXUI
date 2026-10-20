#!/usr/bin/env node
/**
 * Writes the committed part-state table (plan 623):
 * `src/lib/part-states.generated.ts`, derived from every exported `*State`
 * interface in `packages/components/src`. Run it after changing a part's state;
 * `src/lib/part-states-generated.test.ts` fails while the file is stale.
 *
 *   nub run --filter docs part-states
 *
 * Exit `0` when written, `1` when the derivation is empty or a name repeats —
 * writing a knowingly broken table is worse than not writing one.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  readPartStates,
  renderPartStatesModule,
} from "../src/lib/part-states-source.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

const states = readPartStates(root);
const names = states.map((state) => state.name);
const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
const fields = new Set(states.flatMap((state) => state.fields));

if (states.length === 0 || duplicates.length > 0) {
  console.error(
    `part-states: ${states.length} state types, ${duplicates.length} duplicate(s), nothing written`,
  );
  for (const duplicate of new Set(duplicates)) console.error(`  ${duplicate}`);
  process.exitCode = 1;
} else {
  writeFileSync(
    fileURLToPath(
      new URL("../src/lib/part-states.generated.ts", import.meta.url),
    ),
    renderPartStatesModule(states),
  );
  console.log(
    `part-states: ${states.length} state types, ${fields.size} fields`,
  );
}
