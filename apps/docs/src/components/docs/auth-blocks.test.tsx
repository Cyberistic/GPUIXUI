import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ForgotPasswordRender,
  LoginRender,
  OtpRender,
  SignupRender,
  loginFeedback,
  otpFeedback,
  resetFeedback,
  signupFeedback,
} from "./auth-blocks";

/**
 * The auth blocks.
 *
 * The previews are illustrations, but every control a reader is told to look
 * for has to reach the markup: the forgot-password and sign-up links, both
 * OAuth buttons, the terms checkbox, six code cells and the reserved status
 * row. The validation tables are the rules behind the states; a missing check
 * would make the preview succeed on input the real form must refuse.
 */

const text = (markup: string): string =>
  markup
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

describe("login block", () => {
  const markup = renderToStaticMarkup(<LoginRender />);

  it("prints the fields, the reset link, both providers and the sign-up footer", () => {
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain('href="/docs/blocks/forgot-password"');
    expect(markup).toContain('href="/docs/blocks/signup"');
    expect(markup).toContain("GitHub");
    expect(markup).toContain("Google");
    expect(text(markup)).toContain("Don't have an account?");
  });

  it("opens with a live status row, so a state never moves the card", () => {
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('class="gx-auth-status"');
  });

  it("refuses an empty or malformed submission and accepts a real one", () => {
    expect(loginFeedback({ email: "", password: "" })).toEqual({
      phase: "error",
      message: "Enter your email and password.",
    });
    expect(loginFeedback({ email: "nope", password: "secret" })).toEqual({
      phase: "error",
      message: "Enter a valid email address.",
    });
    expect(
      loginFeedback({ email: "ada@example.com", password: "secret" }).phase,
    ).toBe("success");
  });
});

describe("signup block", () => {
  const markup = renderToStaticMarkup(<SignupRender />);

  it("prints every field, the terms checkbox and the sign-in footer", () => {
    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="confirm"');
    expect(markup).toContain('name="terms"');
    expect(markup).toContain('value="accepted"');
    expect(markup).toContain('href="/docs/blocks/login"');
    expect(text(markup)).toContain("Already have an account?");
  });

  it("refuses a missing field, a short password, a mismatch and unticked terms", () => {
    const valid = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "analytical",
      confirm: "analytical",
      terms: true,
    };

    expect(signupFeedback({ ...valid, name: "" }).message).toBe(
      "Fill in every field.",
    );
    expect(
      signupFeedback({ ...valid, password: "short", confirm: "short" }).message,
    ).toBe("Use at least eight characters.");
    expect(signupFeedback({ ...valid, confirm: "different" }).message).toBe(
      "The passwords do not match.",
    );
    expect(signupFeedback({ ...valid, terms: false }).message).toBe(
      "Accept the terms to create an account.",
    );
    expect(signupFeedback(valid).phase).toBe("success");
  });
});

describe("forgot-password block", () => {
  const markup = renderToStaticMarkup(<ForgotPasswordRender />);

  it("prints one email field, the send action and the way back", () => {
    expect(markup).toContain('name="email"');
    expect(markup).toContain("Send reset link");
    expect(text(markup)).toContain("Back to sign in");
    expect(markup).toContain('href="/docs/blocks/login"');
  });

  it("names the address the note was sent to", () => {
    expect(resetFeedback({ email: "" }).phase).toBe("error");
    expect(resetFeedback({ email: "nope" }).phase).toBe("error");
    expect(resetFeedback({ email: "ada@example.com" })).toEqual({
      phase: "success",
      message: "Reset link sent to ada@example.com.",
    });
  });
});

describe("one-time code block", () => {
  const markup = renderToStaticMarkup(<OtpRender />);

  it("prints six cells, the verify action and the resend countdown", () => {
    expect(markup.match(/class="gx-otp-cell"/g) ?? []).toHaveLength(6);
    expect(markup).toContain("Verify");
    expect(markup).toContain("Resend in 30s");
    expect(markup).toContain("Use 123456 in the preview.");
  });

  it("asks for the missing digits, then rejects a code that does not match", () => {
    expect(otpFeedback("12").message).toBe("Enter all six digits.");
    expect(otpFeedback("000000")).toEqual({
      phase: "error",
      message: "The code does not match.",
    });
    expect(otpFeedback("123456").phase).toBe("success");
  });
});
