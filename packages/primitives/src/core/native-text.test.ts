import type { ReactElement } from "react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  lightTheme,
  nativeTextFills as tokenFills,
  nativeTextTheme as tokenHostTheme,
} from "@gpuixui/tokens";
import { renderInput } from "../components/Input.js";
import type { FocusState } from "../components/internal.js";
import { expectSome, hostProp } from "../components/testing/element.js";
import { initValueState } from "./state.js";
import { nativeTextFills, nativeTextTheme } from "./style.js";
import { testTheme } from "./testing/theme.fixture.js";
import type { PrimitiveTheme } from "./theme.js";

const packageDir = fileURLToPath(new URL("../../", import.meta.url));
const sourceDir = fileURLToPath(new URL("../", import.meta.url));

const isSource = (name: string): boolean =>
  name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts");

const walk = (dir: string): ReadonlyArray<string> =>
  Arr.flatMap(readdirSync(dir, { withFileTypes: true }), (entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : isSource(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

const HOST_MAPPING = /textFaint\s*:|caret\s*:/;

const FIELD_HOSTS = [
  "src/components/Input.tsx",
  "src/components/NumberField.tsx",
  "src/components/OTPField.tsx",
];

const themed: PrimitiveTheme = {
  ...testTheme,
  colors: {
    ...testTheme.colors,
    placeholder: "#123457",
    primary: "#654321",
  },
};

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

const hostThemeOf = (element: ReactElement) =>
  expectSome(
    Schema.decodeUnknownOption(
      Schema.Struct({
        bg: Schema.String,
        textFaint: Schema.String,
        caret: Schema.String,
      }),
    )(expectSome(hostProp(element, "theme"))),
  );

describe("the native host theme", () => {
  it("is the token package's own mapping, not a second copy", () => {
    expect(nativeTextTheme).toBe(tokenHostTheme);
    expect(nativeTextFills).toBe(tokenFills);
  });

  it("keeps the fill argument a composite field needs", () => {
    expect(nativeTextTheme(lightTheme).bg).toBe(lightTheme.colors.input);
    expect(nativeTextTheme(lightTheme, "background").bg).toBe(
      lightTheme.colors.background,
    );
  });

  it("writes the mapping down once in the package", () => {
    const scanned = walk(sourceDir);

    expect(scanned.length).toBeGreaterThan(4);
    const offenders = Arr.flatMap(scanned, (path) =>
      HOST_MAPPING.test(readFileSync(path, "utf8"))
        ? [path.slice(sourceDir.length)]
        : [],
    );
    expect(offenders).toEqual([]);
  });

  it("hands a field the theme's own hint and caret roles", () => {
    const element = renderInput(
      {},
      themed,
      initValueState(Option.none(), ""),
      idle,
      vi.fn(),
    );
    expect(hostThemeOf(element)).toEqual({
      bg: themed.colors.input,
      textFaint: "#123457",
      caret: "#654321",
    });
  });

  it("is passed on every native text host the package renders", () => {
    const missing = Arr.filter(
      FIELD_HOSTS,
      (file) =>
        !/nativeTextTheme\(/.test(readFileSync(join(packageDir, file), "utf8")),
    );
    expect(missing).toEqual([]);
  });
});
