/**
 * The runtime's auto-update surface (plan 633).
 *
 * `@gpuix/native` 0.10.0 ships a signed-update client in its Node entry —
 * `checkUpdate`, `AvailableUpdate`, `CheckUpdateOptions` — and the site had no
 * page for it while `deployment.mdx` said auto-update was not implemented.
 * Measured 2026-10-21: `updater` reached Testing, `auto update` a text-area
 * limitation, `checkUpdate` and `relaunch` returned nothing, and `code signing`
 * reached Text variants.
 *
 * The rows are authored; the names are not. `updater.test.ts` compares this
 * module with the installed declarations in both directions, so a member the
 * runtime adds fails until it is explained and an invented member fails by name.
 */
import { interfaceFieldsIn } from "./native-elements";

export interface UpdaterRow {
  readonly name: string;
  readonly summary: string;
}

export interface UpdaterGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: ReadonlyArray<UpdaterRow>;
}

export interface UpdaterAbsence {
  readonly subject: string;
  readonly statement: string;
}

/** The packager formats the installed `format` getter documents. */
export const updateFormats: ReadonlyArray<string> = [
  "app",
  "appimage",
  "nsis",
  "wix",
];

/** `AvailableUpdate`, `CheckUpdateOptions` and `UpdaterHeader`, grouped. */
export const updaterGroups: ReadonlyArray<UpdaterGroup> = [
  {
    id: "result",
    title: "What a check returns",
    note: "An `AvailableUpdate` when the feed announces a newer version, `null` when it answers 204 or announces nothing newer.",
    rows: [
      {
        name: "currentVersion",
        summary:
          "The version currently running — the string the app passed to `checkUpdate`.",
      },
      {
        name: "version",
        summary:
          "The version the feed announces. The runtime has already decided it is newer; the app displays it.",
      },
      {
        name: "notes",
        summary: "The feed's release notes, or `null` when the feed sent none.",
      },
      {
        name: "date",
        summary:
          "The feed's `pub_date` as an RFC 3339 string, or `null` when it sent none.",
      },
      {
        name: "downloadUrl",
        summary:
          "The URL the signed bundle is fetched from when the update is installed.",
      },
      {
        name: "format",
        summary:
          "The bundle's packager format: `app`, `appimage`, `nsis` or `wix`.",
      },
      {
        name: "downloadAndInstall",
        summary:
          "Downloads the bundle, verifies its signature against `pubkey` and replaces the running app. It does not relaunch; quit after it resolves.",
      },
    ],
  },
  {
    id: "options",
    title: "What a check takes",
    note: "The second argument of `checkUpdate(currentVersion, options)`.",
    rows: [
      {
        name: "endpoints",
        summary:
          "Feed URLs. `{{target}}`, `{{arch}}` and `{{current_version}}` are filled in per platform.",
      },
      {
        name: "pubkey",
        summary:
          "The public key the download is verified against, generated with `cargo packager signer generate`.",
      },
      {
        name: "headers",
        summary:
          "Extra HTTP headers sent with the feed and download requests, as `UpdaterHeader` name/value pairs.",
      },
      {
        name: "timeoutMs",
        summary: "Request timeout for the feed request, in milliseconds.",
      },
      {
        name: "installerArgs",
        summary: "Extra arguments passed to the Windows NSIS or WiX installer.",
      },
      {
        name: "installMode",
        summary:
          "Windows install UI: `passive` (the default), `quiet` or `basicUi`.",
      },
    ],
  },
  {
    id: "header",
    title: "One update request header",
    note: "`CheckUpdateOptions.headers` is an array of these.",
    rows: [
      { name: "name", summary: "The header name, e.g. `Authorization`." },
      { name: "value", summary: "The header value." },
    ],
  },
];

/**
 * What the page must state as absent. `updaterSurfaceViolations` checks the
 * machine-checkable half against the installed declarations, the browser entry
 * and the workspace source; the packaging pipeline cannot be checked here and
 * is stated as an unverified boundary on the page instead.
 */
