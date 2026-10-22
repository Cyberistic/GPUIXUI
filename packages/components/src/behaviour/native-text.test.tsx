/**
 * The native host theme, in the real GPUix renderer.
 *
 * The bug this guards: a GPUix `<input>`/`<textarea>` given no `theme` prop
 * layers its own text on the runtime's **built-in dark palette** (pinned
 * `@gpuix/native@0.11.0` typings), so a field in a light theme painted a hint
 * and a caret chosen for a dark surface while its fill, value colour and
 * selection wash came from `@gpuixui/tokens`. `nativeTextTheme(theme, fill)`
 * is the one mapping; this suite holds every host in the package to it and
 * holds the fill it names to the fill the field actually paints — a plain field
 * sits on `input`, a composite field paints the page role.
 *
 * The runtime exposes no way to read a host's theme prop back off the tree, so
 * the wiring half is a source scan (the primitives package's own guard does the
 * same) and the paint half is the renderer.
 *
 * Node's `fs` is used directly on purpose, as in the primitives' guard: this is
 * a test boundary making a one-shot read of the package's own source, not
 * runtime domain code, and the package does not resolve `vite/client` types.
 */

import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { afterEach, describe, expect, it } from "vitest";
import { nativeTextTheme as tokenHostTheme } from "@gpuixui/tokens";
import { ChatComposer, ChatRoot } from "../chat.js";
import { ColorPicker } from "../color-picker.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxOption,
} from "../combobox.js";
import { CommandMenu, CommandMenuInput } from "../command-menu.js";
import { Field, FieldInput } from "../field.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme, lightTheme, nativeTextTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { InlineEdit } from "../inline-edit.js";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../mention-input.js";
import { SearchInput } from "../search-input.js";
import { TagInput, TagInputField } from "../tag-input.js";
import { TimePicker, TimePickerSegment } from "../time-picker.js";

const sourceDir = fileURLToPath(new URL("../", import.meta.url));

const modes = [
  ["light", lightTheme],
  ["dark", darkTheme],
] as const satisfies ReadonlyArray<readonly [TestTheme, typeof lightTheme]>;

/** Every file that renders a native text host, and the fill it sits on. */
const HOSTS = [
  ["field.tsx", "input"],
  ["search-input.tsx", "background"],
  ["tag-input.tsx", "background"],
  ["mention-input.tsx", "background"],
  ["inline-edit.tsx", "background"],
  ["color-picker.tsx", "background"],
  ["chat.tsx", "background"],
  ["time-picker.tsx", "input"],
  ["command-menu.tsx", "input"],
  ["combobox.tsx", "input"],
] as const;

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar" },
];

let mounted: ComponentTestRoot | undefined;

/** Render one case; the cleanup below keeps a failed case from leaking its root. */
const mount = (node: ReactNode, theme: TestTheme): ComponentTestRoot => {
  mounted = renderComponent(node, theme);
  return mounted;
};

const cleanup = (): void => {
  mounted?.unmount();
  mounted = undefined;
};

afterEach(cleanup);

/** One minimal composition per component that paints a native text host. */
const cases: ReadonlyArray<
  readonly [
    string,
    "input" | "background",
    (theme: TestTheme) => ComponentTestRoot | Promise<ComponentTestRoot>,
  ]
