/**
 * Guards the addresses and the premise of the `shell-selection` probe.
 *
 * The probe mounts the real `App`, presses a sidebar row and reads the header,
 * the pressed view's own field and two painted fills. None of that can run on a
 * host with no binding, so the premises are held here:
 *
 *   - the entry it presses exists, and is not the entry the app opens on (a
 *     press that changed nothing would prove nothing);
 *   - the marker it reads is declared by that entry's **own** view, so a view
 *     renamed or stripped of its `testId` fails this file rather than silently
 *     making the probe read an element that no longer exists;
 *   - the shell declares every address the probe presses and reads;
 *   - the palette it presses is one the shell offers, and the two palettes
 *     paint different pages (otherwise the switch's claim is vacuous);
 *   - the README prints the number of checks the probe asserts, counted from
 *     the probe's own source.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this reads the
 * repository's own files, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { paletteIds, palettes } from "../palettes.js";
import { registry } from "./registry.js";
import { SHELL_LIST } from "./shell-nav.js";
import {
  SELECTION_TARGET,
  TARGET_MARKER,
  TARGET_PALETTE,
  TARGET_READOUT,
} from "./shell-selection.js";

const source = (path: string): string =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const probe = readFileSync(
  new URL("./shell-selection.tsx", import.meta.url),
  "utf8",
);
const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const idOf = (found: Option.Option<{ readonly id: string }>): string =>
  Option.match(found, { onNone: () => "", onSome: (scenario) => scenario.id });

/** The entry a press opens, resolved from the registry the app is handed. */
const targetId = idOf(
  Arr.findFirst(registry, (scenario) => scenario.id === SELECTION_TARGET),
);
const firstId = idOf(Arr.head(registry));

/** The view the pressed entry owns — `input-edit` is implemented here. */
const targetView = source("scenarios/input.tsx");

/** Every assertion a probe makes records one check. */
const asserted = (text: string): number =>
  Arr.length(Arr.fromIterable(text.matchAll(/ctx\.expect[A-Za-z]*\(/g)));

describe("the shell-selection probe", () => {
  it("presses a registry entry the app does not open on", () => {
    expect(firstId).not.toBe("");
    expect(targetId).toBe(SELECTION_TARGET);
    expect(targetId).not.toBe(firstId);
  });

  it("reads a marker the pressed entry's own view declares", () => {
    expect(targetView).toContain(`testId="${TARGET_MARKER}"`);
    expect(targetView).toContain(`testId="${TARGET_READOUT}"`);
    expect(probe).toContain("TARGET_MARKER");
    expect(probe).toContain("TARGET_READOUT");
  });

  it("presses and reads the addresses the shell declares", () => {
    const shell = source("app.tsx");
    expect(shell).toContain('testId="app-shell"');
    expect(shell).toContain('testId="app-title"');
    expect(shell).toContain("testId={`nav-${scenario.id}`}");
    expect(shell).toContain("testId={`theme-mode-${palette}`}");
    expect(source("ui.tsx")).toContain("readonly testId?: string");
    expect(shell).toContain(`testId="${SHELL_LIST}"`);
  });

  it("presses a palette the shell offers, and one that repaints", () => {
    expect(Arr.contains(paletteIds, TARGET_PALETTE)).toBe(true);
    expect(palettes[TARGET_PALETTE]).toBeDefined();
    expect(palettes.light.colors.background).not.toBe(
      palettes.dark.colors.background,
    );
    expect(palettes.light.colors.accent).not.toBe(palettes.dark.colors.accent);
  });

  it("gives the sidebar one roving stop and the arrows a route", () => {
    const shell = source("app.tsx");
    expect(shell).toContain("tabIndex={selected === scenario.id ? 0 : -1}");
    expect(shell).toContain("sidebarCursor(event.key, cursor, list.length)");
    expect(shell).toContain("renderer?.focusElement?.(row.id)");
    expect(shell).toContain("row.scrollIntoView?.()");
    expect(source("sidebar.ts")).toContain("export const sidebarCursor");
    const handlers = Arr.length(
      Arr.fromIterable(shell.matchAll(/isActivationKey\(event\.key\)/g)),
    );
    expect(handlers).toBe(2);
    const ui = source("ui.tsx");
    expect(ui).toContain("export const isActivationKey");
    expect(ui).toContain("isActivationKey(event.key)");
  });

  it("names every row and palette button the accessibility tree carries", () => {
    // A node's name comes from `aria-label` alone (`accessibility.rs`), so the
    // probe's subject is a declaration the shell has to make. The runtime check
    // is in the probe; this holds the premise on a host with no binding.
    const shell = source("app.tsx");
    expect(shell).toContain("aria-label={scenario.title}");
    expect(shell).toContain("aria-label={`${palette} palette`}");
    expect(probe).toContain("every sidebar row publishes the title it paints");
    expect(probe).toContain(
      "the palette switch publishes a name for every button",
    );
  });

  it("drives the arrows and states the roving rule", () => {
    expect(
      Arr.every(["down", "up", "home", "end"], (key) =>
        probe.includes(`ctx.host.key("${key}")`),
      ),
    ).toBe(true);
    expect(readme).toContain("one roving stop");
    expect(readme).toContain("End reveals the row it opened");
  });

  it("prints the number of checks the probe asserts", () => {
    const count = asserted(probe);
    expect(count).toBeGreaterThan(20);
    expect(readme).toContain(`**${count} checks**`);
    expect(readme).toContain("--only shell-selection");
  });
});