export const updaterAbsences: ReadonlyArray<UpdaterAbsence> = [
  {
    subject: "Update UI",
    statement:
      "No component checks, prompts or installs. Compose `ConfirmDialog`, `Progress` and `Toast` around the API, as the example above does.",
  },
  {
    subject: "Scheduling",
    statement:
      "Nothing checks at startup or on a timer. The host app decides when to call `checkUpdate`.",
  },
  {
    subject: "Delta updates",
    statement:
      "Every update is a whole bundle; no patch or delta option is declared.",
  },
  {
    subject: "Relaunch",
    statement:
      "`downloadAndInstall()` replaces the files and returns. Quitting is the app's job.",
  },
  {
    subject: "Rollback",
    statement:
      "No downgrade or rollback path is declared; keeping the previous bundle is the packager's concern.",
  },
  {
    subject: "Feed hosting",
    statement:
      "The runtime fetches a feed. Serving it, signing the bundles and hosting the files are outside this repository.",
  },
  {
    subject: "React wrapper",
    statement:
      "`@gpuix/react` exports none of the updater; import it from `@gpuix/native`.",
  },
  {
    subject: "Browser entry",
    statement:
      "The package's browser entry exports the renderer and none of the updater, so there is no wasm scene and nothing on this site runs it.",
  },
  {
    subject: "Packaging pipeline",
    statement:
      "No packaged app is built, signed or run in this repository, so the install path has no measured evidence on this site.",
  },
];

export interface UpdaterSurfaceInput {
  /** The installed `@gpuix/native` declarations. */
  readonly declarations: string;
  /** The installed `@gpuix/react` declarations. */
  readonly reactDeclarations: string;
  /** The names the package's browser entry exports. */
  readonly browserExports: ReadonlyArray<string>;
  /** Every `packages/*\/src` file, joined. */
  readonly packageSource: string;
  readonly groups?: ReadonlyArray<UpdaterGroup>;
  readonly formats?: ReadonlyArray<string>;
}

const classBodyIn = (declarations: string, name: string): string => {
  const start = declarations.indexOf(`export declare class ${name} `);
  if (start < 0) return "";
  const open = declarations.indexOf("{", start);
  const close = declarations.indexOf("\n}", open);
  return open < 0 || close < 0 ? "" : declarations.slice(open + 1, close);
};

