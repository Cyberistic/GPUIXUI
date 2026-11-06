import { describe, expect, it } from "vitest";
import { accessibleName } from "./name.js";

describe("accessibleName", () => {
  it("reads a blank or whitespace-only label as the fallback", () => {
    expect(accessibleName("", "Crop area")).toBe("Crop area");
    expect(accessibleName("   ", "Crop area")).toBe("Crop area");
  });

  it("reads a label it was not given as the fallback", () => {
    expect(accessibleName(undefined, "QR code")).toBe("QR code");
    expect(accessibleName(null, "QR code")).toBe("QR code");
    expect(accessibleName(42, "QR code")).toBe("QR code");
  });

  it("publishes the label it was given without its padding", () => {
    expect(accessibleName("  Thumbnail  ", "Crop area")).toBe("Thumbnail");
    expect(accessibleName("Retry", "Retry")).toBe("Retry");
  });
});
