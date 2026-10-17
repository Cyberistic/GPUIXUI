# 316 — Hotkey recorder

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §2 (A14), `310` (accelerator model) |
| Status | planned |
| Source | `docs/component-api.md` §8 (planned part: `HotkeyRecorder`); `COMPONENTS.md` → Tier 2 → Hotkey-recorder input; plan `205` A14 |

This plan is self-contained. It adds `HotkeyRecorder` at the Tier 2 bar.

---

## 1. Why

Settings pages let a user bind a shortcut. The accelerator model (parse/format)
already exists in plan `310`; what remains is capturing a real key chord from the
runtime's `EventPayload` and displaying it. 0.10.0 has no `KeyEvent` and no
`preventDefault`; a recorder therefore observes keys on a focused `div` and
`Tab`/`Escape` must be handled by the component's own state, not suppressed.

## 2. The target API

```tsx
<HotkeyRecorder
  label="Toggle command palette"
  value={hotkey}
  onChange={setHotkey}
/>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `HotkeyRecorder` | idle/recording state, capture, clear, display | `label` (required), `value?` (accelerator or `null`), `onChange?`, `placeholder?` (default `"Click to record"`), `disabled?`, `style?: StateStyle<HotkeyRecorderState>` |

`HotkeyRecorderState` is `{ readonly recording: boolean; readonly disabled: boolean }`.

### Behaviour contract

- **Idle display:** the formatted accelerator through `Keycap`s (plan `310`), or
  the placeholder in `mutedForeground` when there is no value.
- **Start recording:** click, `Enter` or `Space` on the control. Recording shows
  `"Press keys…"` and the control stays focused.
- **Capture:** the next `keyDown` with a non-modifier key becomes
  `<modifiers>+<key>`, in this order: `mod`, `shift`, `alt`, then the key.
  `cmd`/`ctrl` both become `mod` (the platform-adaptive token); other modifiers
  are ignored. Escape cancels recording and keeps the previous value; Backspace
  or Delete clears the value (`null`) and ends recording. A modifier-only press
  is ignored and recording continues. `Space` while recording is captured as
  `space`, not treated as activation.
- **Blur** cancels recording without changing the value — a half-finished chord
  is never committed.
- **Value is controlled** (`value`/`onChange`); the component stores only the
  recording flag.

### Logic (`src/hotkey/logic.ts`)

- `acceleratorOf(event, platform)`: `Option<string>` — `None` for a modifier-only
  key (`shift`, `ctrl`, `alt`, `meta`/`cmd`) or a non-key event; normalises
  named keys (`escape`→`escape`, `return`→`enter`, ` `→`space`) and single
  characters to lower case.
- Pure and unit-tested with hand-built `EventPayload` values.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/hotkey/logic.ts` | **create** |
| `packages/components/src/hotkey/logic.test.ts` | **create** — 8 unit tests |
| `packages/components/src/hotkey-recorder.tsx` | **create** — one part, `hotkeyRecorderMeta` |
| `packages/components/src/index.ts` | add `export * from "./hotkey-recorder.js";` |
| `packages/components/src/inventory.ts` | import and list `hotkeyRecorderMeta` |
| `packages/components/src/behaviour/hotkey-recorder.test.tsx` | **create** — 8 native tests |
| `packages/components/examples/hotkey-recorder.example.tsx` | **create** — bind and clear a shortcut, showing the result |
| `packages/components/docs/hotkey-recorder.mdx` | **create** |
| `docs/component-api.md` | move Hotkey recorder into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 8 native + 8 unit tests, limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test             # expected: hotkey logic 8
nub run --filter @gpuixui/components test:behaviour   # expected: HotkeyRecorder 8
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `modifiers.cmd` is not delivered on this host for a `cmd-` keystroke — measure
  with the real renderer and record which modifier bits arrive; adapt
  `acceleratorOf` to the measured payload, do not guess;
- `Escape` cannot be observed because the focused `div` receives no key events
  (the Dialog measured that it does) — record and make click-to-cancel the
  fallback;
- capturing a chord conflicts with the runtime's own window shortcuts — the
  component cannot suppress them (no `preventDefault`); document that the
  recorder observes, and the consumer must choose non-system chords.

## 6. Test plan

`src/hotkey/logic.test.ts`:

1. `cmd+shift+k` on darwin → `mod+shift+k`;
2. `ctrl+alt+p` on win32 → `mod+alt+p`;
3. `shift` alone → `None`;
4. `meta` alone → `None`;
5. a space key becomes `space`;
6. `return` normalises to `enter`;
7. a single character is lower-cased;
8. modifiers are ordered `mod`, `shift`, `alt`.

`src/behaviour/hotkey-recorder.test.tsx` (real renderer):

1. shows the formatted existing value, or the placeholder when `null`;
2. a click starts recording and shows "Press keys…";
3. `cmd-shift-k` captures `mod+shift+k` and calls `onChange`;
4. Escape cancels recording and keeps the old value;
5. Backspace clears to `null` and ends recording;
6. a modifier-only press is ignored (still recording);
7. blur cancels recording;
8. a disabled recorder is out of the tab order and cannot start recording.

**Both directions.** Commit on blur instead of cancelling: test 7 fails. Treat a
modifier-only press as a chord: unit test 3 and native test 6 fail. Restore.

## 7. Acceptance criteria

- One part with JSDoc and `HotkeyRecorderState`, plus the pure capture module.
- Eight native + eight unit tests, both themes, no literal colours.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.
