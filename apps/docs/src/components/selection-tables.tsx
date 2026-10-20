import type { SelectionField } from "@/lib/selection";
import {
  findRangeFields,
  highlightFields,
  selectionAbsences,
  textSearchFields,
} from "@/lib/selection";

/**
 * The selection and find tables (plan 627). Every row comes from
 * `src/lib/selection.ts`, whose guard compares it with the installed
 * `@gpuix/native` declarations. These components own presentation only.
 */
const FieldTable = ({
  caption,
  fields,
  marker,
}: {
  readonly caption: string;
  readonly fields: ReadonlyArray<SelectionField>;
  readonly marker: string;
}) => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label={caption}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm" data-selection={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          <th className="py-2 pr-4 font-medium">Field</th>
          <th className="py-2 font-medium">What it does</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr
            key={field.name}
            data-field={field.name}
            className="border-b border-fd-border align-top last:border-0"
          >
            <td className="py-2 pr-4 font-mono whitespace-nowrap">
              {field.name}
            </td>
            <td className="py-2 text-fd-muted-foreground">{field.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const HighlightFields = () => (
  <FieldTable
    caption="Every HighlightSpec field"
    fields={highlightFields}
    marker="highlight"
  />
);

export const TextSearchFields = () => (
  <FieldTable
    caption="Every TextSearchOptions field"
    fields={textSearchFields}
    marker="text-search"
  />
);

export const FindRangeFields = () => (
  <FieldTable
    caption="Every FindRangesOptions field"
    fields={findRangeFields}
    marker="find-ranges"
  />
);

/** What the runtime does not provide (plan 627). */
export const SelectionAbsences = () => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label="What the selection and highlight API does not provide"
    tabIndex={0}
  >
    <table className="w-full text-left text-sm" data-selection-absences>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          <th className="py-2 pr-4 font-medium">Not provided</th>
          <th className="py-2 font-medium">What to do instead</th>
        </tr>
      </thead>
      <tbody>
        {selectionAbsences.map((absence) => (
          <tr
            key={absence.subject}
            data-absence={absence.subject}
            className="border-b border-fd-border align-top last:border-0"
          >
            <td className="py-2 pr-4 font-medium whitespace-nowrap">
              {absence.subject}
            </td>
            <td className="py-2 text-fd-muted-foreground">
              {absence.statement}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
