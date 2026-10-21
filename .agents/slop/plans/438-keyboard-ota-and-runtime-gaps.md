# 438 — Keyboard controls, OTA updates, and the runtime gap list

| Field | Value |
| ----- | ----- |
| Status | keyboard half **landed** (`packages/keyboard`, §4) — OTA/updater (§5) and the native-gated gaps still open |
| Phase | A (capability spec) → feeds the keyboard workstream, the updater package, and the runtime workstream |
| Owner | research / runtime seam owner |
| Depends on | `020` (capability map), `310` (accelerator model), `316` (hotkey recorder), `437` (foreign-surface seam), `reference-research.md` |
| Feeds | a keymap/command package, a focus-management package, `packages/updater`, and the deferred upstream issue set |

This plan answers three questions the owner posed, with evidence, and does **no**
implementation. It is the specification the weaker executors build against:

1. **FlashSpace** — how a shipping macOS utility does global hotkeys and OTA.
2. **GPUix today** — what key/focus/update surface the pinned `@gpuix/native@0.11.0`
   actually exposes, and the exact list of what is missing.
3. **The design** — a library-level keyboard architecture, an OTA architecture,
   and the honest *library-only / runtime change / runtime + native helper*
   classification of every gap.

Read `020` §1 and `437` §1 first; this plan extends them, it does not repeat
them.

---

## 1. FlashSpace findings

Shallow clone `wojciech-kulik/FlashSpace@ea52d7d` (v4.18.81), read on 2026-10-19.
Every path is relative to that clone root.

### 1.1 Global hotkeys

