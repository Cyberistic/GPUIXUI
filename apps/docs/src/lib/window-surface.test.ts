import { describe, expect, it } from "vitest";
import { installedNativeDeclarations } from "./native-declarations.testing";
import {
  interfaceFieldsIn,
  layerShellFields,
  pathPromptFields,
  rendererMethodNames,
  windowAbsences,
  windowFamilies,
  windowInsets,
  windowRendererMethodNames,
  windowRendererMethods,
  windowSurfaceViolations,
} from "./window-surface";

/**
 * Guards the application-window page (plan 625). The bug being prevented is a
 * whole runtime surface with no documentation: measured 2026-10-20, `fullscreen`,
 * `minimize`, `maximize`, `wayland`, `gnome`, `kde` and `devtools` returned
 * nothing, `traffic lights` reached the Values API, `system tray` reached Dark
 * mode and `file dialog` reached Dialogs.
 *
 * The rows are authored; the names are not. These cases feed the pure rule the
 * installed `@gpuix/native` declarations and fixtures, so a runtime field the
 * page forgets fails by name, an invented field fails by name, a renderer
 * method that moves fails by name, and an absence the runtime has since filled
 * fails instead of staying a stale claim. `node:fs` is test-only, as in
 * `accessibility.test.ts`.
 */

const DECLARATIONS = installedNativeDeclarations().join("\n");

const violations = (
  overrides: Partial<Parameters<typeof windowSurfaceViolations>[0]> = {},
): ReadonlyArray<string> =>
  windowSurfaceViolations({
    declarations: DECLARATIONS,
    families: windowFamilies,
    layerShell: layerShellFields,
    insets: windowInsets,
    methods: windowRendererMethods,
    pathPrompt: pathPromptFields,
    absences: windowAbsences,
    ...overrides,
  });

const addField = (
  families: typeof windowFamilies,
  familyId: string,
  name: string,
): typeof windowFamilies =>
  families.map((family) =>
    family.id === familyId
      ? { ...family, fields: [...family.fields, { name, summary: "fixture" }] }
      : family,
  );

const removeField = (
  families: typeof windowFamilies,
  name: string,
): typeof windowFamilies =>
  families.map((family) => ({
    ...family,
    fields: family.fields.filter((field) => field.name !== name),
  }));

describe("window surface", () => {
  it("agrees with the installed declarations", () => {
    expect(violations()).toEqual([]);
  });

  it("parses the interface bodies and their fields", () => {
    expect(interfaceFieldsIn(DECLARATIONS, "WindowOptions")).toContain(
      "titlebarTransparent",
    );
    expect(interfaceFieldsIn(DECLARATIONS, "LayerShellOptions")).toEqual([
      "namespace",
      "layer",
      "anchor",
      "exclusiveZone",
      "exclusiveEdge",
      "margin",
      "keyboardInteractivity",
    ]);
    expect(interfaceFieldsIn(DECLARATIONS, "WindowInsets")).toEqual(
      expect.arrayContaining([
        "safeArea",
        "ime",
        "effective",
        "keyboardTop",
        "keyboardVisible",
        "visibleHeight",
      ]),
    );
    expect(interfaceFieldsIn(DECLARATIONS, "NoSuchOptions")).toEqual([]);
  });

  it("finds the window methods and leaves the keyboard listeners alone", () => {
    const methods = windowRendererMethodNames(DECLARATIONS);
    expect(methods).toContain("toggleFullscreen");
    expect(methods).toContain("promptForPaths");
    expect(methods).toContain("getDebugFrameOverlayStats");
    expect(methods).not.toContain("setWindowKeyEvents");
    expect(methods).not.toContain("setWindowSelectionChange");
    expect(methods).toHaveLength(windowRendererMethods.length);
    expect(rendererMethodNames(DECLARATIONS)).toContain("focusNextWithin");
  });

  it("fails on a declared field the page does not explain", () => {
    expect(
      violations({ families: removeField(windowFamilies, "trafficLightX") }),
    ).toContain("WindowOptions: trafficLightX is declared but undocumented");
  });

  it("fails on a field the page invents", () => {
    expect(
      violations({
        families: addField(windowFamilies, "geometry", "alwaysOnTop"),
      }),
    ).toContain(
      "WindowOptions: alwaysOnTop is documented but the installed declarations do not declare it",
    );
  });

  it("fails on a duplicated row", () => {
    const duplicated = addField(windowFamilies, "geometry", "width");
    expect(violations({ families: duplicated })).toContain(
      "WindowOptions: width is documented twice",
    );
  });

  it("fails when an absence claim is no longer true", () => {
    expect(
      violations({
        declarations: `${DECLARATIONS}\nexport interface TrayOptions {}`,
      }),
    ).toContain(
      "System tray or menu-bar item: the page says it is absent, but the declarations now contain Tray",
    );
  });

  it("fails when a window method the package adds is undocumented", () => {
    const withOpacity = DECLARATIONS.replace(
      "\n  init(",
      "\n  setWindowOpacity(value: number): void\n  init(",
    );
    expect(windowRendererMethodNames(withOpacity)).toContain(
      "setWindowOpacity",
    );
    expect(violations({ declarations: withOpacity })).toContain(
      "GpuixRenderer: setWindowOpacity is a window method but is undocumented",
    );
  });

  it("fails when a documented method leaves the renderer", () => {
    const renamed = DECLARATIONS.replace(
      "  toggleFullscreen(",
      "  toggleFullscreenMode(",
    );
    expect(violations({ declarations: renamed })).toContain(
      "GpuixRenderer: toggleFullscreen is documented but the installed class does not declare it",
    );
  });

  it("fails on an empty interface body instead of passing silently", () => {
    expect(
      violations({ declarations: "interface WindowOptions {}\n" }),
    ).toContain("the installed declarations have no WindowOptions body");
  });
});
