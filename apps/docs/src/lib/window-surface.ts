/**
 * The native window a GPUIXUI application lives in (plan 625).
 *
 * The component library paints inside one window; `@gpuix/react`'s `render()`
 * opens it and `@gpuix/native`'s `WindowOptions` configures it. None of that
 * surface had a page, so `traffic lights`, `fullscreen`, `safe area`,
 * `wayland`, `system tray` and `devtools` reached another page or nothing.
 *
 * Every table row is authored here and checked against the installed
 * declarations by `window-surface.test.ts`: a field the package adds fails
 * until it is explained, and a field this module invents fails by name. The
 * page renders these arrays, so nothing is retyped at the call site.
 *
 * Plan 631 adds the display-scale absence: the runtime has no scale query, so
 * the row borrows `display-scale.ts`'s symbol and the existing guard fails the
 * day one appears.
 */
import { scaleQuerySymbol } from "./display-scale";

export interface WindowField {
  readonly name: string;
  readonly summary: string;
}

export interface WindowFamily {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly fields: ReadonlyArray<WindowField>;
}

export interface WindowMethod {
  readonly name: string;
  readonly summary: string;
}

export interface WindowAbsence {
  readonly subject: string;
  readonly statement: string;
  /** A symbol that would make the absence false if the runtime gained it. */
  readonly symbol?: RegExp;
}

/** `WindowOptions`, grouped by what a reader is trying to do. */
export const windowFamilies: ReadonlyArray<WindowFamily> = [
  {
    id: "identity",
    title: "Identity",
    note: "What the operating system shows about the application.",
    fields: [
      {
        name: "title",
        summary:
          "The window title. The OS window manager paints it; it is not in-app text.",
      },
      {
        name: "appName",
        summary:
          "The name in the macOS Hide and Quit menu items. Defaults to `title`; the menu title itself comes from the executable, and only a `.app` bundle changes it.",
      },
      {
        name: "appId",
        summary:
          "The application id — Wayland `app_id`, X11 `WM_CLASS`. Desktops group windows and match rules by it; a compositor-targeted layer shell needs one.",
      },
    ],
  },
  {
    id: "geometry",
    title: "Geometry",
    note: "Sizes are logical pixels. The window is not positioned from JavaScript.",
    fields: [
      {
        name: "width",
        summary: "Initial content width. Omitted, the runtime chooses.",
      },
      {
        name: "height",
        summary: "Initial content height. Omitted, the runtime chooses.",
      },
      {
        name: "minWidth",
        summary: "The smallest width the user can resize to.",
      },
      {
        name: "minHeight",
        summary: "The smallest height the user can resize to.",
      },
      {
        name: "resizable",
        summary: "Whether the user can resize the window.",
      },
      {
        name: "fullscreen",
        summary:
          "Open in native fullscreen. `toggleFullscreen()` changes it later.",
      },
    ],
  },
  {
    id: "appearance",
    title: "Appearance and chrome",
    note: "The frame around the React tree; see Custom window chrome for the composition.",
    fields: [
      {
        name: "transparent",
        summary:
          "Plain alpha transparency. Prefer `windowBackground` when you need blur.",
      },
      {
        name: "titlebarTransparent",
        summary:
          "Hide the native titlebar so the application can draw chrome under the traffic lights.",
      },
      {
        name: "windowBackground",
        summary:
          "`opaque`, `transparent` or `blurred`. `transparent: true` means `transparent` when this is unset.",
      },
      {
        name: "trafficLightX",
        summary:
          "Where the macOS traffic lights sit, so a custom title bar can leave room for them.",
      },
      {
        name: "trafficLightY",
        summary: "The vertical position of the macOS traffic lights.",
      },
    ],
  },
  {
    id: "lifecycle",
    title: "Lifecycle",
    note: "How the window enters the desktop when the process starts.",
    fields: [
      {
        name: "focus",
        summary:
          "Take key focus when it opens. `false` opens behind the active app, like `open -g`; ignored on Linux.",
      },
      {
        name: "show",
        summary:
          "Show the window when it opens. `false` starts hidden; call `activateWindow()` later. Ignored on Linux.",
      },
    ],
  },
  {
    id: "linux",
    title: "Linux surfaces",
    note: "Wayland only; ignored on every other platform.",
    fields: [
      {
        name: "layerShell",
        summary:
          "Open as a `wlr-layer-shell` surface — a bar, dock, notification overlay or wallpaper — with no native titlebar, instead of a floating window.",
      },
    ],
  },
];

