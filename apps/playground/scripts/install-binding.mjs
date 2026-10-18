/**
 * Installs the locally built GPUix binding into the package that loads it.
 *
 * The nub package store is shared and content-addressed: a `nub install` from
 * any workstream re-materialises the snapshot, which still contains the first
 * binding this machine built. The pinned release build therefore lives beside
 * the app (`native/`, gitignored) and is copied over the store copy on every
 * build. `@gpuixui/testing`'s `Binding.fingerprintIssue` is the backstop if a
 * run still sees the wrong artifact.
 *
 * Missing local build is not an error: the suite reports exit `2` without a
 * binding, and a published platform package serves it on other hosts.
 */
import { copyFile, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { platform, arch } = process;
const name = `gpuix-native.${platform}-${arch}.node`;

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const local = join(appRoot, "native", name);

const sizeOf = async (path) => {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
};

if ((await sizeOf(local)) === 0) {
  console.log(`binding: no local ${name}; leaving the installed package alone`);
  process.exit(0);
}

const loader = fileURLToPath(import.meta.resolve("@gpuix/native"));
const installed = join(dirname(loader), name);

if ((await sizeOf(installed)) === (await sizeOf(local))) {
  const [a, b] = await Promise.all([readFile(local), readFile(installed)]);
  if (a.equals(b)) {
    console.log(`binding: ${name} is current`);
    process.exit(0);
  }
}

await copyFile(local, installed);
console.log(`binding: installed ${name} from native/`);
