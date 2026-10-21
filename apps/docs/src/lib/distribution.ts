/**
 * Shipping a desktop app (plan 638).
 *
 * `deployment.mdx` said "no packaging guide exists yet" and nothing on the site
 * answered how an app built on this library becomes something a user installs:
 * measured 2026-10-21, `shipping` reached Dark mode, `packaging` the Values API,
 * `bundle identifier` a Text variants paragraph, `notarize` and `executable`
 * returned nothing, and `dmg` reached the Roadmap.
 *
 * The split is deliberate. The **format table and `pubkey`** are the pinned
 * `@gpuix/native@0.10.0` contract, so `updateFormats` owns the format names and
 * `distribution.test.ts` compares both directions. The **recipe** — the binary,
 * the wrapper, the icon, the signing key, the release assets — is GPUix's own
 * repository README, which the published tarball does not ship; the page
 * attributes it and its measured sizes to that repository and says this site
 * has run none of it. Everything this repository could falsely claim to have
 * (a packager config, a packaging workflow, a signed bundle) is an absence with
 * a machine-checkable half.
 *
 * Browser-safe: no `node:fs`, no installed-declaration reads. The test supplies
 * those.
 */

/** The platforms a GPUix application can be packaged for today. */
export const packagingSystems: ReadonlyArray<string> = [
  "macOS",
  "Linux",
  "Windows",
];

/** One `formats` entry, what the packager writes, and what an update installs. */
export interface PackagerFormatRow {
  readonly os: string;
  /** The `cargo-packager` `formats` value. */
  readonly format: string;
  /** What lands in `outDir`. */
  readonly output: string;
  /** The asset the update client downloads, or the reason it cannot. */
  readonly updateAsset: string;
  /** Whether `AvailableUpdate.format` can return this value. */
  readonly update: boolean;
}

/**
 * `app`, `appimage`, `nsis` and `wix` are the four formats the runtime's update
 * client declares (`updateFormats`). `dmg` is a packager output a person
 * installs from; the client cannot consume it, which is why its row says so.
 */
export const packagerFormats: ReadonlyArray<PackagerFormatRow> = [
  {
    os: "macOS",
    format: "app",
    output: "`My App.app`; when signed, `My App.app.tar.gz` beside it",
    updateAsset: "`My App.app.tar.gz` and its `.sig`",
    update: true,
  },
  {
    os: "macOS",
    format: "dmg",
    output: "`My App.dmg` — a disk image a person installs from",
    updateAsset:
      "None: the updater wants the `.app.tar.gz`, never the `.dmg` or the bare `.app`",
    update: false,
  },
  {
    os: "Linux",
    format: "appimage",
    output: "`app_0.1.0_x86_64.AppImage` and, when signed, its `.sig`",
    updateAsset: "The `.AppImage` and its `.sig`",
    update: true,
  },
  {
    os: "Windows",
    format: "nsis",
    output: "`app_0.1.0_x64-setup.exe` and, when signed, its `.sig`",
    updateAsset: "The setup `.exe` and its `.sig`",
    update: true,
  },
  {
    os: "Windows",
    format: "wix",
    output: "A WiX/MSI setup built from the same binary",
    updateAsset: "The MSI and its `.sig`",
    update: true,
  },
];

/**
 * The `packager.json` the page renders and its JSON fence repeats. The values
 * describe an app that ran `bun build --compile app.tsx --outfile dist/app`;
 * only the shape is the packager's, and the test checks the fence against it.
 * Plain data, because the docs bundle may not import the Effect runtime.
 */
export interface PackagerConfig {
  readonly productName: string;
  readonly version: string;
  readonly identifier: string;
  readonly binariesDir: string;
  readonly outDir: string;
  readonly binaries: ReadonlyArray<{
    readonly path: string;
    readonly main: boolean;
  }>;
  readonly icons: ReadonlyArray<string>;
  readonly formats: ReadonlyArray<string>;
}

export const packagerConfig = {
  productName: "Notes",
  version: "0.1.0",
  identifier: "dev.example.notes",
  binariesDir: "dist",
  outDir: "bundle",
  binaries: [{ path: "app", main: true }],
  icons: ["AppIcon.icns"],
  formats: ["app"],
} as const satisfies PackagerConfig;

