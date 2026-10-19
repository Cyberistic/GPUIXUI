import { components } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { APPROXIMATION_NOTICE } from "./approximation-banner";
import { captureFor } from "./captures";
import { LIVE_SURFACE_NOTICE } from "./live-surface";
import { selectPreview } from "./select-preview";

/** The letters `docs/preview-strategy.md` uses for its honest-preview tiers. */
export type PreviewTierLetter =
  | "L"
  | "N"
  | "S"
  | "S (interaction)"
  | "V"
  | "A"
  | "X";

/** A tier row: the label a reader sees and what that label proves. */
export interface PreviewTierRow {
  readonly tier: PreviewTierLetter;
  readonly name: string;
  readonly label: string;
  readonly proves: string;
  /**
   * The registry count the row reports, or `"none"` when the tier is a page
   * author's choice rather than a per-record selection (`A`), or a capture kind
   * rather than a record tier (`S (interaction)`).
   */
  readonly countKey:
    | "live"
    | "screenshot"
    | "playground"
    | "runtime"
    | "unavailable"
    | "none";
}

/**
 * The tiers in the order a reader meets them. `L` and `A` reuse the exact
 * strings their components render, so a label change cannot leave the guide
 * behind (plan 571). The other labels are the reader-facing prefixes of the
 * components' notices; their dynamic parts are named in angle brackets.
 */
export const PREVIEW_TIER_ROWS: readonly PreviewTierRow[] = [
  {
    tier: "L",
    name: "Live GPUix surface",
    label: LIVE_SURFACE_NOTICE,
    proves:
      "The real component code, tokens and layout on GPUix's published WebAssembly renderer in this tab. A real GPUix surface, not the desktop binary.",
    countKey: "live",
  },
  {
    tier: "N",
    name: "Native playground screen",
    label: "Run it natively: nub run dev:playground → <screen>",
    proves:
      "A runnable screen in the desktop playground. No per-component screen ships yet, so no record uses this tier today.",
    countKey: "playground",
  },
  {
    tier: "S",
    name: "Native capture",
    label: "Captured from GPUix — <platform>, GPUix <version>, <commit>",
    proves:
      "A still frame from the real runtime, captioned only from the capture sidecar. It proves the resting layout, not an interaction.",
    countKey: "screenshot",
  },
  {
    tier: "S (interaction)",
    name: "Native interaction recording",
    label: "Recorded in GPUix — <platform>, GPUix <version>, <commit>",
    proves:
      "A before/after pair or recording of a real gesture. It proves the state change a still cannot.",
    countKey: "none",
  },
  {
    tier: "V",
    name: "Native coverage",
    label:
      "Native coverage: <suite> drives this component in the real GPUix renderer. Run <command>. No capture is published for this page yet.",
    proves:
      "An automated suite drives the component in the real renderer. It is coverage, not a capture and not a pass.",
    countKey: "runtime",
  },
  {
    tier: "A",
    name: "Illustrative approximation",
    label: APPROXIMATION_NOTICE,
    proves:
      "The documented layout drawn in the browser for a static rest state. Never an interaction, and always labelled as not GPUix.",
    countKey: "none",
  },
  {
    tier: "X",
    name: "Unavailable",
    label: "Not verified in the GPUix runtime — <reason>",
    proves:
      "The page shows source and a limitation instead of a preview. A missing sidecar also lands here rather than inventing a caption.",
    countKey: "unavailable",
  },
];

/** Every registry record in exactly one selected tier, plus the total. */
export interface PreviewTierCounts {
  readonly total: number;
  readonly live: number;
  readonly screenshot: number;
  readonly playground: number;
  readonly runtime: number;
  readonly unavailable: number;
}

/**
 * The real split, selected by the same function the component pages use. The
 * guide cannot state a count the registry does not ship.
 */
export const previewTierCounts = (
  records: ReadonlyArray<ComponentMetaInput> = components,
): PreviewTierCounts => {
  const counts = records.reduce<Omit<PreviewTierCounts, "total">>(
    (accumulator, record) => {
      const { tier } = selectPreview(record, captureFor);
      return { ...accumulator, [tier]: accumulator[tier] + 1 };
    },
    { live: 0, screenshot: 0, playground: 0, runtime: 0, unavailable: 0 },
  );
  return { total: records.length, ...counts };
};

const countFor = (row: PreviewTierRow, counts: PreviewTierCounts): string =>
  row.countKey === "none" ? "—" : String(counts[row.countKey]);

/**
 * The tier table a reader sees on `/docs/previews`. A live surface and an
 * approximation import their labels; the rest state the component's notice
 * prefix. The counts are a registry read, not prose (plan 571).
 */
export function PreviewTiers() {
  const counts = previewTierCounts();

  return (
    <div className="not-prose my-6 flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="pb-2 text-left text-sm text-fd-muted-foreground">
            Every preview on this site is exactly one of these tiers. The count
            is the number of component records whose page selects it today.
          </caption>
          <thead>
            <tr className="border-b border-fd-border">
              <th scope="col" className="px-2 py-2 font-medium">
                Tier
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                The label a reader sees
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                What it proves
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Records
              </th>
            </tr>
          </thead>
          <tbody>
            {PREVIEW_TIER_ROWS.map((row) => (
              <tr
                key={row.tier}
                data-preview-tier-row={row.tier}
                className="border-b border-fd-border align-top"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-2 py-2 font-medium"
                >
                  {row.tier} — {row.name}
                </th>
                <td className="px-2 py-2 text-fd-muted-foreground">
                  {row.label}
                </td>
                <td className="px-2 py-2">{row.proves}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {countFor(row, counts)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-fd-muted-foreground">
        {counts.total} component records ship today: {counts.live} select a live
        surface, {counts.runtime} select native coverage, and{" "}
        {counts.screenshot + counts.playground + counts.unavailable} select a
        capture, a playground screen or no preview. Approximations are a page
        author's explicit choice and a capture kind is not a record tier, so
        both show <span aria-hidden="true">—</span>
        <span className="sr-only">no record count</span>.
      </p>
    </div>
  );
}
