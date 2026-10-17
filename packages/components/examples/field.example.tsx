/**
 * Field example: a real validation round-trip on submit.
 *
 * `validate` returns an Effect over the schema, so the example runs it in the
 * click handler — an application boundary, which is the one place `Effect.run*`
 * belongs (EF-21). The field itself never validates on every keystroke.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { Field, FieldInput } from "../src/field.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { validate } from "../src/validation/logic.js";

/** A workspace slug: lowercase words joined by hyphens. */
const Slug = Schema.NonEmptyString.check(
  Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    identifier: "WorkspaceSlugPattern",
    title: "Workspace Slug",
    description: "Lowercase words joined by a single hyphen.",
    message: "Use lowercase letters, numbers and single hyphens",
  }),
);

/** A tiny form that validates on Apply, not on every keystroke. */
export const FieldExample = () => {
  const theme = useTheme();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [applied, setApplied] = useState("none");

  const apply = (): void => {
    const message = Effect.runSync(validate(Slug)(slug));
    Option.match(message, {
      onNone: () => {
        setError(undefined);
        setApplied(slug);
      },
      onSome: setError,
    });
  };

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>New workspace</CardTitle>
        <CardDescription>Last applied: {applied}</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          paddingTop: 0,
        }}
      >
        <Field
          label="Workspace URL"
          description="Lowercase words joined by hyphens, e.g. design-system."
          error={error}
          required
        >
          <FieldInput
            testId="workspace-slug"
            placeholder="design-system"
            value={slug}
            onChange={(event) => setSlug(event.value ?? "")}
          />
        </Field>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.md,
          }}
        >
          <Button variant="primary" onClick={apply}>
            Apply
          </Button>
          <Button
            onClick={() => {
              setSlug("");
              setError(undefined);
            }}
          >
            Reset
          </Button>
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Try “Design System” to see the schema's own message.
        </text>
      </div>
    </Card>
  );
};
