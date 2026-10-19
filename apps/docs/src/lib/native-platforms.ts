/** The pinned native release the library and this site target. */
export const GPUixVersion = "0.10.0";

/** One platform row in the installation page's native-binding table. */
export interface NativePlatform {
  /** The Rust target exactly as `@gpuix/native`'s `napi.targets` spells it. */
  readonly target: string;
  /** The reader-facing platform label. */
  readonly label: string;
  /** The optional package that carries the prebuilt binary. */
  readonly packageName: string;
  /** Whether GPUix publishes that prebuilt binary for the pinned release. */
  readonly published: boolean;
}

/**
 * Every platform a reader can install today, plus the one that has no
 * published binary (plan 584). `native-platforms.test.tsx` compares the
 * published rows with the installed package's real `napi.targets` and optional
 * dependencies, so a new target cannot ship an unlisted platform and a dropped
 * one cannot stay on the page.
 */
export const nativePlatforms: ReadonlyArray<NativePlatform> = [
  {
    target: "aarch64-apple-darwin",
    label: "macOS · Apple silicon",
    packageName: "@gpuix/native-darwin-arm64",
    published: true,
  },
  {
    target: "x86_64-apple-darwin",
    label: "macOS · Intel",
    packageName: "@gpuix/native-darwin-x64",
    published: false,
  },
  {
    target: "x86_64-unknown-linux-gnu",
    label: "Linux · x64",
    packageName: "@gpuix/native-linux-x64-gnu",
    published: true,
  },
  {
    target: "x86_64-pc-windows-msvc",
    label: "Windows · x64",
    packageName: "@gpuix/native-win32-x64-msvc",
    published: true,
  },
];