/** `LayerShellOptions`: what a compositor-anchored surface declares. */
export const layerShellFields: ReadonlyArray<WindowField> = [
  {
    name: "namespace",
    summary:
      "Compositor surface namespace, used for window rules. Cannot change after the surface exists; defaults to the empty string.",
  },
  {
    name: "layer",
    summary: "`background`, `bottom`, `top` or `overlay`. Defaults to `top`.",
  },
  {
    name: "anchor",
    summary:
      'Edges to anchor to — any combination of `top`, `bottom`, `left` and `right`. Two opposite edges stretch the surface across that axis. Defaults to `["top", "left", "right"]`, a top bar.',
  },
  {
    name: "exclusiveZone",
    summary:
      "Logical pixels reserved along the anchored edge so other windows do not overlap. `0` lets the compositor decide; a negative value reserves nothing.",
  },
  {
    name: "exclusiveEdge",
    summary:
      "Which edge the exclusive zone applies to when a single-edge anchor cannot say.",
  },
  {
    name: "margin",
    summary:
      "Gap from the anchor edges in CSS order — `[top, right, bottom, left]`. Must have exactly four entries or it is ignored.",
  },
  {
    name: "keyboardInteractivity",
    summary:
      "`none`, `on-demand` or `exclusive`. Defaults to `none`: a bar or overlay that never takes keyboard focus.",
  },
];

/** `WindowInsets` as `useWindowInsets()` returns it: the renderer's three
 * regions plus the observer's three derived keyboard numbers. */
export const windowInsets: ReadonlyArray<WindowField> = [
  {
    name: "safeArea",
    summary: "The display's safe area: notch, rounded corners and system bars.",
  },
  {
    name: "ime",
    summary: "The on-screen keyboard or input-method editor region.",
  },
  {
    name: "effective",
    summary: "What layout should respect: the safe area and the IME combined.",
  },
  {
    name: "keyboardTop",
    summary:
      "The y coordinate where the IME begins: the window height minus the IME's bottom inset.",
  },
  {
    name: "keyboardVisible",
    summary: "Whether the IME currently covers part of the window.",
  },
  {
    name: "visibleHeight",
    summary: "The height of the window that is still visible above the IME.",
  },
];

/** `PathPromptOptions`: the native file and directory picker. */
export const pathPromptFields: ReadonlyArray<WindowField> = [
  {
    name: "files",
    summary: "Select files. Defaults to true unless `directories` is set.",
  },
  {
    name: "directories",
    summary: "Select directories. Defaults to false.",
  },
  {
    name: "multiple",
    summary: "Allow several paths. Defaults to false.",
  },
  {
    name: "prompt",
    summary: "The label on the picker's confirmation button.",
  },
];

/**
 * The `GpuixRenderer` methods that act on the window or its picker. The list is
 * not free-form: `windowSurfaceViolations` derives the same set from the class
 * and fails on either side of a difference.
 */
