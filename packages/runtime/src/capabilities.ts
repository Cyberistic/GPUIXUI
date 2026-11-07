export interface SupportedCapability {
  readonly supported: true;
}

export interface UnsupportedCapability {
  readonly supported: false;
  readonly reason: string;
  readonly workaround: string;
}

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
  systemAppearance: {
    supported: false,
    reason:
      "No accent colour, Light/Dark choice or Reduce Transparency reaches the app.",
    workaround:
      "Read them at the app boundary with `@gpuixui/shell`'s `readAppearance` / `watchAppearance` (`defaults`), and apply `appearanceOverrides`.",
  },
  terminal: { supported: true },
  headlessDialog: { supported: true },
  tabNavigation: { supported: true },
} as const satisfies Readonly<Record<string, Capability>>;

export type CapabilityKey = keyof typeof capabilities;

export const unsupportedFeatures = [
  "transform",
  "gridSpan",
  "canvas",
  "imeComposition",
  "globalShortcut",
  "tray",
  "nativeView",
  "systemAppearance",
] as const satisfies ReadonlyArray<CapabilityKey>;

export type UnsupportedFeature = (typeof unsupportedFeatures)[number];
