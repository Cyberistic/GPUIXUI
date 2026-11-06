import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { declaredTypes, propsOf, type TypeIndex } from "./component-props";

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/introduction.mdx");

const types: TypeIndex = declaredTypes();

const propsTypes: Readonly<Record<string, string>> = {
  Badge: "BadgeProps",
  Dialog: "DialogProps",
  DialogTrigger: "ButtonProps",
  DialogContent: "DialogContentProps",
  DialogHeader: "DialogHeaderProps",
  DialogTitle: "DialogTitleProps",
  DialogDescription: "DialogDescriptionProps",
  DialogFooter: "DialogFooterProps",
  DialogClose: "ButtonProps",

  ThemeProvider: "",
};

interface Element {
  readonly name: string;
  readonly attributes: ReadonlyArray<string>;
}

const elements: ReadonlyArray<Element> = [
  ...page.matchAll(/```tsx\n([\s\S]*?)```/g),
].flatMap((fence) =>
  [...(fence[1] ?? "").matchAll(/<([A-Z]\w*)\b([^>]*)>/g)].flatMap((tag) => [
    {
      name: tag[1] ?? "",
      attributes: [
        ...(tag[2] ?? "").matchAll(/(?:^|\s)([A-Za-z][\w-]*)=/g),
      ].flatMap((attribute) =>
        attribute[1] === undefined ? [] : [attribute[1]],
      ),
    },
  ]),
);

const contractAccepts = (name: string): ReadonlyArray<string> => {
  const source = read("packages/components/src/dialog.tsx");
  const block = source.slice(
    source.indexOf(`const ${name}: PartsContract = {`),
  );
  const accepts = /accepts: \[([^\]]*)\]/.exec(block)?.[1] ?? "";
  return [...accepts.matchAll(/(\w+)/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

describe("the introduction page", () => {
  it("passes only props the components declare", () => {
    expect(elements.length).toBeGreaterThanOrEqual(10);

    const unknown = elements.flatMap(({ name, attributes }) => {
      const type = propsTypes[name];
      if (type === undefined) return [`${name} is not a documented component`];
      if (type === "") return [];

      const declared = propsOf(type, types);
      return attributes.flatMap((attribute) =>
        declared.includes(attribute)
          ? []
          : [`${name}.${attribute} is not a ${type} prop`],
      );
    });

    expect(unknown).toEqual([]);
  });

  it("renders the badge's status through the prop the badge takes", () => {
    expect(page).toContain('<Badge variant="success">');

    const badge = propsOf("BadgeProps", types);
    expect(badge).toContain("variant");
    expect(badge).not.toContain("tone");
  });

  it("teaches the placement rule the dialog enforces", () => {
    expect(contractAccepts("dialogContent")).toContain("DialogTitle");
    const rootAccepts = contractAccepts("dialogRoot");
    expect(rootAccepts).toContain("DialogContent");
    expect(rootAccepts).not.toContain("DialogTitle");

    expect(page).not.toContain("outside a `DialogHeader` fails");
    expect(page).toContain("a `DialogTitle` inside `Dialog` but");
    expect(page).toContain("outside `DialogContent` throws");
    expect(page).toContain("names the parent");
  });
});