/** One rendered row of the configuration, so the page needs no JSON reading. */
export interface PackagerConfigRow {
  readonly name: string;
  readonly value: string;
}

/** The configuration as the page's table renders it, one row per field. */
export const packagerConfigRows: ReadonlyArray<PackagerConfigRow> = [
  { name: "productName", value: packagerConfig.productName },
  { name: "version", value: packagerConfig.version },
  { name: "identifier", value: packagerConfig.identifier },
  { name: "binariesDir", value: packagerConfig.binariesDir },
  { name: "outDir", value: packagerConfig.outDir },
  {
    name: "binaries",
    value: packagerConfig.binaries
      .map((binary) => `{ "path": "${binary.path}", "main": ${binary.main} }`)
      .join(", "),
  },
  { name: "icons", value: packagerConfig.icons.join(", ") },
  { name: "formats", value: packagerConfig.formats.join(", ") },
];

/** One step of the shipping path, in the order the repository README runs it. */
export interface PackagingStep {
  readonly id: "build" | "wrap" | "sign" | "publish";
  readonly title: string;
  readonly command: string;
  readonly detail: string;
}

export const packagingSteps: ReadonlyArray<PackagingStep> = [
  {
    id: "build",
    title: "Build one binary",
    command: "bun build --compile app.tsx --outfile dist/app",
    detail:
      "The repository says the binary carries the renderer, so it runs with no Bun or Node install. This site has not compiled one.",
  },
  {
    id: "wrap",
    title: "Wrap it in an app",
    command: "cargo packager --release --config packager.json",
    detail:
      "`--release` is the packager profile: it looks in `binariesDir` for a release binary, and it is not `cargo build --release`. The packager builds the host OS only.",
  },
  {
    id: "sign",
    title: "Sign the bundle",
    command: "cargo packager signer generate",
    detail:
      "The private key and its password go in `CARGO_PACKAGER_SIGN_PRIVATE_KEY` and `CARGO_PACKAGER_SIGN_PRIVATE_KEY_PASSWORD`; the public key goes into the app as `pubkey`. Signing writes the sibling `.sig` the updater requires.",
  },
  {
    id: "publish",
    title: "Publish a release",
    command:
      'gh release upload v0.1.0 "bundle/My App.app.tar.gz" "bundle/My App.app.tar.gz.sig"',
    detail:
      "GitHub Releases is the feed the update client expects: create the release, upload the bundle and its `.sig`, and keep the repository public. Do not upload a feed JSON.",
  },
];

/**
 * Filenames that would mean this repository builds an application bundle. The
 * page's "no packaging configuration" row is only true while none of these
 * exists, so the test scans the tree for them.
 */
export const packagingArtifacts: ReadonlyArray<string> = [
  "packager.json",
  "tauri.conf.json",
  "electron-builder.yml",
  "forge.config.js",
  "app.wxs",
  "app.nsi",
  "Info.plist",
  "notes.desktop",
];

