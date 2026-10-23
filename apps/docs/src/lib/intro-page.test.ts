import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { declaredTypes, propsOf, type TypeIndex } from "./component-props";

/**
 * `/docs` is the first page a reader copies from, and both of its snippets had
 * drifted from the components they show: the `Badge` example passed
 * `tone="success"`, which is `Alert`'s prop — `Badge` takes `variant`, so the
 * snippet a reader pasted first did not compile — and the placement paragraph
 * promised that a `DialogTitle` "outside a `DialogHeader` fails", while
 * `DialogContent` accepts a title directly and `Dialog`'s contract is the one
 * that rejects a part it does not host. The page is read here the way the
 * curated component pages are (`component-props.ts`), so a prop renamed in the
 * package fails the introduction until the snippet follows.
 *
 * `ThemeProvider` is the tokens package's React bridge and outside the three
 * packages the props reader scans; its props are documented on `/docs/theming`.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/index.mdx");

const types: TypeIndex = declaredTypes();

/** The props type behind each component the introduction renders. */
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
  // The tokens package's provider, outside the scanned packages.
  ThemeProvider: "",
};

interface Element {
  readonly name: string;
  readonly attributes: ReadonlyArray<string>;
}

/** The JSX elements in the page's fenced `tsx` blocks, with their attributes. */
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

/** The parts one dialog contract names, read from the object it declares. */
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
    // A floor: the two fences render ten elements between them, so a parse that
    // stopped matching cannot pass.
    expect(elements.length).toBeGreaterThanOrEqual(10);

    const unknown = elements.flatMap(({ name, attributes }) => {
      const type = propsTypes[name];
      if (type === undefined) return [`${name} is not a documented component`];
      if (type === "") return [];

      // A type that resolves to nothing reports every attribute below, so a
      // reader that stopped reading cannot pass this case quietly.
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
    // The exact drift: `tone` is Alert's, `variant` is Badge's.
    expect(page).toContain('<Badge variant="success">');

    const badge = propsOf("BadgeProps", types);
    expect(badge).toContain("variant");
    expect(badge).not.toContain("tone");
  });

  it("teaches the placement rule the dialog enforces", () => {
    // A title is accepted inside the content, with or without a header; the
    // root is the parent that rejects it, naming what to do instead.
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
