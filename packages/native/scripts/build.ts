import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GPUIX = "0ce4f41fca8ffb9c18fd1efd2631f0f4b97a1abf";
const TOOLCHAIN = "1.97.1";
const LIBRARY: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "libgpuixui_native.dylib",
  linux: "libgpuixui_native.so",
};

const here = fileURLToPath(new URL("..", import.meta.url));
const build = `${here}.build`;
const gpuix = `${build}/gpuix`;
const patch = fileURLToPath(
  new URL("../../../patches/gpui/0002-paint-shader.patch", import.meta.url),
);

const run = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
): void => {
  execFileSync(command, [...args], { cwd, stdio: "inherit" });
};

const library = LIBRARY[process.platform];
if (library === undefined) {
  process.stderr.write(`no shader backend on ${process.platform} yet\n`);
  process.exit(1);
}

mkdirSync(build, { recursive: true });
if (!existsSync(`${gpuix}/.git`)) {
  run(
    "git",
    ["clone", "--filter=blob:none", "https://github.com/remorses/gpuix", gpuix],
    build,
  );
}
run("git", ["checkout", "--quiet", "--force", GPUIX], gpuix);
run("git", ["submodule", "update", "--init", "--depth", "1", "zed"], gpuix);
run("git", ["reset", "--quiet", "--hard"], `${gpuix}/zed`);
run("git", ["clean", "-fdq"], `${gpuix}/zed`);
run("git", ["apply", "--whitespace=nowarn", patch], `${gpuix}/zed`);
run(
  "cargo",
  [`+${TOOLCHAIN}`, "build", "--release", "--features", "test-support"],
  here,
);
mkdirSync(`${here}dist`, { recursive: true });
copyFileSync(
  `${build}/target/release/${library}`,
  `${here}dist/gpuixui-native.${process.platform}-${process.arch}.node`,
);
