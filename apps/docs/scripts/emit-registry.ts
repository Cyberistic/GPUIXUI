/**
 * Write the shadcn registry to the built site as **static files**.
 *
 * The registry is 158 documents, and their `content` is the real source of every
 * file an item installs — several hundred kilobytes each. Served from a route,
 * that is a Worker bundle over Cloudflare's 63.9 MiB uncompressed ceiling (the
 * deploy failed at exactly that). Served from `dist/client`, it is an asset the
 * edge hands back without running the Worker at all.
 *
 * The flat layout the shadcn spec requires is preserved: `/registry.json` and
 * `/<name>.json` at the site root. `vite build` copies `dist/client` up as the
 * asset set, so these land beside the pages.
 *
 * Run: `nub --filter @gpuixui/docs registry`
 * Writes: `apps/docs/dist/client/{registry.json,<name>.json}`
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readRegistry } from "../src/lib/registry-source.ts";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(appRoot, "dist", "client");
const root = resolve(appRoot, "..", "..");

const registry = readRegistry(root);

if (registry.unresolved.length > 0) {
  // A page the generator cannot resolve to a module is a broken item, not a
  // missing one: fail the build rather than publish a registry with holes.
  console.error(
    `registry: unresolved pages\n  ${registry.unresolved.join("\n  ")}`,
  );
  process.exit(1);
}

await mkdir(out, { recursive: true });
await writeFile(join(out, "registry.json"), registry.index);
await Promise.all(
  registry.items.map((item) =>
    writeFile(join(out, `${item.name}.json`), item.json),
  ),
);

console.log(
  `registry: wrote ${String(registry.items.length + 1)} documents to dist/client`,
);