export const windowRendererMethods: ReadonlyArray<WindowMethod> = [
  {
    name: "init",
    summary:
      "Open the window with `WindowOptions`. `render()` calls it; call it directly only when you build a custom root.",
  },
  {
    name: "activateWindow",
    summary:
      "Bring the window forward and give it focus — how a window opened with `show: false` or `focus: false` is revealed.",
  },
  {
    name: "minimizeWindow",
    summary: "Minimize the native window.",
  },
  {
    name: "zoomWindow",
    summary: "Run the native zoom or maximize operation.",
  },
  {
    name: "toggleFullscreen",
    summary: "Enter or leave native fullscreen.",
  },
  {
    name: "setWindowTitle",
    summary: "Change the title after the window is open.",
  },
  {
    name: "getWindowSize",
    summary:
      "The paintable content size in logical pixels, excluding the title bar. This is the size layout sees.",
  },
  {
    name: "getWindowInsets",
    summary: "The current safe-area and IME geometry.",
  },
  {
    name: "promptForPaths",
    summary:
      "Open the operating system's file or directory picker. Resolves `null` when the user cancels.",
  },
  {
    name: "setDebugFrameOverlay",
    summary:
      "Paint the runtime's own frame overlay. The argument is `hidden`, `minimal` or `full`.",
  },
  {
    name: "cycleDebugFrameOverlay",
    summary: "Step the overlay through hidden, minimal, full, hidden.",
  },
  {
    name: "getDebugFrameOverlay",
    summary: "The current overlay mode.",
  },
  {
    name: "resetDebugFrameOverlayStats",
    summary: "Clear the last 1 000 draw samples. The frame count stays.",
  },
  {
    name: "getDebugFrameOverlayStats",
    summary:
      "The same numbers the overlay paints: current, p90, p99, max, frames and samples.",
  },
];

/**
 * What a window-level API does not provide. A reader who needs a tray or a
 * native menu must get it from the host application; the component library
 * cannot draw it.
 */
export const windowAbsences: ReadonlyArray<WindowAbsence> = [
  {
    subject: "System tray or menu-bar item",
    statement:
      "No tray or status-item API is declared. An icon in the menu bar belongs to the host application's own code, outside this library.",
    symbol: /tray/iu,
  },
  {
    subject: "Native application menu",
    statement:
      "No application-menu API is declared. On macOS the menu title comes from the executable, and `appName` only names the Hide and Quit items; on Linux and Windows the application owns its menu bar.",
    symbol: /app(?:lication)?Menu|menuBar/u,
  },
  {
    subject: "Window position and always-on-top",
    statement:
      "`WindowOptions` has no position (`x`, `y`) and no always-on-top field. The window manager places the window; an app that needs a placed surface uses the Wayland layer shell.",
    symbol: /windowPosition|setWindowPosition|windowX|windowY|alwaysOnTop/u,
  },
  {
    subject: "More than one window",
    statement:
      "The React entry opens one window per process and `render()` is not re-entrant: a second call throws, as `apps/playground/src/main.tsx` records.",
    symbol: /createWindow|newWindow|windowCount|openWindow/u,
  },
  {
    subject: "A display scale factor",
    statement:
      "No API reports the display's backing scale. Sizes are logical pixels and the runtime exposes no `devicePixelRatio`, `scaleFactor` or OS zoom query, so an application cannot choose a 2× asset from JavaScript; icons are vector markup and an image paints the one `src` it is given.",
    symbol: scaleQuerySymbol,
  },
  {
    subject: "Browser DevTools or an element inspector",
    statement:
      "The window is not a web page, so there is no element inspector. The runtime's debug frame overlay is the built-in tool: it paints frame times and exposes the same numbers as statistics.",
  },
];

/**
 * Field names declared by every `interface Name` in the installed declarations,
 * in first-seen order.
 *
 * A name can be declared more than once across the package's files: the entry's
 * `WindowInsets` carries `safeArea`/`ime`/`effective`, and `dist/host-runtime`
 * extends it with `keyboardTop`/`keyboardVisible`/`visibleHeight` — the shape
 * `useWindowInsets()` actually returns. The union is what a consumer sees.
 */
export const interfaceFieldsIn = (
  declarations: string,
  name: string,
): ReadonlyArray<string> => {
  const pattern = new RegExp(
    `interface ${name}[^{\\n]*\\{([\\s\\S]*?)\\n\\}`,
    "gu",
  );
  const fields = [...declarations.matchAll(pattern)].flatMap((match) =>
    interfaceFieldNames(match[1] ?? ""),
  );
  return [...new Set(fields)];
};

/** Field names an interface body declares, in declaration order. */
export const interfaceFieldNames = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\??:/gmu)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

