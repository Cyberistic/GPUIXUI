/**
 * The related components a page points at.
 *
 * `MISSION.md` asks every component page for its related components, and a
 * curated page writes that section itself. A package page is Markdown the site
 * mounts, so it cannot resolve its siblings: the site answers it here and
 * `RelatedStrip` prints the answer at the end of the page.
 *
 * A family is one layer's working set, not a taxonomy of the whole library —
 * a reader on the Ripple button page is choosing between the other actions,
 * and a reader on the Table sorting page is choosing between the other table
 * surfaces. Every mounted package page is either in a family or argued as a
 * solo in {@link soloPages}, which `related.test.ts` holds in both directions:
 * a page that moves to another family is a link that changes, and a new page
 * that lands nowhere fails the suite instead of shipping without siblings.
 *
 * A curated page may stand in a family beside the package pages: its URL is the
 * one the site serves, so that is what the strip links.
 */

/** One link the strip prints. */
export interface RelatedPage {
  /** The page's own frontmatter title. */
  readonly label: string;
  /** The mounted URL. */
  readonly href: string;
}

/** A working set of pages a reader picks between. */
export interface RelatedFamily {
  /** What the set is, printed after "Related". */
  readonly name: string;
  readonly pages: ReadonlyArray<RelatedPage>;
}

/** A page with no sibling, and why. */
export interface SoloPage {
  readonly href: string;
  readonly reason: string;
}

const page = (label: string, href: string): RelatedPage => ({ label, href });

const primitive = (slug: string, label: string): RelatedPage =>
  page(label, `/docs/primitives/${slug}`);

const component = (slug: string, label: string): RelatedPage =>
  page(label, `/docs/components/${slug}`);

const data = (slug: string, label: string): RelatedPage =>
  page(label, `/docs/data-display/${slug}`);

const lane =
  (origin: string) =>
  (slug: string, label: string): RelatedPage =>
    page(label, `/docs/${origin}/${slug}`);

const editor = lane("editor");
const files = lane("files");
const shell = lane("shell");
const dock = lane("dock");
const media = lane("media");

