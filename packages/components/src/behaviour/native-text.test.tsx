import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { afterEach, describe, expect, it } from "vitest";
import { nativeTextTheme as tokenHostTheme } from "@gpuixui/tokens";
import { ChatComposer, ChatRoot } from "../chat.js";
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

const HOSTS = [
  ["field.tsx", "input"],
  ["search-input.tsx", "background"],
  ["tag-input.tsx", "background"],
  ["mention-input.tsx", "background"],
  ["inline-edit.tsx", "background"],
  ["chat.tsx", "background"],
  ["time-picker.tsx", "input"],
  ["command-menu.tsx", "input"],
  ["combobox.tsx", "input"],
] as const;

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar" },
];

let mounted: ComponentTestRoot | undefined;

const mount = (node: ReactNode, theme: TestTheme): ComponentTestRoot => {
  mounted = renderComponent(node, theme);
  return mounted;
};

const cleanup = (): void => {
  mounted?.unmount();
  mounted = undefined;
};

afterEach(cleanup);

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

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      return root;
    },
  ],
];

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

    expect(nativeTextTheme(lightTheme).bg).toBe(lightTheme.colors.input);
    expect(nativeTextTheme(lightTheme, "background").bg).toBe(
      lightTheme.colors.background,
    );
  });

  it("is passed by every host with the fill its field paints", () => {
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
