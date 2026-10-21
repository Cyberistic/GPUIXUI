/**
 * The pinned runtime's capability matrix.
 *
 * One literal-typed entry per capability the runtime provides or does not. A
 * `supported: false` entry carries the honest `reason` and `workaround`; a
 * `supported: true` entry needs neither. The literal values let
 * `capabilities.transform.supported` narrow to `false`, not `boolean`.
 *
 * The compile-time guards in `guards.ts` fail the build the moment the runtime
 * adds a key this matrix claims is absent, so a `false` row cannot go stale
 * silently.
 */

/** A capability the pinned runtime provides. */
export interface SupportedCapability {
  readonly supported: true;
}

/** A capability the pinned runtime does not provide. */
export interface UnsupportedCapability {
  readonly supported: false;
  readonly reason: string;
  readonly workaround: string;
}

/** The discriminated capability entry. */
export type Capability = SupportedCapability | UnsupportedCapability;

export const capabilities = {
  transform: {
    supported: false,
    reason:
      "`StyleDesc` has no `transform` (nor `transformOrigin`, `rotate`, " +
      "`scale`, `translate` or `skew`).",
    workaround:
      "Animate motion with `@gpuixui/motion`; static rotation/scale is unsupported.",
  },
  gridSpan: {
    supported: false,
    reason:
      "The grid exposes only `gridColumnMin`/`gridRowMin` and integer " +
      "`gridTemplateColumns`/`gridTemplateRows` — no `gridColumn`/`gridRow` span.",
    workaround:
      "Size the track with `gridTemplateColumns`/`gridTemplateRows` or give the " +
      "item an explicit width; `span 2` is unrepresentable.",
  },
  canvas: {
    supported: false,
    reason: "`canvas` is a blank host element — no 2D-context or draw props.",
    workaround:
      "Render `svg` or compose `div`/`svg` primitives; there is no retained draw API.",
  },
  imeComposition: {
    supported: false,
    reason: "No IME/composition events reach the React surface.",
    workaround:
      "Compose at the application layer from `onInput`/`onKeyDown`; live IME preview needs a runtime change.",
  },
  globalShortcut: {
    supported: false,
    reason:
      "No global/system hotkey registration — key events fire only while the window is focused.",
    workaround:
      "Use window-level `onKeyDown`; background hotkeys need a runtime change.",
  },
  tray: {
    supported: false,
    reason: "No tray/menu-bar/status-item host.",
    workaround: "Ship an in-window menu; a system tray needs a runtime change.",
  },
  nativeView: {
    supported: false,
    reason: "No webview/native child-view host.",
    workaround:
      "Use `markdown`/`code`/`diff` surfaces; embedded web content needs a runtime change.",
  },
  terminal: { supported: true },
  headlessDialog: { supported: true },
  tabNavigation: { supported: true },
} as const satisfies Readonly<Record<string, Capability>>;

export type CapabilityKey = keyof typeof capabilities;

/** The capabilities the runtime does NOT provide. */
export const unsupportedFeatures = [
  "transform",
  "gridSpan",
  "canvas",
  "imeComposition",
  "globalShortcut",
  "tray",
  "nativeView",
] as const satisfies ReadonlyArray<CapabilityKey>;

/** A capability the runtime does not provide. */
export type UnsupportedFeature = (typeof unsupportedFeatures)[number];
