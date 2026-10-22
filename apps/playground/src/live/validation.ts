/**
 * The schema and the submit rule `validation-lifecycle` drives.
 *
 * `Field` paints what the caller tells it and never validates on a keystroke, so
 * the probe *is* the caller: the shipped `validate` runs when the field submits,
 * and the `Option` it returns becomes the field's message. The pattern owns its
 * `message`, so the text the window paints is the schema's own wording rather
 * than a formatter's guess — which is what the probe's message check reads.
 *
 * Running the Effect here is the app boundary the field's docs describe: a
 * submit handler is where a synchronous form decision belongs.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { validate } from "@gpuixui/components/validation/logic";

/** The probe's field: a label, the control, one message slot. */
export const VALIDATION_FIELD = "validation-field";

/** The control a reader types into and submits from. */
export const VALIDATION_INPUT = "validation-input";

/** The caller-owned record of the last submit, read by every check. */
export const VALIDATION_READOUT = "validation-readout";

/** The message the pattern paints, verbatim. */
export const VALIDATION_MESSAGE =
  "Use lowercase letters, numbers and single hyphens";

/** The supporting copy the message replaces while the field is invalid. */
export const VALIDATION_DESCRIPTION =
  "Lowercase words joined by hyphens, e.g. design-system.";

/** A workspace slug: one lowercase word, then hyphen-joined words. */
export const WorkspaceSlug = Schema.String.check(
  Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    identifier: "WorkspaceSlugPattern",
    title: "Workspace Slug",
    description: "Lowercase words joined by a single hyphen.",
    message: VALIDATION_MESSAGE,
  }),
);

/** The first message `value` earns, or `None` when the slug is usable. */
export const submitSlug = (value: string): Option.Option<string> =>
  Effect.runSync(validate(WorkspaceSlug)(value));

/** The `key=value` line the checks assert against. */
export const validationReadout = (
  error: Option.Option<string>,
  applied: Option.Option<string>,
  submits: number,
): string =>
  `error=${Option.getOrElse(error, () => "none")} applied=${Option.getOrElse(
    applied,
    () => "none",
  )} submits=${submits}`;
