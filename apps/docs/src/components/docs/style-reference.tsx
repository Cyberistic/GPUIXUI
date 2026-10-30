import { Match } from "effect";
import type { Theme } from "@gpuixui/tokens";
import { platformLabel } from "../../lib/platform";
import {
  classGroups,
  refusedClasses,
  resolveClass,
  type ResolvedClass,
} from "../../lib/style-reference";
import { usePlatform } from "./platform-toggle";
import { PreviewSurface } from "./preview-surface";

/**
 * The class reference `/styling` mounts.
 *
 * Every cell is compiled by `@gpuixui/tw` against the theme the platform switch
 * resolved, so a reader sees this release's number — a macOS control height, a
 * Linux corner, a dark role — rather than a copy of the compiler's defaults.
 * The suite next to this file holds the table to the compiler's own vocabulary
 * and to the values it resolves, and the refusals to the sentences the compiler
 * records.
 */

const cell = "px-2 py-1.5 font-mono text-xs";
const headCell = "px-2 py-1.5 font-semibold";

/** A group's rule, with the class names it backticks painted as code. */
const Note = ({ text }: { readonly text: string }) => (
  <p className="mb-2 mt-1 text-xs leading-relaxed text-muted-foreground">
    {text
      .split("`")
      .map((part, index) =>
        index % 2 === 1 ? <code key={`${index}-${part}`}>{part}</code> : part,
      )}
  </p>
);

/** What a compiled row reads in its second column. */
const painted = (resolved: ResolvedClass): string =>
  Match.value(resolved).pipe(
    Match.tagsExhaustive({
      Painted: ({ paints }) =>
        paints.length === 0 ? "no property" : paints.join(" · "),
      Refused: ({ reason }) => reason,
    }),
  );

/** One class and what it painted, or the reason it painted nothing. */
const Row = ({
  theme,
  className,
}: {
  readonly theme: Theme;
  readonly className: string;
}) => (
  <tr
    className="border-b border-border last:border-0"
    data-style-class={className}
  >
    <th
      className="w-40 px-2 py-1.5 text-left font-mono text-xs font-medium"
      scope="row"
    >
      {className}
    </th>
    <td className={`${cell} text-muted-foreground`}>
      {painted(resolveClass(theme, className))}
    </td>
  </tr>
);

/** The table, given a resolved theme (no context, so it is testable). */
export function StyleReferenceBody({ theme }: { readonly theme: Theme }) {
  return (
    <div className="not-prose space-y-8">
      {classGroups.map((group) => (
        <section key={group.name}>
          <h3 className="m-0 text-sm font-semibold text-foreground">
            {group.name}
          </h3>
          <Note text={group.note} />
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left">
                  <th className={headCell} scope="col">
                    Class
                  </th>
                  <th className={headCell} scope="col">
                    Paints
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.classes.map((className) => (
                  <Row className={className} key={className} theme={theme} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section>
        <h3 className="m-0 text-sm font-semibold text-foreground">
          Refused, with the compiler&apos;s reason
        </h3>
        <p className="mb-2 mt-1 text-xs leading-relaxed text-muted-foreground">
          A class the renderer cannot carry is kept in the result&apos;s
          unsupported list rather than dropped, and the reason comes from the
          compiler&apos;s own table — so an extension sees the same sentence a
          reader does.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left">
                <th className={headCell} scope="col">
                  Class
                </th>
                <th className={headCell} scope="col">
                  Why it cannot paint
                </th>
              </tr>
            </thead>
            <tbody>
              {refusedClasses.map((className) => (
                <Row className={className} key={className} theme={theme} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** The reference on the platform surface, so the switch repaints every cell. */
export function StyleReference() {
  const { platform, theme } = usePlatform();

  return (
    <PreviewSurface className="gx-style-reference">
      <StyleReferenceBody theme={theme} />
      <p className="gx-type-note">
        Browser table of the {platformLabel(platform)} theme: every value is
        compiled by `@gpuixui/tw` from the same theme the previews use, so the
        platform switch moves the heights, corners, colours and shadows a class
        paints. The shipped components paint these through GPUix, not the DOM.
      </p>
    </PreviewSurface>
  );
}
