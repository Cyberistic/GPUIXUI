/**
 * The wizard model's rules, proven without a renderer (plan `386`).
 *
 * The bug this file guards: the scenario can only show one path through the
 * wizard, so a rule that silently accepts an invalid field, drops a step from
 * the order, or focuses the wrong control on entry would surface as a confusing
 * runtime failure rather than a named rule. Every assertion here can fail by
 * changing the model.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  EMPTY_DRAFT,
  MESSAGES,
  STEP_ORDER,
  STEP_TITLES,
  describeWizard,
  entryFocus,
  fieldsOf,
  firstInvalid,
  inputId,
  invalidFields,
  isValid,
  nextStep,
  previousStep,
  summary,
} from "./wizard-model.js";
import type { Draft } from "./wizard-model.js";

const VALID: Draft = {
  name: "ada",
  email: "ada@x",
  slug: "my-w",
  team: "core",
};

describe("EMPTY_DRAFT and messages", () => {
  it("starts with every field empty", () => {
    expect(EMPTY_DRAFT).toEqual({ name: "", email: "", slug: "", team: "" });
  });

  it("gives every field a distinct user-facing message", () => {
    const messages = [MESSAGES.name, MESSAGES.email, MESSAGES.slug, MESSAGES.team];
    expect(messages.every((message) => message.length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(4);
  });
});

describe("fieldsOf", () => {
  it("walks the steps in the order a user sees them", () => {
    expect(fieldsOf(1)).toEqual(["name", "email"]);
    expect(fieldsOf(2)).toEqual(["slug", "team"]);
    expect(fieldsOf(3)).toEqual([]);
  });
});

describe("isValid", () => {
  it("requires a name of at least three characters", () => {
    expect(isValid("name", "ab")).toBe(false);
    expect(isValid("name", "abc")).toBe(true);
  });

  it("requires an address containing @", () => {
    expect(isValid("email", "adx")).toBe(false);
    expect(isValid("email", "ada@x")).toBe(true);
    expect(isValid("email", "@")).toBe(false);
  });

  it("requires a lowercase hyphenated slug without spaces", () => {
    expect(isValid("slug", "my-w")).toBe(true);
    expect(isValid("slug", "myworkspace")).toBe(false);
    expect(isValid("slug", "My-W")).toBe(false);
    expect(isValid("slug", "my w")).toBe(false);
  });

  it("requires a team name", () => {
    expect(isValid("team", "")).toBe(false);
    expect(isValid("team", "core")).toBe(true);
  });
});

describe("invalidFields and firstInvalid", () => {
  it("reports the empty account step in field order", () => {
    expect(invalidFields(1, EMPTY_DRAFT)).toEqual(["name", "email"]);
  });

  it("drops a field as soon as its rule holds", () => {
    expect(invalidFields(1, { ...EMPTY_DRAFT, name: "ada" })).toEqual(["email"]);
  });

  it("reports nothing for a complete step", () => {
    expect(invalidFields(1, VALID)).toEqual([]);
    expect(invalidFields(2, VALID)).toEqual([]);
  });

  it("has no fields — and no failure — on the review", () => {
    expect(invalidFields(3, EMPTY_DRAFT)).toEqual([]);
  });

  it("focuses the first failing field, or none", () => {
    expect(Option.getOrElse(firstInvalid(1, EMPTY_DRAFT), () => "none")).toBe(
      "name",
    );
    expect(
      Option.getOrElse(
        firstInvalid(1, { ...EMPTY_DRAFT, name: "ada" }),
        () => "none",
      ),
    ).toBe("email");
    expect(Option.isNone(firstInvalid(2, VALID))).toBe(true);
  });

  it("does not mutate the draft it reads", () => {
    const draft: Draft = { ...EMPTY_DRAFT };
    invalidFields(1, draft);
    expect(draft).toEqual(EMPTY_DRAFT);
  });
});

describe("step navigation", () => {
  it("advances 1 → 2 → 3 and stops", () => {
    expect(Option.getOrElse(nextStep(1), () => 0)).toBe(2);
    expect(Option.getOrElse(nextStep(2), () => 0)).toBe(3);
    expect(Option.isNone(nextStep(3))).toBe(true);
  });

  it("goes back 3 → 2 → 1 and stops", () => {
    expect(Option.getOrElse(previousStep(3), () => 0)).toBe(2);
    expect(Option.getOrElse(previousStep(2), () => 0)).toBe(1);
    expect(Option.isNone(previousStep(1))).toBe(true);
  });

  it("keeps the order literal", () => {
    expect(STEP_ORDER).toEqual([1, 2, 3]);
    expect(STEP_TITLES).toEqual({
      1: "Account",
      2: "Workspace",
      3: "Review",
    });
  });
});

describe("entryFocus and inputId", () => {
  it("focuses each step's first control", () => {
    expect(entryFocus(1)).toBe("wizard-name");
    expect(entryFocus(2)).toBe("wizard-slug");
    expect(entryFocus(3)).toBe("wizard-submit");
  });

  it("names every input after its field", () => {
    expect(inputId("name")).toBe("wizard-name");
    expect(inputId("email")).toBe("wizard-email");
    expect(inputId("slug")).toBe("wizard-slug");
    expect(inputId("team")).toBe("wizard-team");
  });
});

describe("summary", () => {
  it("reports the decoded draft on one line", () => {
    expect(summary(VALID)).toBe("ada <ada@x> my-w / core");
  });

  it("is explicit about an empty draft", () => {
    expect(summary(EMPTY_DRAFT)).toBe("none <none> none / none");
  });
});

describe("describeWizard", () => {
  const baseline = {
    step: 1 as const,
    mode: "unmount" as const,
    draft: EMPTY_DRAFT,
    errors: [],
    submits: 0,
    last: "start" as const,
    created: Option.none<string>(),
  };

  it("prints the baseline exactly as the scenario asserts it", () => {
    expect(describeWizard(baseline)).toBe(
      "step=1 mode=unmount name=none email=none slug=none team=none errors=0 submits=0 last=start created=none summary=none",
    );
  });

  it("joins the failing fields and hides the summary before review", () => {
    expect(
      describeWizard({
        ...baseline,
        errors: ["name", "email"],
        last: "next",
      }),
    ).toContain("errors=name,email submits=0 last=next");
  });

  it("shows the summary on review and the created line after submit", () => {
    const review = describeWizard({
      ...baseline,
      step: 3,
      draft: VALID,
      submits: 1,
      last: "submit",
      created: Option.some(summary(VALID)),
    });
    expect(review).toContain("step=3");
    expect(review).toContain("summary=ada <ada@x> my-w / core");
    expect(review).toContain("created=ada <ada@x> my-w / core");
  });

  it("prints none for the empty values", () => {
    expect(describeWizard(baseline)).toContain(
      "name=none email=none slug=none team=none",
    );
  });
});
