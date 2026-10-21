import { TOKEN_MATCH_RANK } from "./generated-search";
import {
  DESCRIPTION_MATCH_RANK,
  MAX_SEARCH_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  PHRASE_TYPO_MATCH_RANK,
  TYPO_MATCH_RANK,
} from "./search-ranks";

/**
 * The facts the reader-facing Site search page renders (plan 610). Kept free of
 * `src/lib/search.ts` on purpose: that module imports the Fumadocs server index
 * and the MDX source, which must not reach the browser bundle. The lists below
 * are compared with the real modules by `search-docs.test.ts`.
 */

/** The route's limits, rendered as prose values rather than typed. */
export const searchLimits = {
  default: DEFAULT_SEARCH_LIMIT,
  max: MAX_SEARCH_LIMIT,
} as const;

/** One exported rank constant and what it means to a reader. */
export interface SearchRank {
  readonly constant: string;
  readonly value: string;
  readonly means: string;
}

/**
 * A live scene's instruction ranks above a name token and a summary word but
 * below a whole name (plan 582). `scene-search.ts` is the owner; the literal is
 * compared with `SCENE_MATCH_RANK` by the test, because importing that module
 * would pull the scene table into this page's bundle for one number.
 */
export const SCENE_INSTRUCTION_RANK = 3;

export const searchRanks: ReadonlyArray<SearchRank> = [
  {
    constant: "PHRASE_TYPO_MATCH_RANK",
    value: String(PHRASE_TYPO_MATCH_RANK),
    means: "a phrase whose words nearly spell one whole component or page name",
  },
  {
    constant: "SCENE_INSTRUCTION_RANK",
    value: String(SCENE_INSTRUCTION_RANK),
    means: "a live scene instruction, such as “wheel up”",
  },
  {
    constant: "TOKEN_MATCH_RANK",
    value: String(TOKEN_MATCH_RANK),
    means: "one word of a name, or a multiword generated name",
  },
  {
    constant: "DESCRIPTION_MATCH_RANK",
    value: String(DESCRIPTION_MATCH_RANK),
    means: "where a page summary starts, one tier below its own title",
  },
  {
    constant: "TYPO_MATCH_RANK",
    value: String(TYPO_MATCH_RANK),
    means: "a one-edit misspelling of a name, after every real match",
  },
];

/** One docs-owned search document: rendered React, so the page index misses it. */
export interface IndexedSurface {
  readonly title: string;
  readonly url: string;
  readonly what: string;
}

export const indexedSurfaces: ReadonlyArray<IndexedSurface> = [
  {
    title: "Accessibility",
    url: "/docs/accessibility",
    what: "the supported `aria-*` surface and the substitute for each gap",
  },
  {
    title: "Component API",
    url: "/docs/component-api#shared-host-props",
    what: "every shared host prop a part inherits",
  },
  {
    title: "Component API",
    url: "/docs/component-api#layering",
    what: "the overlay paint order and the dismiss rule",
  },
  {
    title: "Component API",
    url: "/docs/component-api#refs-and-element-handles",
    what: "the element instance a ref receives and the focus recipe",
  },
  {
    title: "Events",
    url: "/docs/events",
    what: "every handler, every `EventPayload` field and what the payload does not carry",
  },
  {
    title: "Part states",
    url: "/docs/component-api#every-state-type",
    what: "every exported state type and the fields it declares",
  },
  {
    title: "Colour roles",
    url: "/docs/theming#semantic-roles",
    what: "every semantic colour role and its value",
  },
  {
    title: "High-contrast colour roles",
    url: "/docs/theming#high-contrast",
    what: "both high-contrast palettes",
  },
  {
    title: "Type scale",
    url: "/docs/typography",
    what: "the ten type roles",
  },
  {
    title: "Scales and control metrics",
    url: "/docs/theming#scales-and-control-metrics",
    what: "spacing, radius, border, icon size, density and elevation",
  },
  {
    title: "Platform styles",
    url: "/docs/theming#platform-styles",
    what: "the fields each platform style changes",
  },
  {
    title: "Tokens API",
    url: "/docs/tokens-api#functions",
    what: "the exported theme helpers",
  },
  {
    title: "GPUix capabilities",
    url: "/docs/capabilities",
    what: "the measured matrix and every scenario id",
  },
  {
    title: "Icon names",
    url: "/docs/components/icon",
    what: "every shipped icon",
  },
  {
    title: "Platform support",
    url: "/docs/installation#native-bindings",
    what: "the published native targets",
  },
  {
    title: "Roadmap",
    url: "/docs/roadmap",
    what: "every tracked Tier 3–5 target",
  },
  {
    title: "Live scenes",
    url: "/docs/previews",
    what: "every shipped scene and the gesture that shows it",
  },
  {
    title: "Contributing",
    url: "/docs/contributing#site-output",
    what: "the site's sitemap, robots, llms and manifest output",
  },
  {
    title: "Styling",
    url: "/docs/styling",
    what: "every `StyleDesc` field the runtime paints",
  },
  {
    title: "Native elements",
    url: "/docs/native-elements",
    what: "every JSX element, its props and what has no component",
  },
  {
    title: "Native text theme",
    url: "/docs/native-text-theme",
    what: "GpuixTheme, syntax colours, code/diff/markdown metrics and the token mapping",
  },
  {
    title: "Selection and find",
    url: "/docs/selection",
    what: "the selection API, every `HighlightSpec` field and the find controller",
  },
  {
    title: "Testing your components",
    url: "/docs/testing",
    what: "the test renderer, every method a component test uses and the absent tools",
  },
  {
    title: "Automation",
    url: "/docs/automation",
    what: "the app driver, every Locator method and the wire protocol",
  },
  {
    title: "Troubleshooting",
    url: "/docs/troubleshooting",
    what: "the render-error path: boundary, overlay and `onUncaughtError`",
  },
  {
    title: "Auto-update",
    url: "/docs/updates",
    what: "every updater member, the feed contract and the unverified install path",
  },
];