/** The artifacts in a flat list of filenames; pure, so a fixture can prove it. */
export const packagingArtifactsIn = (
  names: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  names.filter(
    (name) => packagingArtifacts.includes(name) || name.endsWith(".desktop"),
  );

/**
 * Dependencies that would mean a workspace ships an app packager. The absence
 * row below names this list, so the scan and the prose cannot disagree.
 */
export const packagingDependencies: ReadonlyArray<string> = [
  "electron",
  "electron-builder",
  "@electron-forge/cli",
  "@tauri-apps/cli",
  "cargo-packager",
];

/** The denied dependencies declared by a set of manifests; pure. */
export const packagingDependenciesIn = (
  manifests: ReadonlyArray<ReadonlyArray<string>>,
): ReadonlyArray<string> =>
  Array.from(
    new Set(
      manifests.flatMap((names) =>
        names.filter((name) => packagingDependencies.includes(name)),
      ),
    ),
  );

/** What this repository has never done, one subject at a time. */
export interface DistributionAbsence {
  readonly subject: string;
  readonly statement: string;
  /** A symbol that would make the absence false if the runtime gained it. */
  readonly symbol?: RegExp;
  /** A dependency that would make the absence false if a workspace installed it. */
  readonly deniedDependencies?: ReadonlyArray<string>;
}

export const distributionAbsences: ReadonlyArray<DistributionAbsence> = [
  {
    subject: "Packaging configuration",
    statement:
      "No `packager.json`, Tauri, Electron or Forge configuration exists in this repository, so nothing here builds an app bundle.",
    deniedDependencies: packagingDependencies,
  },
  {
    subject: "Packaging CI",
    statement:
      "No workflow runs a packager. The native suite builds the binding from source and runs the playground; it does not bundle it.",
  },
  {
    subject: "Signed or notarised app",
    statement:
      "No `codesign`, `notarytool` or `productsign` call exists. The runtime signs update payloads; it does not sign or notarise the app the operating system launches.",
    symbol: /codesign|notarytool|productsign/u,
  },
  {
    subject: "A packaged app",
    statement:
      "The playground runs from source. No `.app`, `.AppImage` or `.exe` has been built or launched from this checkout.",
  },
  {
    subject: "Cross-compilation",
    statement:
      "The packager builds the host OS only, so a release needs one machine per platform.",
  },
  {
    subject: "Windows and Linux packaging",
    statement:
      "Only macOS is measured here: the native suite runs on this host, so the Windows setup and the Linux AppImage are the recipe's output shapes, not this site's observations.",
  },
  {
    subject: "An icon or bundle-identifier API",
    statement:
      "`WindowOptions` has no icon, bundle identifier or version field. `appId` is the Wayland `app_id` / X11 `WM_CLASS`, which a desktop uses to group windows.",
    symbol: /bundleIdentifier|bundleId|appIcon/u,
  },
  {
    subject: "Auto-launch",
    statement:
      "No login-item or launch-at-login API is declared; the operating system's login items are the application's own concern.",
    symbol: /loginItem|launchAtLogin|startAtLogin/u,
  },
  {
    subject: "Installer UI",
    statement:
      "No installer screen, progress view or relaunch. `downloadAndInstall()` replaces the packaged files and returns; quitting is the app's job.",
  },
];

/** Where every recipe claim and every size on the page comes from. */
export const distributionProvenance = {
  recipe:
    "GPUix's own repository README — the `Ship a binary`, `Wrap it in an app with an icon` and `Auto-update` sections — which the published `@gpuix/native` tarball does not ship.",
  pinned:
    "The installed `@gpuix/native@0.10.0` declarations own the four update formats, `pubkey`, `installerArgs` and the three published native targets. They do not describe a packager.",
  sizes: [
    { what: "Bun chat `.app`", value: "82 MB" },
    { what: "Hermes counter `.app`", value: "34 MB" },
    { what: "Hermes build", value: "12 MB plus a 22 MB native sidecar" },
  ],
  note: "Those sizes are GPUix's measurements on GPUix's machine. This site has packaged nothing, so none of them is a measurement of this library or of this repository.",
} as const;

/**
 * Every way the page's data can contradict itself or the update client.
 * Pure, so the test can feed fixtures for each rule and the real values for the
 * run (the shape plans 633 and 625 use).
 */
export const distributionViolations = (input: {
  readonly formats: ReadonlyArray<PackagerFormatRow>;
  readonly updaterFormats: ReadonlyArray<string>;
  readonly config: PackagerConfig;
}): ReadonlyArray<string> => {
  const keys = input.formats.map((row) => `${row.os}:${row.format}`);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  const authored = input.formats.map((row) => row.format);
  const updater = [...input.updaterFormats];

  return [
    ...(input.formats.length === 0 ? ["no packager format is documented"] : []),
    ...duplicates.map((key) => `${key} is documented twice`),
    ...updater
      .filter((format) => !authored.includes(format))
      .map((format) => `${format} is an update format but has no row`),
    ...input.formats
      .filter((row) => row.update && !updater.includes(row.format))
      .map((row) => `${row.format} is marked installable by the updater`),
    ...input.formats
      .filter((row) => !row.update && row.format !== "dmg")
      .map((row) => `${row.format} is not installable but is not the dmg case`),
    ...(input.formats.some((row) => row.updateAsset.length === 0)
      ? ["a format row has no update asset"]
      : []),
    ...input.config.formats
      .filter((format) => !authored.includes(format))
      .map((format) => `the config names ${format}, which has no row`),
    ...(input.config.binaries.filter((binary) => binary.main).length === 1
      ? []
      : ["the config must mark exactly one binary main"]),
    ...(input.config.icons.length === 0
      ? ["the config declares no icon"]
      : []),
  ];
};
