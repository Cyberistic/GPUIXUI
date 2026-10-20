import type { GeneratedSearchEntry } from "./generated-search";
import { absentElements, nativeElements } from "./native-elements";

/**
 * The element catalogue's search document (plan 626). The page renders its
 * tables from `native-elements.ts`, and generated type-table rows are dropped
 * from search (plan 479), so without this document no element prop, tag or
 * replacement has a home: `img`, `intrinsic elements`, `render markdown` and
 * `svg element` reached Avatar, Scrollable containers and Architecture.
 *
 * Only distinctive spellings are promoted: the two declaration names and the
 * camelCase or hyphenated props. The plain element words (`div`, `text`,
 * `input`, `img`, `svg`, `canvas`, `code`, `diff`, `markdown`) are indexed but
 * never promoted, so Text inputs keeps `input`, Text keeps `text` and
 * Typography keeps `code`.
 */
const promotedElementNames = (): ReadonlyArray<string> => [
  "IntrinsicElements",
  "ElementType",
  ...nativeElements.flatMap((element) => [
    ...(element.tag.includes("-") ? [element.tag] : []),
    ...element.props.filter((prop) => /[A-Z]/u.test(prop)),
  ]),
];

const elementLines = nativeElements.map((element) => {
  const composition =
    element.composedBy.length === 0
      ? `No component ships; roadmap target ${element.roadmap ?? "none"}.`
      : `Composed by ${element.composedBy.join(", ")}.`;
  return [
    `<${element.tag}>: ${element.paints}`,
    element.props.length === 0
      ? "Shared host props only."
      : `Props: ${element.props.join(", ")}.`,
    composition,
    element.note ?? "",
  ]
    .filter((line) => line.length > 0)
    .join(" ");
});

export const nativeElementsSearchEntry: GeneratedSearchEntry = {
  names: promotedElementNames(),
  index: {
    title: "Native elements",
    description:
      "The runtime's twelve JSX elements, their props, the tags that do not exist and the HTML element each absence becomes.",
    content: [
      "A GPUix app has no HTML element set: the runtime paints twelve JSX elements and every component is built from them. There is no DOM, no querySelector, no document and no className.",
      "The twelve intrinsic elements are div, text, img, svg, canvas, input, textarea, anchored, code, diff, markdown and virtual-list.",
      ...elementLines,
      ...absentElements.map(
        (row) => `No ${row.tag} element: ${row.replacement}`,
      ),
      "An image element is <img>; a vector graphic element is <svg>; a code element is <code>; a diff element is <diff>; a markdown element is <markdown>.",
      "Semantic HTML headings, lists, tables, links, forms and labels are components or roles instead.",
    ].join("\n"),
    url: "/docs/native-elements",
    breadcrumbs: ["Native elements"],
    keywords: [
      ...nativeElements.map((element) => element.tag),
      ...nativeElements.flatMap((element) => element.props),
      ...absentElements.map((row) => row.tag),
      "jsx",
      "intrinsic elements",
      "host element",
      "native element",
      "element catalogue",
      "dom",
    ].join(" "),
  },
};
