import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { validate } from "@gpuixui/components/validation/logic";

export const VALIDATION_FIELD = "validation-field";

export const VALIDATION_INPUT = "validation-input";

export const VALIDATION_READOUT = "validation-readout";

export const VALIDATION_MESSAGE =
  "Use lowercase letters, numbers and single hyphens";

export const VALIDATION_DESCRIPTION =
  "Lowercase words joined by hyphens, e.g. design-system.";

export const WorkspaceSlug = Schema.String.check(
  Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    identifier: "WorkspaceSlugPattern",
    title: "Workspace Slug",
    description: "Lowercase words joined by a single hyphen.",
    message: VALIDATION_MESSAGE,
  }),
);

export const submitSlug = (value: string): Option.Option<string> =>
  Effect.runSync(validate(WorkspaceSlug)(value));

export const validationReadout = (
  error: Option.Option<string>,
  applied: Option.Option<string>,
  submits: number,
): string =>
  `error=${Option.getOrElse(error, () => "none")} applied=${Option.getOrElse(
    applied,
    () => "none",
  )} submits=${submits}`;
