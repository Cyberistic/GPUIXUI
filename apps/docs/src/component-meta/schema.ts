import * as Schema from "effect/Schema";

/**
 * The component-page record. One record per component drives the component
 * index, the sidebar order, the status badges and the preview tier — see
 * `.agents/slop/plans/411-component-page-template.md`.
 *
 * The schema is the single source of truth for the shape. `entries/*` are
 * written in the encoded (JSON-friendly) form and are validated by
 * `registry.test.ts`; the browser bundle reads the encoded values and never
 * imports `effect`.
 */
export const Tier = Schema.Literals(["1", "2", "3", "4", "5"]);

export const Status = Schema.Literals([
  "planned",
  "wip",
  "done",
  "blocked",
  "unsupported",
]);

/** Whether the real GPUix runtime supports the component's behaviour. */
export const GpuixSupport = Schema.Literals([
  "yes",
  "partial",
  "no",
  "unverified",
]);

export class ComponentMeta extends Schema.Class<ComponentMeta>("ComponentMeta")(
  {
    /** URL segment under `/docs/components/<slug>`. */
    slug: Schema.NonEmptyString,
    /** Display name shown in the index and the page title. */
    title: Schema.NonEmptyString,
    tier: Tier,
    group: Schema.NonEmptyString,
    status: Status,
    gpuix: GpuixSupport,
    /** One sentence, shown in the component index. */
    summary: Schema.NonEmptyString,
    /** The workspace package that will own the implementation. */
    packageName: Schema.String,
    /** Repo-relative path to the component source the API table reads. */
    sourcePath: Schema.OptionFromNullOr(Schema.String),
    dependencies: Schema.Array(Schema.String),
    /** Slugs of related records; each must exist. */
    related: Schema.Array(Schema.String),
    /** Named screen in `apps/playground`, if one exists. */
    playgroundScreen: Schema.OptionFromNullOr(Schema.String),
    /** Real native screenshot paths under `public/`, relative to it. */
    screenshots: Schema.Array(Schema.NonEmptyString),
    limitations: Schema.Array(Schema.String),
  },
) {}

/** The file format of an entry: what `entries.ts` authors write. */
export type ComponentMetaInput = typeof ComponentMeta.Encoded;

export const decodeComponentMeta = Schema.decodeUnknownSync(ComponentMeta);