/** Every method the installed `GpuixRenderer` class declares. */
export const rendererMethodNames = (
  declarations: string,
): ReadonlyArray<string> => {
  const body = declarations.slice(
    declarations.indexOf("export declare class GpuixRenderer"),
  );
  const open = body.indexOf("{");
  const close = body.indexOf("\n}");
  if (open < 0 || close < 0) return [];
  return [
    ...body.slice(open + 1, close).matchAll(/^ {2}([A-Za-z][A-Za-z0-9]*)\(/gmu),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
};

/**
 * The window-shaped methods on the installed renderer. The two window-key and
 * selection listeners are excluded: they are the keyboard path Component API
 * documents, not window presentation.
 */
export const windowRendererMethodNames = (
  declarations: string,
): ReadonlyArray<string> =>
  rendererMethodNames(declarations).filter(
    (name) =>
      name === "init" ||
      name === "promptForPaths" ||
      (/Window|Fullscreen|DebugFrameOverlay|Title|Minimize|Zoom|Insets/u.test(
        name,
      ) &&
        name !== "setWindowKeyEvents" &&
        name !== "setWindowSelectionChange"),
  );

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => {
  const counts = new Map<string, number>();
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
};

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

const interfaceViolations = (input: {
  readonly declarations: string;
  readonly interfaceName: string;
  readonly rows: ReadonlyArray<WindowField>;
}): ReadonlyArray<string> => {
  const installed = interfaceFieldsIn(input.declarations, input.interfaceName);
  const authored = input.rows.map((row) => row.name);

  return [
    ...(installed.length === 0
      ? [`the installed declarations have no ${input.interfaceName} body`]
      : []),
    ...duplicates(authored).map(
      (name) => `${input.interfaceName}: ${name} is documented twice`,
    ),
    ...differences(authored, installed).map(
      (name) =>
        `${input.interfaceName}: ${name} is documented but the installed declarations do not declare it`,
    ),
    ...differences(installed, authored).map(
      (name) => `${input.interfaceName}: ${name} is declared but undocumented`,
    ),
  ];
};

/**
 * Every way this module can disagree with the installed runtime, in both
 * directions. Pure, so `window-surface.test.ts` can feed it fixtures for each
 * rule and one call with the real declarations for the run.
 */
export const windowSurfaceViolations = (input: {
  readonly declarations: string;
  readonly families: ReadonlyArray<WindowFamily>;
  readonly layerShell: ReadonlyArray<WindowField>;
  readonly insets: ReadonlyArray<WindowField>;
  readonly methods: ReadonlyArray<WindowMethod>;
  readonly pathPrompt: ReadonlyArray<WindowField>;
  readonly absences: ReadonlyArray<WindowAbsence>;
}): ReadonlyArray<string> => {
  const installedMethods = windowRendererMethodNames(input.declarations);
  const authoredMethods = input.methods.map((method) => method.name);

  return [
    ...(input.families.length === 0
      ? ["no WindowOptions family is declared"]
      : []),
    ...input.families
      .filter((family) => family.fields.length === 0)
      .map((family) => `WindowOptions: the ${family.id} family has no fields`),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "WindowOptions",
      rows: input.families.flatMap((family) => family.fields),
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "LayerShellOptions",
      rows: input.layerShell,
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "WindowInsets",
      rows: input.insets,
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "PathPromptOptions",
      rows: input.pathPrompt,
    }),
    ...duplicates(authoredMethods).map(
      (name) => `GpuixRenderer: ${name} is documented twice`,
    ),
    ...differences(authoredMethods, installedMethods).map(
      (name) =>
        `GpuixRenderer: ${name} is documented but the installed class does not declare it`,
    ),
    ...differences(installedMethods, authoredMethods).map(
      (name) => `GpuixRenderer: ${name} is a window method but is undocumented`,
    ),
    ...input.absences.flatMap((absence) => {
      const found =
        absence.symbol === undefined
          ? undefined
          : input.declarations.match(absence.symbol);
      return found === null || found === undefined
        ? []
        : [
            `${absence.subject}: the page says it is absent, but the declarations now contain ${found[0]}`,
          ];
    }),
  ];
};