- **API.** FlashSpace does **not** hand-roll Carbon hotkeys; it wraps the
  third-party `KeyboardShortcuts` library (a fork of Sindre Sorhus's package)
  pinned via SPM at `project.yml:27-29` (`github: wojciech-kulik/KeyboardShortcuts`,
  `branch: main`) and imported at `Features/HotKeys/HotKeysManager.swift:11`.
  The library registers macOS global hotkeys through Carbon
  `RegisterEventHotKey`, which fires **while the app is backgrounded** and
  requires **no Accessibility or Input Monitoring permission**.
- **Registration / rebind / storage.** One `KeyboardShortcuts.Name` per command
  (`Features/HotKeys/Models/KeyboardShortcuts.swift:20-67` — a flat static list of
  `showFlashSpace`, `toggleFlashSpace`, `activateWorkspace(_:)`, `focusLeftApp`, …).
  A `RecordedHotKey` binds `{ name, hotKey, action }`
  (`KeyboardShortcuts.swift:13-17`). The manager clears and re-registers the whole
  set on every change: `removeAllHandlers()` then `onKeyDown(for:action:)` per
  entry (`HotKeysManager.swift:58-66`), with `disableAll()` =
  `removeAllHandlers()` (`HotKeysManager.swift:162-164`). The shortcut value is
  stored as a **string** (`AppHotKey.value`, e.g. `"cmd+shift+f"`),
  `Features/HotKeys/Models/AppHotKey.swift:13-24`; a custom decoder migrates the
  legacy `{keyCode, modifiers}` v1 form to the string v2 form
  (`AppHotKey.swift:26-49`).
- **Key-code / modifier maps.** Strings are converted to raw key codes via the
  current keyboard layout using Carbon `UCKeyTranslate` +
  `TISCopyCurrentKeyboardInputSource` (`KeyCodesMap.swift:21-101`), plus a
  hand-written alias table for named keys (`space`, `enter`, arrows, `f1`–`f12`,
  keypad, …) at `KeyCodesMap.swift:103-147`. Modifiers are the four tokens
  `cmd`/`ctrl`/`opt`/`shift` (`KeyModifiersMap.swift:11-33`). The maps are
  **rebuilt on keyboard-input-source change** via the
  `kTISNotifySelectedKeyboardInputSourceChanged` distributed notification
  (`HotKeysManager.swift:172-178`).
- **Conflict handling.** The recorder pauses the active hotkeys while listening;
  `KeyboardShortcuts.onPausedKeyDown` reports a clash by scope
  (`HotKeysManager.swift:39-48`). Conflicts are surfaced as a modal "already
  assigned within the <scope> scope" (`Alerts.showOkAlert`), not silently
  resolved.
- **Permissions.** Accessibility is requested **only** when workspace management
  starts (`Features/Workspaces/WorkspaceManager.swift:68` →
  `PermissionsManager.askForAccessibilityPermissions()` →
  `AXIsProcessTrustedWithOptions`, `Utils/PermissionsManager.swift:15-22`), and
  Screen Recording only when Space Control screenshots start
  (`Features/SpaceControl/SpaceControl.swift:69`,
  `PermissionsManager.swift:24-30`). **Neither is needed for the global hotkeys
  themselves.** There is no Input Monitoring (`CGEventTap`) use anywhere.
- **Background.** The app is a menu-bar-only agent (`project.yml:58`,
  `INFOPLIST_KEY_LSUIElement: true`); the Carbon hotkeys keep working because they
  are system registrations, not in-app key handling.

### 1.2 Keyboard UX

- **Command/action model.** Commands are a closed set of named hotkeys with a
  display **scope** string (`"Workspace"`, `"Profile"`, `"Floating Apps"`,
  `"Focus Manager"`, `"General"`, `"Space Control"`, `"Workspace Switcher"`),
  enumerated in `HotKeysManager.swift:72-159`. There is no generic keymap engine —
  it is a list of `RecordedHotKey` whose action is a closure.
- **Keymap abstraction.** `AppHotKey` is a single string with two projections:
  `toShortcut()` for the global registration (`AppHotKey+Shortcut.swift:11-22`)
  and `toKeyboardShortcut()` for SwiftUI in-menu key equivalents
  (`AppHotKey+KeyboardShortcut.swift:11-57`). This dual representation is the
  useful transferable idea: one binding feeds both a system hotkey and a menu
  accelerator.
- **Recorder.** `HotKeyControl` is a thin `NSViewRepresentable` over
  `KeyboardShortcuts.RecorderCocoa` (`UI/HotKeyControl.swift:13-28`), observing
  `.shortcutByNameDidChange` with an `isListeningForChanges` guard so programmatic
  re-registration does not echo back into the UI (`HotKeyControl.swift:45-67`).
- **No cheatsheet page.** Shortcuts are discoverable only through the settings
  recorder controls and the menu bar's `.keyboardShortcut(...)` equivalents
  (`Features/MenuBar/FlashSpaceMenuBar.swift:30,43,52,63,95,128`). FlashSpace has
  no "?" overlay; the "?" cheatsheet is a gap this project fills (plan 310's
  `KeyboardShortcuts` display).

### 1.3 OTA — Sparkle

- **Sparkle 2.7.0** via SPM (`project.yml:24-26`). The whole integration is
  `SPUStandardUpdaterController` + a 30-minute auto-check
  (`Utils/UpdatesManager.swift:19-31`) and a menu-bar "Check for Updates"
  (`FlashSpaceMenuBar.swift:120-122`).
- **Signing — EdDSA.** The Ed25519 public key is baked into `Info.plist` as
  `SUPublicEDKey` (`project.yml:42`); `sign_update` computes the per-release
  `sparkle:edSignature` (`sparkle/generate_appcast.sh:6`).
- **Appcast format.** RSS 2.0 with the `sparkle:` namespace (`appcast.xml`,
  `appcast-template.xml`). The `<enclosure>` carries `url` (GitHub Releases
  `FlashSpace.app.zip`), `sparkle:edSignature`, `length`, and `type`; the item
  carries `title`, `pubDate`, `link` (GitHub release), `sparkle:version` (build),
  `sparkle:shortVersionString`, `sparkle:minimumSystemVersion`, and a
  `sparkle:releaseNotesLink` (`appcast.xml:5-17`).
- **Hosting.** Appcast XML on the author's own domain
  (`https://wojciechkulik.pl/FlashSpace/appcast.xml`, `project.yml:43`); the
  binary and release notes live on **GitHub Releases** (`appcast.xml:8,15`). The
  split is: R2/self-hosted would work for the appcast too, but the author chose a
  personal domain for the feed and GitHub for the payload.
- **Channels / beta.** None. The dev build is a separate bundle id / display name
  (`FlashSpace-Dev`, `project.yml:62-65`), not a beta channel on the same feed.
- **Delta updates.** None — a single full `enclosure`, no `sparkle:deltas` /
  `sparkle:deltaFrom` in `appcast.xml`. Full-download only.
- **Rollback / failure.** No explicit rollback. Sparkle installs atomically
  (replaces the app bundle); a failed install leaves the old bundle intact and
  Sparkle reports the error — there is no custom failure path in
  `UpdatesManager.swift`.
- **Signing & notarization pipeline** (the part the plan must reproduce for our
  own signed builds): hardened runtime on (`project.yml:52`), Developer ID
  `codesign --options runtime`, Apple notarization, then `spctl` + `codesign`
  validation (`fastlane/Fastfile:20-39`).

### 1.4 Other transferable patterns

- **Menu-bar app + in-menu accelerators** (`FlashSpaceMenuBar.swift:23-146`) — a
  transferable pattern for a tray/menu-bar surface, which GPUix does not have
  (see §3.2).
- **Lazy, per-feature permission onboarding** — permission is requested on first
  use of the feature that needs it, with a live in-settings status read
  (`GeneralSettingsView.swift:75-85`, `WorkspaceSwitcherSettingsView.swift:106-109`).
- **What's-New by version** (`App/WhatsNewManager.swift:10-26`) — a
  `lastShownVersion` in defaults, shown once per version after launch
  (`AppDelegate.swift:38-43`).

---

## 2. GPUix capability findings

The pinned runtime is now `@gpuix/native@0.11.0` / `@gpuix/react@0.11.0`
(plan 539 landed the bump; npm `registry.npmjs.org`, repository
`github.com/remorses/gpuix`). Types cited from the installed `.d.ts`; Rust source
cited from `remorses/gpuix@515df19` (`packages/native/src/`). Items closed by
0.11.0 are marked **closed**; the confirmed-absent list below is what the
library's `@gpuixui/runtime` capability matrix encodes as `supported: false`.

Closed by 0.11.0 (re-verified against the installed `.d.ts`):

- **Terminal rendering** — `render(<App />, { terminal: true })` (or
  `GPUIX_TERMINAL=1`) paints into kitty/Ghostty with the kitty graphics
  protocol, and `isTerminal()` reports it (plan 539).
- **Headless `Dialog`** — `@gpuix/react/dialog` ships the Base UI-shaped parts
  (`Dialog`, `DialogTrigger`, `DialogPopup`, …) over a full-window layer, with a
  one-per-window Escape dismissal stack (`pushDismissLayer` / `DismissableLayer`).
- **Tab / Shift+Tab focus movement** — the default; `event.preventDefault()` in
  an `onKeyDown` keeps one Tab (a modal trap).
- **`preventDefault` / `stopPropagation` on key events** — `EventPayload` carries
  `keystrokeId` (one keystroke's element `keyDown` and trailing `windowKeyDown`
  share it) and `KeyEvent` exposes `preventDefault()`, `stopPropagation()` and
  `defaultPrevented`. Gap 2 below is closed; plan 539 already uses it.

### 2.1 Key events

Present in 0.11.0:

- Per-element `onKeyDown` / `onKeyUp` on any host element. The `EventPayload`
  carries `key` (logical name), `keyChar` (the produced character, e.g. `ß` for
  option-s), `isHeld` (key repeat), and `modifiers` `{shift, ctrl, alt, cmd}`.
- `keystrokeId`, `preventDefault()`, `stopPropagation()` — closed in 0.11.0 (see
  above).
- Elements with keyboard/focus listeners get a GPUI `FocusHandle` (the
  `TestGpuixRenderer.focusElement` doc: "created by `sync_focus_handles` when the
  element has keyDown, keyUp, focus, or blur listeners").
- `autoFocus` and `tabIndex` (native GPUI tab order, `0` = normal) on `HostProps`.
- **Window-level** key handlers: `setWindowKeyEvents(keyDown, keyUp, eventId)`
  plus `WindowKeyEventHandlers.onKeyDown/onKeyUp/onSelectionChange`. The native
  `windowKeyDown`/`windowKeyUp` events are re-tagged to `keyDown`/`keyUp` with
  `elementId: 0` before reaching the handler.

Missing in 0.11.0 (each with evidence):

- **No global/system hotkey API.** No `registerGlobalHotkey` / `onGlobalHotkey`
  / `unregisterHotkey` symbol anywhere in `index.d.ts` or `dist/host.d.ts`, and
  no `hotkey`/`global` registration path in the Rust source (a grep for
  `hotkey|global|register|tray` across `packages/native/src/` returns only
  unrelated matches: syntax-language registration, the internal automation
  canvas). Key events reach the app **only while the window is focused**.
- **No chords / keymap / action binding.** A keystroke handler sees a chord only
  where the pointer of attention already is. The action/keymap layer — "this
  means Save once, and the keymap decides which chord means it, in which context,
  on which platform" — is exactly what `gpui-kit`'s shell crate describes and
  implements natively (`crates/shell/src/action.rs:1-24`), but it is **not**
  exposed to React. There is no `bindAction`, no keymap registry, no context
  predicates in the JS surface.

### 2.2 Focus

Present in 0.11.0:

- **Tab / Shift+Tab** move focus through `tabIndex` elements by default; call
  `event.preventDefault()` in an `onKeyDown` to keep one Tab (closed in 0.11.0).
- **Headless `Dialog`** owns the modal focus contract — `DialogPopup` moves focus
  in on open and back out on close, and the Escape layer stack is one-per-window
  (closed in 0.11.0).
- `focusElement(id)`, `focusNext()`, `focusPrevious()`,
  `focusNextWithin(id)`, `focusPreviousWithin(id)`, `getFocusedElementId()`,
  `blur()`. `focusNext`/`focusPrevious` map to GPUI's own
  `window.focus_next` / `window.focus_prev` tab order; the `…Within` variants
  wrap inside a subtree.
- AccessKit via `role` + `aria-*`, mapped to AccessKit `Role`, and
  `getA11yTree()`.

Missing (library-buildable — the primitive exists, the composite behaviour does
not):

- **Roving focus** (arrow-key movement within a menu/list/tab set), **focus
  restoration** (return to the trigger after a modal closes), and **focus
  scopes** (modal vs. behind). None are runtime APIs; each is composable from
  `focusElement` + `tabIndex` + `focusNextWithin`. **Focus traps are closed by
  0.11.0** — the headless `Dialog` keeps Tab inside the popup, so §4.3 no longer
  hand-rolls a Tab wrap.

### 2.3 Update

Present in 0.11.0:

- `checkUpdate(currentVersion, options)` → `AvailableUpdate | null`
  (`index.d.ts:419-441`). `CheckUpdateOptions` = `{ endpoints, pubkey, headers?,
  timeoutMs?, installerArgs?, installMode? }`. `endpoints` is a list of feed URLs
  with `{{target}}`, `{{arch}}`, `{{current_version}}` slots filled
  (`index.d.ts:429-441`; Rust fill at `updater.rs:514-521`).
- `AvailableUpdate` = `{ currentVersion, version, notes, date, downloadUrl,
  format, downloadAndInstall() }` (`index.d.ts:12-33`).
- **Signature verification** is minisign / EdDSA (`minisign_verify`,
  `updater.rs:37, 1117-1135`); the `pubkey` is "from `cargo packager signer
  generate`" (`index.d.ts:431`).
- **Feed shapes.** Either the cargo-packager-updater JSON (`version` +
  `url`/`signature`/`format`, or a `platforms` map), **or** a GitHub Releases API
  response (`tag_name` + `assets`, with a sibling `<asset>.sig`) — parsed in
  `parse_release_json` / `github_release_to_remote` (`updater.rs:592-673`).
  GitHub.com URLs are transparently rewritten to
  `api.github.com/repos/{owner}/{repo}/releases/latest`
  (`rewrite_github_endpoint`, `updater.rs:215-238`). This means **GitHub Releases
  is a first-class host with zero extra infrastructure**.
- **Formats.** `app` (macOS `.app.tar.gz`), `appimage`, `nsis`, `wix`
  (`updater.rs:309-314, 675-707`).
- **macOS install.** Extract the `.tar.gz`, atomically swap the old bundle to a
  temp backup, move the new one into place, escalating via `osascript … with
  administrator privileges` only when the rename is permission-denied
  (`updater.rs:953-1033`).
- **Relaunch.** `downloadAndInstall()` **does not relaunch** — the contract is
  "Quit after this returns, or the next start uses the new files"
  (`index.d.ts:27-31`, `updater.rs:1280-1289`). Confirmed.

Missing (each with evidence):

- **No relaunch.** Confirmed above. The caller must quit; nothing in the runtime
  restarts the app.
- **No delta updates.** Full download only — `AvailableUpdate` exposes a single
  `downloadUrl`, no delta manifest, no `deltaFrom` field (`index.d.ts:12-33`),
  and `cargo-packager-updater` 0.2.3 (the ported source, `updater.rs:1-12`) has
  no delta concept either.
- **No rollback.** The macOS install moves the old bundle to a temp backup then
  deletes it (`updater.rs:985-1025`); there is no restore path.
- **No channels / beta.** The API takes a flat `endpoints` list, no channel
  concept. Channels are an app-level concern (vary the endpoint / pubkey).
- **No UI, scheduling, or crash reporting.** `checkUpdate` / `downloadAndInstall`
  are raw; auto-check timing, the "restart to update" UI, and crash reporting are
  all app/library responsibilities.

### 2.4 What the GPUI ecosystem has that the runtime does not expose

The wider GPUI component library `longbridge/gpui-kit@1676826` (v0.8.0) shows what
a runtime change *could* surface. The runtime (`@gpuix/native`) currently exposes
none of these:

- **Rich text editor / IME** — `crates/base/src/input/` (undo manager, selection,
  cursor, LSP). The runtime's `input`/`textarea` are GPUI's basic editors plus
  `code`/`diff`/`markdown` render-only custom elements; there is no composition
  event surface (`custom_elements/mod.rs:317-328` registry list).
- **Native webview** — `crates/webview/` wraps `wry` (WKWebView on macOS,
  `webview/src/lib.rs:55`, `webview/src/macos.rs:1-18`). Not in the runtime (see
  plan `437` §1).
- **Canvas / plots** — `crates/base/src/plot/` (line, bar, pie, sankey, area).
  The runtime's `canvas` `ElementType` (`dist/host.d.ts:137`) is **internal
  automation only** (zero-size bounds canvas, `automation.rs:45-52`); there is no
  `CanvasProps`, no draw API (plan `437` §1, `020` §1.1).
- **Shell / action / keymap runtime** — `crates/shell/` (action model, keymap,
  a11y, storage, plugins). The action-vs-keystroke rationale in
  `shell/src/action.rs:1-24` is the exact model §4.1 builds at library level.

---

## 3. The missing list and the extensibility verdict

Each row classifies the gap as **library-only** (buildable against 0.11.0 today),
**runtime change** (a small surface addition in `@gpuix/native`/`@gpuix/react`),
or **runtime + native helper** (a new OS-level integration behind the runtime).

| # | Capability | Class | Evidence (absence) |
| - | ---------- | ----- | ------------------ |
| 1 | System/global hotkey register + callback | **runtime + native helper** | no symbol in `index.d.ts`; no `hotkey`/`global` path in `packages/native/src/` |
| 2 | Key-event `preventDefault`/`stopPropagation` (`keystrokeId`) | ~~runtime change~~ **closed in 0.11.0** | `EventPayload` carries `keystrokeId`; `KeyEvent` has `preventDefault()`/`stopPropagation()` |
| 3 | Keymap / chords / action binding | **library-only** | buildable on `onWindowKeyDown` + plan 310 accelerator model |
| 4 | Roving focus / focus restoration / focus scopes | **library-only** | buildable on `focusElement` + `tabIndex` + `focusNextWithin`; the focus *trap* is closed by the headless `Dialog` |
| 5 | Relaunch after update | **runtime change** (small) | `downloadAndInstall()` documented as not relaunching |
| 6 | Delta updates | **runtime change** | single `downloadUrl`, no delta manifest |
| 7 | Rollback | **runtime change** | old bundle discarded (`updater.rs:985-1025`) |
| 8 | Update channels (beta) | **library-only** | vary `endpoints`/`pubkey` |
| 9 | Update UI / scheduling / crash report | **library-only** | raw `checkUpdate`/`downloadAndInstall` |
| 10 | Native-view host (webview/iframe) | **runtime + native helper** | plan `437` §1 |
| 11 | Canvas draw API | **runtime + native helper** | `canvas` is internal automation only |
| 12 | Tray / menu-bar item | **runtime + native helper** | no tray symbol; `WindowOptions` has no menu-bar mode |
| 13 | IME composition events | **runtime + native helper** | no composition surface; only gpui basic editors |
| 14 | CSS transform (`rotate`/`scale`/`translate`/`skew`) | **runtime change** | `StyleDesc` has no `transform` key |
| 15 | Grid span (`gridColumn`/`gridRow`) | **runtime change** | only `gridColumnMin`/`gridRowMin` + integer track counts |

The owner's assumption, answered directly: **a library can own everything that is
pure logic over the existing event/focus surface** — the command registry, the
keymap, conflict detection, roving focus, restoration, the cheatsheet, update
scheduling/UI, and channels. **It cannot fake anything that needs a
different OS object or a missing event or style key**: a system-wide hotkey (1),
relaunch (5), delta (6), rollback (7), a child native view (10), a real canvas
(11), a tray (12), IME composition (13), a CSS transform (14), and grid spans
(15). Those need a runtime change, and 1/10/11/12/13 additionally
need a native helper (Carbon `RegisterEventHotKey`, `wry`, a real GPUI canvas, a
status-item/tray API, and a composition surface respectively). No amount of
library cleverness makes a GPUI-painted `<div>` become a system hotkey or a
`WKWebView`. The library ships the honest half meanwhile — `@gpuixui/runtime`
records each gap as `supported: false` with a reason and workaround, and
`@gpuixui/tw` refuses the unrepresentable classes by name.

---

## 4. The keyboard architecture (library)

Builds on plan `310` (accelerator model: `parseAccelerator`, `formatAccelerator`)
and `316` (`HotkeyRecorder`, `hotkey/logic.ts`). **Landed** as `packages/keyboard`
(`@gpuixui/keyboard`) — the accelerator grammar, keymaps with scopes, exact event
matching and the command registry (§4.1, §4.2, §4.6). The `focus/` traversal
half (§4.3) is **not** needed: 0.11.0 owns Tab/Shift+Tab and the headless
`Dialog` owns the Escape layer stack, so the library supplies accelerators,
scopes and commands, not focus traversal. Nothing here needs a runtime change,
and gaps 3 and 4 from §3 are the only ones it consumes.

### 4.1 Typed command / action registry

A `CommandRegistry` service (Effect `Context.Service` + `Layer`, per the house
style) mapping a command id to its metadata:

```ts
interface Command {
  readonly id: string;            // "editor.save", "workspace.toggle-panel"
  readonly title: string;         // announced in the cheatsheet and menu
  readonly scope: CommandScope;   // "global" | "window" | "focus" | component
  readonly accelerator: string;   // plan-310 grammar, "mod+s"
  readonly handler: () => Effect.Effect<void>;
  readonly when?: (ctx: CommandContext) => boolean; // context predicate
}
```

- One registration per command; the registry is **read-only after construction**,
  binding resolution reads from it. A command can be dispatched by a key, a menu
  row, or a button — the same indirection gpui-kit describes
  (`shell/src/action.rs:17-24`).
- **Scopes** stack: `global` ⊃ `window` ⊃ `focus`. Resolution picks the narrowest
  matching scope; a `focus`-scoped command wins over a `global` one with the same
  chord (the FlashSpace conflict model, inverted: conflicts are resolved by
  specificity, not rejected — see §4.2 for the explicit-conflict check).

### 4.2 Keybinding resolution

Pure module `shortcut/resolution.ts`, unit-tested:

- `resolve(chord, scopes, bindings)` → `Option<Command>`.
- **Chords** (multi-key sequences, e.g. `ctrl+k ctrl+b`): a pending-key buffer
  per scope, cleared on timeout (`Duration`) or a non-prefix key.
- **Platform-aware modifiers**: `mod` resolves via the plan-310 platform;
  `cmd`/`ctrl` stay distinct so a macOS `ctrl+…` binding does not alias a
  `cmd+…` one.
- **Conflict detection** is a build-time/registration-time check (`shortcut/conflict.ts`):
  two commands in the same scope with an identical resolved chord is a hard error
  (surfaced at registration, not silently dropped), mirroring FlashSpace's
  recorder-side alert but moved to the registry.
- **Consumption** rides on `onWindowKeyDown` (`RootEventHandlers.onKeyDown`).
  0.11.0 has `preventDefault`/`keystrokeId`, so a matched command can suppress
  the native default (gap 2 is closed); the "observer, not suppressor" contract
  `316` measured against 0.10.0 no longer applies.

### 4.3 Focus management (`focus/`)

- **Roving focus** — `rovingFocus(items, activeIndex, onIndex)` returns the
  arrow/Home/End/typeahead behaviour for a composite; it calls
  `renderer.focusElement(id)` on the target and updates `activeIndex`. Consumed by
  every composite (menu, list, tabs, toolbar).
- **Focus trap** — closed in 0.11.0: Tab/Shift+Tab move focus by default and the
  headless `Dialog` keeps Tab inside its popup, so a modal no longer hand-rolls a
  `focusNextWithin` wrap. The remaining library piece is an `onFocusOutside`
  guard for the click-outside case.
- **Focus restoration** — a `focusScope` records `getFocusedElementId()` on open
  and restores it on close (`focusElement`), so a modal returns focus to its
  trigger. This is the runtime-primitive answer to plan `155` (modal focus
  semantics); the headless `Dialog`'s `finalFocus` already does this for the
  wrapped case.

### 4.4 Shortcut discovery

- The "?" cheatsheet is plan `310`'s `KeyboardShortcuts` component fed from the
  `CommandRegistry` (not a hand-written list), so the cheat sheet and the live
  bindings cannot drift.
- Per-component shortcut hints reuse `Keycap` + the `accelerator` field.

### 4.5 The global-hotkey adapter (the runtime seam)

A `GlobalHotkeyAdapter` service with `register(accelerator, handler)` /
`unregister(id)` / `onHotkey`. **Today it is a stub whose implementation is gap 1**
— the plan specifies the contract and files the issue (§6, issue 1); the adapter
is a no-op that logs an actionable error until the runtime exposes
`registerGlobalHotkey`. This is the honest seam: the library names it, the
runtime must fill it, and the FlashSpace finding (§1.1) is the reference for the
native shape (Carbon `RegisterEventHotKey`, background firing, no permission).

### 4.6 First slice + tests

**First slice** (the pure, provable core): `shortcut/resolution.ts` +
`shortcut/conflict.ts` + the `CommandRegistry`, unit-tested. No React, no native.

- `resolution.test.ts`: resolve a plain chord, a `mod`-adaptive chord across
  `darwin`/`win32`/`linux`, a `focus` scope shadowing a `global` scope, a
  two-key chord (`ctrl+k ctrl+b`), a pending-buffer timeout, an unmatched chord →
  `None`.
- `conflict.test.ts`: identical chord + scope → error; same chord different
  scopes → ok; `mod+s` and `cmd+s` on darwin collide but `mod+s`/`ctrl+s` do not.
- **Deterministic key-event tests** (the later native slice) drive
  `TestGpuixRenderer.simulateKeyDown`/`simulateKeyUp`
  (`index.d.ts:243-256`) and assert the resolved command runs — the same
  deterministic key pipeline `316` used.
- **Both directions**: drop the scope-shadowing rule → a resolution test fails;
  drop the `mod` platform adaptation → the `darwin`/`win32` test fails. Restore.

**STOP conditions**: stop and report if (a) `onWindowKeyDown` does not fire for a
key that the focused element also handles (measure, don't assume — `316` already
recorded the window/element routing nuance); (b) the composite needs a chord the
runtime's `Keystroke` parser does not name (`316` §8 measured Backspace/Delete
emit nothing) — record it and don't promise that gesture.

---

## 5. The OTA architecture

Reuse `@gpuix/native`'s `checkUpdate` / `AvailableUpdate.downloadAndInstall()`
(`index.d.ts:419-441, 12-33`); specify only the gaps.

### 5.1 Signed builds and hosting

- **Signing** is the runtime's own minisign/EdDSA (`updater.rs:1117-1135`).
  `pubkey` is produced once by `cargo packager signer generate` and shipped as a
  config secret (`Config.Redacted`), never logged (house EF-29).
- **Hosting = GitHub Releases.** The runtime already parses the GitHub Releases
  API and rewrites github.com URLs (`updater.rs:215-238, 592-673`), so a release
  asset + its sibling `.sig` is a complete feed with **zero** extra
  infrastructure. R2 is an optimisation, not a requirement: the appcast-style
  self-hosted feed (FlashSpace §1.3) is only needed for beta gating or
  rate-control, and is deferred until a real reason exists.
- **Channels (stable/beta)** are **library-only** (gap 8): two endpoints, one per
  channel (`…/releases/latest` vs `…/releases` filtered to a pre-release tag), a
  shared `pubkey`, and an app-level channel switch. No runtime change.

### 5.2 The update service (`packages/updater`)

An Effect service wrapping the runtime:

- `check(currentVersion, config)` → `Effect<Option<AvailableUpdate>>` — lift the
  `checkUpdate` promise with `Effect.tryPromise`, decode the returned fields with
  `Schema` (EF-3), fail with a typed `UpdateCheckError` on network/feed errors
  (EF-1). Retry only the idempotent `check` (EF-24); never retry `downloadAndInstall`.
- `install(update)` → `Effect<void>` — call `downloadAndInstall()`, then the
  **relaunch seam** (§5.4).
- `schedule(interval)` — an auto-check `Schedule` (EF-24) gated on a
  `checkForUpdatesAutomatically` setting, mirroring FlashSpace's 30-minute check
  (`UpdatesManager.swift:26`).

### 5.3 The update UI

- `UpdateBanner` / `UpdateDialog` component (in `packages/components`): shows
  `update.version` + `update.notes` (markdown), with "Restart to update" calling
  `install` then quitting. Reuses the plan-207 chat/message markdown renderer for
  notes.
- "Check for updates" lives in the app menu/settings; the menu-bar/tray surface
  is gap 12 (runtime), so the in-app surface is the v1.

### 5.4 Relaunch semantics (confirmed gap 5)

`downloadAndInstall()` "Does not relaunch. Quit after this returns, or the next
start uses the new files" (`index.d.ts:27-31`). The architecture therefore needs
a **relaunch seam**, and the honest verdict is: a JS-only relaunch is fragile
(spawn a detached process, then `exit(0)`; platform-specific). The plan files
**issue 5** for a runtime `relaunch()` helper, and until then the updater quits
and relies on the app's own launcher (auto-start / dock) to relaunch — exactly
what the runtime documents. No delta (6) and no rollback (7) are runtime asks;
the library can only **pin a known-good version** (a `lastGoodVersion` persisted
on successful install) and offer a "reinstall last good" affordance, not an
automatic rollback.

### 5.5 First slice + tests

**First slice**: `packages/updater` with the `Schema`-decoded feed shapes and the
version comparison, plus the `check`/`install` service skeleton — unit-tested
against a local HTTP feed (the runtime's own `serve_once` test pattern,
`updater.rs:1355-1371`), no real network.

- `decode.test.ts`: decode a cargo-packager `{version,url,signature,format}`
  body; decode a GitHub Releases `{tag_name, assets}` body; reject a body missing
  `signature`.
- `version.test.ts`: newer → `Some`, equal/older → `None`, `v`-prefix stripping
  (the runtime's `parse_version` strips a leading `v`, `updater.rs:116-122`).
- `service.test.ts`: `check` returns `None` on a 204 (the runtime's no-content
  contract, `index.d.ts:420-423`); `install` is never retried.
- **Both directions**: drop the `v`-prefix strip → the version test fails; remove
  the 204→`None` branch → the service test fails. Restore.

**STOP conditions**: stop and report if (a) `downloadAndInstall()` hangs or the
feed is unreachable in the sandbox — use the local `serve_once` server and record
the exact status; (b) the runtime cannot reach a `platforms`-keyed feed for the
target triple (the `TargetNotFound` error, `updater.rs:361-363`) — record the
triple; (c) relaunch is required for a complete user story — that is gap 5, not a
library task; ship the quit-and-relaunch-externally contract and pin issue 5.

---

## 6. Upstream issue drafts (deferred)

Drafts against `remorses/gpuix` (the runtime), written general — no product
names, no private details. **Deferred by the owner's call: not filing for now.**
The library ships the honest half meanwhile — `@gpuixui/runtime` records each
gap as `supported: false` with a reason and workaround, and `@gpuixui/tw` refuses
the unrepresentable classes by name. Issue 2 is already closed by 0.11.0 and is
kept only as a record of what changed.

1. **"Add a global/system hotkey registration API"** — The renderer exposes only
   focused-window key events; there is no way to register a system hotkey that
   fires while the app is in the background. Evidence: `GpuixRenderer` (NAPI)
   has `setWindowKeyEvents` / `focusElement` / … but no
   `registerGlobalHotkey`/`unregisterHotkey`; a grep for `hotkey|global` in the
   native source finds no registration path. Expected: an FFI surface like
   `registerGlobalHotkey(id, accelerator) -> ()`, `unregisterGlobalHotkey(id)`,
   and an `onGlobalHotkey` callback carrying the id, backed by the platform
   mechanism (Carbon `RegisterEventHotKey` on macOS, `RegisterHotKey` on
   Windows, a global shortcut on X11/Wayland), firing regardless of focus.
   Minimal shape: a program that registers `cmd+shift+x`, minimizes the window,
   presses the chord, and observes the callback.

2. ~~**"Expose `preventDefault` / `stopPropagation` on key events (keystroke_id)"**~~ — **closed in 0.11.0.** `EventPayload` carries `keystrokeId` and `KeyEvent`
   exposes `preventDefault()`/`stopPropagation()`/`defaultPrevented`, so a
   library keymap can consume a chord and suppress the native default today.
   Kept as a record; not filed.

3. **"Add a `relaunch()` helper to the updater surface"** — `downloadAndInstall()`
   replaces the bundle but cannot restart the process, forcing every consumer to
   hand-roll a detached-respawn-and-exit. Evidence: the method is documented
   "Does not relaunch. Quit after this returns…". Expected: a
   `relaunch()`/`restartApp()` FFI method that respawns the current executable
   with the same arguments and exits cleanly. Minimal shape: call
   `downloadAndInstall()` then `relaunch()` and observe the new version running
   with no manual relaunch.

4. **"Delta updates in the updater"** — The updater always downloads the full
   bundle; there is no delta manifest. Evidence: `AvailableUpdate` exposes a
   single `downloadUrl` and no delta field; the ported `cargo-packager-updater`
   0.2.3 has no delta concept. Expected: an optional delta manifest (base-version
   → patch) with signature verification, falling back to full when no delta
   matches. Minimal shape: a feed with a delta from `0.9.0` to `0.10.0`; a `0.9.0`
   client downloads the delta, a `0.8.0` client downloads the full bundle.

5. **"Update rollback on install failure"** — A failed or broken install cannot
   be reverted. Evidence: the macOS install moves the old bundle to a temp backup
   and deletes it (`updater.rs` `install_inner`), no restore path. Expected:
   keep the previous bundle until the new one is verified to launch, and expose a
   `rollback()` that restores it. Minimal shape: install a bad update, then call
   `rollback()` and observe the previous version restored.

6. **"A real `<canvas>` / draw surface"** — The `canvas` element type is
   internal automation only; there is no draw API. Evidence: `canvas` appears in
   `ElementType` and the React component map but has no `CanvasProps`, no draw
   command, and the native `canvas` is a zero-size bounds tracker
   (`automation.rs`). Expected: a `CanvasProps` with a retained 2D draw command
   list (paths, rects, text) painted by GPUI. Minimal shape: a `<canvas>` that
   draws a rectangle and a line, asserted via `getPaintedText`/screenshot.

7. **"A tray / menu-bar item surface"** — There is no way to put the app in the
   macOS menu bar or the Windows tray. Evidence: `WindowOptions` offers no
   menu-bar/status-item mode; no tray symbol exists. Expected: a window mode (or
   a separate `createTray` surface) that hosts a GPUI-painted menu-bar/status
   item with a menu. Minimal shape: a window opened with a `menuBar`/`tray` mode
   and a click handler.

> Issues 10–13 of §3 (native-view host, IME composition) are already tracked by
> plan `437` (§1–2) and are deliberately **not** re-filed here to avoid
> duplication; this plan's set is the keyboard/OTA-focussed delta.

---

## 7. Result

The keyboard half of the architecture **landed** as `packages/keyboard`
(`@gpuixui/keyboard`): the strict `Accelerator` grammar (parse/format/serialize,
canonical order, typed `AcceleratorParseError`), the `Keymap` with scope-stack
precedence, exact `match`, the `CommandRegistry` `Context.Service` and the
React provider, plus the `formatSymbols`/`formatText` display surface. The two
consumers (`HotkeyRecorder`, `KeyboardShortcuts`) now reuse it; the
`shortcut/accelerator.ts` and `hotkey/logic.ts` modules were lifted into the
package and removed. Focus traversal is **not** in the package — 0.11.0 owns
Tab/Shift+Tab and the headless `Dialog` owns the Escape layer stack (§4.3).

Still open:

- **OTA/updater** (§5) — `packages/updater` with the `Schema`-decoded feed
  shapes, version comparison and the `check`/`install` service, first slice
  §5.5. Needs no runtime change to start.
- the **runtime workstream — done**: `@gpuixui/runtime` ships the capability
  matrix with typed refusals, and `@gpuixui/tw` refuses the unrepresentable
  classes by name. The deferred issues (1, 3–7 in §6) gate only the native
  behaviour.

Gaps 1, 5–7 (and 10–15 via `437`/`020`) gate only the final, fully-native
behaviour.
