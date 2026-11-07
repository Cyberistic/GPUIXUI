import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  accessibleName,
  captionCopy,
  fieldHelp,
  spokenText,
  visibleCopy,
} from "./a11y.js";

describe("accessibleName", () => {
  it("publishes a real name, trimmed", () => {
    expect(accessibleName("Save")).toBe("Save");
    expect(accessibleName("  Save  ")).toBe("Save");
  });

  it("omits a blank name so the control can fall back", () => {
    expect(accessibleName("")).toBeUndefined();
    expect(accessibleName(" \t ")).toBeUndefined();
    expect(accessibleName(undefined)).toBeUndefined();
  });
});

describe("visibleCopy", () => {
  it("paints the caller's own text as written", () => {
    expect(visibleCopy("Save")).toBe("Save");
    expect(visibleCopy("  Shown on invitations.  ")).toBe(
      "  Shown on invitations.  ",
    );
  });

  it("treats a run of spaces as nothing, not as a line of copy", () => {
    expect(visibleCopy("")).toBeUndefined();
    expect(visibleCopy("   ")).toBeUndefined();
    expect(visibleCopy("\t\n")).toBeUndefined();
    expect(visibleCopy(undefined)).toBeUndefined();
  });

  it("agrees with the name rule about which strings say nothing", () => {
    const samples = ["", " ", "   ", "\t", "a", " a ", "0", "…", undefined];
    expect(
      samples.filter(
        (sample) =>
          (visibleCopy(sample) === undefined) !==
          (accessibleName(sample) === undefined),
      ),
    ).toEqual([]);
  });
});

describe("captionCopy", () => {
  it("falls back to the stored label for a child that says nothing", () => {
    expect(captionCopy("", "Uploading")).toBe("Uploading");
    expect(captionCopy("   ", "Uploading")).toBe("Uploading");

    expect(captionCopy("   ", "  ")).toBeUndefined();
    expect(captionCopy(undefined, "Uploading")).toBe("Uploading");
  });

  it("paints the caller's own text and composed children as given", () => {
    expect(captionCopy("  Saving  ", "Uploading")).toBe("  Saving  ");
    const node = { type: "span" };
    expect(captionCopy(node, "Uploading")).toBe(node);
    expect(captionCopy(0, "Uploading")).toBe(0);
  });
});

describe("spokenText", () => {
  it("says the caller's words, trimmed", () => {
    expect(spokenText(Option.some("42% uploaded"), "42%")).toBe("42% uploaded");
    expect(spokenText(Option.some("  62 GB "), "62")).toBe("62 GB");
  });

  it("keeps the component's words for an answer that says nothing", () => {
    expect(spokenText(Option.some(""), "42%")).toBe("42%");
    expect(spokenText(Option.some("  "), "42%")).toBe("42%");
    expect(spokenText(Option.none(), "42%")).toBe("42%");
  });
});

describe("fieldHelp", () => {
  it("announces the painted hint while the box is empty", () => {
    expect(fieldHelp({ placeholder: "you@example.com" }, "")).toBe(
      "you@example.com",
    );
    expect(fieldHelp({ placeholder: "  Search projects  " }, "")).toBe(
      "Search projects",
    );
  });

  it("keeps a caller's own description, which is the field's permanent help", () => {
    expect(
      fieldHelp(
        {
          description: "Where notifications go.",
          placeholder: "you@example.com",
        },
        "",
      ),
    ).toBe("Where notifications go.");
    expect(
      fieldHelp(
        {
          description: "Where notifications go.",
          placeholder: "you@example.com",
        },
        "ada@example.com",
      ),
    ).toBe("Where notifications go.");
  });

  it("says nothing once the hint is no longer painted", () => {
    expect(
      fieldHelp({ placeholder: "you@example.com" }, "ada@example.com"),
    ).toBe(undefined);
    expect(fieldHelp({}, "")).toBeUndefined();
  });

  it("treats a blank string as no help on either side", () => {
    expect(fieldHelp({ placeholder: "" }, "")).toBeUndefined();
    expect(fieldHelp({ description: "   ", placeholder: "Search" }, "")).toBe(
      "Search",
    );
    expect(fieldHelp({ description: "   " }, "")).toBeUndefined();
  });
});