/** Getter and method names on one declared class, in declaration order. */
export const classMemberNames = (
  declarations: string,
  name: string,
): ReadonlyArray<string> =>
  [
    ...classBodyIn(declarations, name).matchAll(
      /^ {2}(?:get )?([A-Za-z][A-Za-z0-9]*)\(/gmu,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/** A member's doc comment, for the one fact that lives only in prose. */
const memberCommentIn = (
  declarations: string,
  className: string,
  member: string,
): string => {
  const body = classBodyIn(declarations, className);
  const at = body.search(new RegExp(`^ {2}get ${member}\\(`, "mu"));
  if (at < 0) return "";
  const before = body.slice(0, at);
  const open = before.lastIndexOf("/**");
  return open < 0 ? "" : before.slice(open);
};

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => {
  const counts = new Map<string, number>();
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
};

const groupRows = (
  groups: ReadonlyArray<UpdaterGroup>,
  id: string,
): ReadonlyArray<string> =>
  (groups.find((group) => group.id === id)?.rows ?? []).map((row) => row.name);

const groupViolations = (input: {
  readonly installed: ReadonlyArray<string>;
  readonly authored: ReadonlyArray<string>;
  readonly group: string;
  readonly source: string;
}): ReadonlyArray<string> => [
  ...(input.installed.length === 0
    ? [`the installed declarations have no ${input.source} members`]
    : []),
  ...duplicates(input.authored).map(
    (name) => `${input.group}: ${name} is documented twice`,
  ),
  ...differences(input.authored, input.installed).map(
    (name) => `${input.group}: ${name} is documented but not declared`,
  ),
  ...differences(input.installed, input.authored).map(
    (name) => `${input.group}: ${name} is declared but undocumented`,
  ),
];

const UPDATE_NAMES =
  /checkUpdate|AvailableUpdate|downloadAndInstall|UpdaterHeader/u;
const NOT_PROVIDED = /relaunch|rollback|downgrade|schedule|interval/iu;
const DELTA = /delta|patch/iu;

/**
 * Every way this module can disagree with the installed runtime, in both
 * directions. Pure, so `updater.test.ts` can feed it one fixture per rule and
 * the real declarations for the run.
 */
export const updaterSurfaceViolations = (
  input: UpdaterSurfaceInput,
): ReadonlyArray<string> => {
  const groups = input.groups ?? updaterGroups;
  const formats = input.formats ?? updateFormats;
  const result = groupRows(groups, "result");
  const options = groupRows(groups, "options");
  const header = groupRows(groups, "header");
  const classMembers = classMemberNames(input.declarations, "AvailableUpdate");
  const declaredFormats = [
    ...memberCommentIn(
      input.declarations,
      "AvailableUpdate",
      "format",
    ).matchAll(/`([a-z0-9]+)`/gu),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
  const checkUpdateAt = input.declarations.indexOf(
    "export declare function checkUpdate(",
  );
  const checkUpdateLine =
    checkUpdateAt < 0
      ? ""
      : (input.declarations.slice(checkUpdateAt).split("\n")[0] ?? "");
  const notProvided = [
    ...classMembers,
    ...interfaceFieldsIn(input.declarations, "CheckUpdateOptions"),
  ].filter((name) => NOT_PROVIDED.test(name));
  const deltaOptions = interfaceFieldsIn(
    input.declarations,
    "CheckUpdateOptions",
  ).filter((name) => DELTA.test(name));

  return [
    ...groupViolations({
      installed: classMembers,
      authored: result,
      group: "AvailableUpdate",
      source: "AvailableUpdate",
    }),
    ...groupViolations({
      installed: interfaceFieldsIn(input.declarations, "CheckUpdateOptions"),
      authored: options,
      group: "CheckUpdateOptions",
      source: "CheckUpdateOptions",
    }),
    ...groupViolations({
      installed: interfaceFieldsIn(input.declarations, "UpdaterHeader"),
      authored: header,
      group: "UpdaterHeader",
      source: "UpdaterHeader",
    }),
    ...(checkUpdateLine === ""
      ? ["the installed declarations have no checkUpdate function"]
      : []),
    ...(checkUpdateLine !== "" &&
    (!checkUpdateLine.includes("CheckUpdateOptions") ||
      !checkUpdateLine.includes("Promise<AvailableUpdate"))
      ? [
          `checkUpdate no longer takes CheckUpdateOptions and resolves an AvailableUpdate: ${checkUpdateLine}`,
        ]
      : []),
    ...(declaredFormats.length === 0
      ? ["the format getter's doc comment names no packager format"]
      : []),
    ...differences(formats, declaredFormats).map(
      (name) => `format: ${name} is documented but not declared`,
    ),
    ...differences(declaredFormats, formats).map(
      (name) => `format: ${name} is declared but undocumented`,
    ),
    ...(UPDATE_NAMES.test(input.reactDeclarations)
      ? [
          "@gpuix/react now declares updater names; the no-wrapper claim is stale",
        ]
      : []),
    ...input.browserExports
      .filter((name) => UPDATE_NAMES.test(name))
      .map((name) => `the browser entry now exports ${name}`),
    ...(UPDATE_NAMES.test(input.packageSource)
      ? [
          "a workspace package references the updater; the no-update-UI claim is stale",
        ]
      : []),
    ...notProvided.map(
      (name) => `${name} is declared, so a stated absence is stale`,
    ),
    ...deltaOptions.map(
      (name) => `${name} is a declared option, so the no-delta claim is stale`,
    ),
  ];
};