export const relatedFamilies: ReadonlyArray<RelatedFamily> = [
  {
    name: "Actions",
    pages: [
      primitive("button", "Button"),
      primitive("icon-button", "IconButton"),
      primitive("button-group", "ButtonGroup"),
      primitive("toggle", "Toggle"),
      primitive("toggle-group", "Toggle group"),
    ],
  },
  {
    name: "Selection controls",
    pages: [
      primitive("checkbox", "Checkbox"),
      primitive("checkbox-group", "Checkbox group"),
      primitive("radio-group", "RadioGroup"),
      primitive("switch", "Switch"),
      primitive("rating", "Rating"),
      primitive("slider", "Slider"),
      primitive("range-slider", "RangeSlider"),
    ],
  },
  {
    name: "Text fields",
    pages: [
      primitive("input", "Input"),
      primitive("textarea", "TextArea"),
      primitive("number-field", "NumberField"),
      primitive("otp-field", "OTPField"),
      primitive("select", "Select"),
    ],
  },
  {
    name: "Layout",
    pages: [
      primitive("box", "Box"),
      primitive("stack", "Stack"),
      primitive("grid", "Grid"),
      primitive("spacer", "Spacer"),
      primitive("separator", "Separator"),
      primitive("scroll-area", "ScrollArea"),
    ],
  },
  {
    name: "Status marks",
    pages: [
      primitive("progress", "Progress"),
      primitive("meter", "Meter"),
      primitive("spinner", "Spinner"),
      primitive("skeleton", "Skeleton"),
    ],
  },
  {
    name: "Text",
    pages: [primitive("text", "Text"), primitive("label", "Label")],
  },
  {
    name: "Actions and their effects",
    pages: [
      component("button", "Button"),
      component("ripple-button", "Ripple button"),
      component("liquid-button", "Liquid button"),
      component("shine-button", "Shine button"),
      component("copy-button", "Copy button"),
      component("theme-toggler", "Theme toggler"),
    ],
  },
  {
    name: "Text effects",
    pages: [
      component("gradient-text", "Gradient text"),
      component("highlight-text", "Highlight text"),
      component("splitting-text", "Splitting text"),
      component("rotating-text", "Rotating text"),
      component("rolling-text", "Rolling text"),
      component("sliding-text", "Sliding text"),
      component("sliding-number", "Sliding number"),
      component("typing-text", "Typing text"),
      component("counting-number", "Counting number"),
      component("glyph", "Glyph"),
    ],
  },
  {
    name: "Animated backgrounds",
    pages: [
      component("particles", "Particles"),
      component("stars", "Stars"),
      component("gravity-stars", "Gravity stars"),
      component("bubbles", "Bubbles"),
      component("fireworks", "Fireworks"),
      component("hexagon", "Hexagon"),
      component("topography", "Topography"),
      component("gradient", "Gradient"),
    ],
  },
  {
    name: "Motion surfaces",
    pages: [
      component("reveal", "Reveal"),
      component("auto-height", "Auto height"),
      component("page-transition", "Page transition"),
      component("motion-grid", "Motion grid"),
      component("magnetic", "Magnetic"),
      component("image-zoom", "Image zoom"),
      component("scroll-fade", "Scroll fade"),
      component("scroll-progress", "Scroll progress"),
      component("pinned-list", "Pinned list"),
    ],
  },
  {
    name: "Feedback",
    pages: [
      component("alert", "Alert"),
      component("toast", "Toast"),
      component("badge", "Badge"),
      component("empty-state", "Empty state"),
      component("timeline", "Timeline"),
      component("stepper", "Stepper"),
      component("countdown", "Countdown"),
      component("avatar", "Avatar"),
      component("avatar-group", "Avatar group"),
    ],
  },
  {
    name: "Content surfaces",
    pages: [
      component("card", "Card"),
      component("accordion", "Accordion"),
      component("collapsible", "Collapsible"),
      component("carousel", "Carousel"),
      component("tabs", "Tabs"),
      component("message", "Message"),
      component("message-scroller", "Message Scroller"),
      component("chat", "Chat"),
      component("code-block", "Code block"),
    ],
  },
  {
    name: "Lists, tables and pagination",
    pages: [
      component("list", "List"),
      component("table", "Table"),
      component("pagination", "Pagination"),
      component("breadcrumb", "Breadcrumb"),
    ],
  },
  {
    name: "Menus",
    pages: [
      component("navigation-menu", "Navigation menu"),
      component("command-menu", "Command menu"),
      component("dropdown-menu", "Dropdown menu"),
      component("context-menu", "Context menu"),
    ],
  },
  {
    name: "Overlays",
    pages: [
      component("dialog", "Dialog"),
      component("confirm-dialog", "Confirmation dialog"),
      component("drawer", "Drawer"),
      component("popover", "Popover"),
      component("preview-card", "Preview card"),
      component("tooltip", "Tooltip"),
    ],
  },
  {
    name: "Form composition",
    pages: [
      component("field", "Field and inline validation"),
      component("fieldset", "Fieldset"),
      component("form", "Form"),
      component("inline-edit", "Inline edit"),
      component("hotkey-recorder", "Hotkey recorder"),
      component("keyboard-shortcuts", "Keyboard shortcuts"),
    ],
  },
  {
    name: "Inputs and pickers",
    pages: [
      component("search-input", "Search input"),
      component("tag-input", "Tag input"),
      component("mention-input", "Mention input"),
      component("combobox", "Combobox"),
      component("color-picker", "Color picker"),
      component("date-picker", "Date picker"),
      component("time-picker", "Time picker"),
      component("select", "Select"),
    ],
  },
  {
    name: "Selection actions",
    pages: [component("checkbox", "Checkbox"), component("switch", "Switch")],
  },
  {
    name: "Table surfaces",
    pages: [
      data("table-sorting", "Table sorting"),
      data("table-selection", "Table selection"),
      data("frozen-columns", "Frozen columns"),
      data("column-configuration", "Column configuration"),
      data("expandable-rows", "Expandable rows"),
      data("data-toolbar", "Data toolbars"),
      data("advanced-filter", "Advanced filtering / query builders"),
    ],
  },
  {
    name: "Tree and virtualized data",
    pages: [
      data("tree-view", "Tree views"),
      data("virtual-tree", "Virtual trees"),
      data("virtualization", "Virtualization"),
    ],
  },
  {
    name: "Panels and charts",
    pages: [
      data("property-panel", "Property panels"),
      data("key-value", "Key-value displays"),
      data("stat-card", "Statistic / metric cards"),
      data("charts", "Charts"),
    ],
  },
  {
    name: "Code surfaces",
    pages: [
      editor("code-editor", "Code editor"),
      editor("diff-viewer", "Diff viewer"),
      editor("search-replace", "Search and replace"),
    ],
  },
  {
    name: "File surfaces",
    pages: [
      files("file-tree", "File trees"),
      files("log-viewer", "Log viewers"),
      files("property-panel", "Property panels"),
    ],
  },
  {
    name: "Window chrome",
    pages: [
      shell("app-menu", "Application menu"),
      shell("status-bar", "Status bar"),
      shell("toolbar", "Toolbar"),
    ],
  },
  {
    name: "Panels and docking",
    pages: [
      dock("dock-layout", "Docking layouts"),
      dock("panel-group", "Panel groups"),
      dock("split-pane", "Split pane"),
    ],
  },
  {
    name: "Media surfaces",
    pages: [
      media("drop-zone", "DropZone"),
      media("file-upload", "FileUpload"),
      media("image-preview", "ImagePreview"),
    ],
  },
];

/**
 * The pages with no sibling to offer, and the reason.
 *
 * Two primitives and the icon set are one-offs in their own layer: a provider is
 * not a component, the primitive Tooltip is the same component as the curated
 * Tooltip page (listing both would link one overlay twice), and the icon set is
 * a single page.
 */
export const soloPages: ReadonlyArray<SoloPage> = [
  {
    href: "/docs/primitives/theme-provider",
    reason: "a provider, not a component — no sibling to choose between",
  },
  {
    href: "/docs/primitives/tooltip",
    reason:
      "the only overlay primitive; the curated Tooltip page is the same component",
  },
  {
    href: "/docs/icons/icon",
    reason: "the icon set is one page",
  },
];

/** The family a page belongs to, with the page itself left out of the links. */
export const relatedFor = (
  url: string,
):
  | {
      readonly family: RelatedFamily;
      readonly pages: ReadonlyArray<RelatedPage>;
    }
  | undefined => {
  const family = relatedFamilies.find((candidate) =>
    candidate.pages.some((member) => member.href === url),
  );
  if (family === undefined) return undefined;

  const pages = family.pages.filter((member) => member.href !== url);
  return pages.length === 0 ? undefined : { family, pages };
};