> = [
  [
    "SearchInput",
    "background",
    (theme) => mount(<SearchInput testId="search" />, theme),
  ],
  [
    "Field",
    "input",
    (theme) =>
      mount(
        <Field label="Email">
          <FieldInput />
        </Field>,
        theme,
      ),
  ],
  [
    "TimePicker",
    "input",
    (theme) =>
      mount(
        <TimePicker>
          <TimePickerSegment segment="hours" />
          <TimePickerSegment segment="minutes" />
        </TimePicker>,
        theme,
      ),
  ],
  [
    "TagInput",
    "background",
    (theme) =>
      mount(
        <TagInput label="Tags" value={[]} onValueChange={() => undefined}>
          <TagInputField />
        </TagInput>,
        theme,
      ),
  ],
  [
    "MentionInput",
    "background",
    (theme) =>
      mount(
        <MentionInput label="Comment">
          <MentionInputList>
            <MentionInputItem value="ada" />
          </MentionInputList>
        </MentionInput>,
        theme,
      ),
  ],
  [
    "ColorPicker",
    "background",
    (theme) => mount(<ColorPicker label="Accent" />, theme),
  ],
  [
    "CommandMenu",
    "input",
    (theme) =>
      mount(
        <CommandMenu open onOpenChange={() => undefined} actions={[]}>
          <CommandMenuInput />
        </CommandMenu>,
        theme,
      ),
  ],
  [
    "Chat",
    "background",
    (theme) =>
      mount(
        <ChatRoot onSubmit={() => undefined}>
          <ChatComposer />
        </ChatRoot>,
        theme,
      ),
  ],
  [
    "InlineEdit",
    "background",
    (theme) => {
      const root = mount(
        <InlineEdit
          testId="name"
          label="Workspace name"
          value="Alpha"
          onCommit={() => undefined}
        />,
        theme,
      );
      clickCentreOf(root, "name");
      return root;
    },
  ],
  [
    "Combobox",
    "input",
    async (theme) => {
      const root = mount(
        <Combobox options={options}>
          <ComboboxTrigger label="Assign reviewer" />
          <ComboboxContent>
            <ComboboxInput />
            <ComboboxList />
          </ComboboxContent>
        </Combobox>,
        theme,
      );
      clickCentreOf(root, "combobox-trigger");
      // The popup mounts and focuses its field in a microtask.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      return root;
    },
  ],
];

/** The host's own fill, or the first one it sits on (`bg-transparent` is none). */
const paintedFill = (
  root: ComponentTestRoot,
  elementId: number,
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(root.renderer.getElement(elementId)),
    Option.flatMap((element) => {
      const fill = element.style.backgroundColor;
      return typeof fill === "string" && fill !== "transparent"
        ? Option.some(fill)
        : Option.fromNullishOr(element.parentId).pipe(
            Option.flatMap((parentId) => paintedFill(root, parentId)),
          );
    }),
  );

describe("the native host theme", () => {
  it("is the token package's own mapping, not a second copy", () => {
    expect(nativeTextTheme).toBe(tokenHostTheme);
    // The fill argument is what a composite field needs: one mapping, two
    // surfaces.
    expect(nativeTextTheme(lightTheme).bg).toBe(lightTheme.colors.input);
    expect(nativeTextTheme(lightTheme, "background").bg).toBe(
      lightTheme.colors.background,
    );
  });

  it("is passed by every host with the fill its field paints", () => {
    // The runtime keeps a host's `theme` prop out of the tree, so the wiring is
    // read at the source. A host that drops it falls back to the dark palette.
    const missing = Arr.flatMap(HOSTS, ([file, fill]) =>
      readFileSync(sourceDir + file, "utf8").includes(
        `nativeTextTheme(theme, "${fill}")`,
      )
        ? []
        : [`${file}: no nativeTextTheme(theme, "${fill}")`],
    );

    expect(missing).toEqual([]);
  });

  Arr.forEach(modes, ([mode, theme]) => {
    it(`lays every host's text on the fill its theme names (${mode})`, async () => {
      await Arr.reduce(
        cases,
        Promise.resolve(),
        async (previous, [name, fill, render]) => {
          await previous;
          const root = await render(mode);
          const hosts = Arr.appendAll(
            root.renderer.findByType("input"),
            root.renderer.findByType("textarea"),
          );

          expect(Arr.length(hosts), name).toBeGreaterThan(0);

          // The theme the host is handed says its text sits on this fill, and
          // every rendered host paints that same role — a fill chosen from the
          // recipe and a mapping chosen from memory cannot drift apart unseen.
          expect(nativeTextTheme(theme, fill).bg, name).toBe(
            theme.colors[fill],
          );
          expect(
            Arr.map(hosts, (host) =>
              Option.getOrUndefined(paintedFill(root, host.id)),
            ),
            name,
          ).toEqual(Arr.map(hosts, () => theme.colors[fill]));

          cleanup();
          return Promise.resolve();
        },
      );
    });
  });
});
