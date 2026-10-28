import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ForgotPasswordRender,
  LoginRender,
  OtpRender,
  SignInPageRender,
  SignupRender,
  loginFeedback,
  otpFeedback,
  resetFeedback,
  signInPageFeedback,
  signupFeedback,
} from "./auth-blocks";
import { blockList } from "./blocks";

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

const css = readFileSync(
  new URL("../../styles/blocks.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the style sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("login block", () => {
  const markup = renderToStaticMarkup(<LoginRender />);

  it("prints the fields, the reset link, both providers and the sign-up footer", () => {
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain('href="/docs/components/auth#forgot-password"');
    expect(markup).toContain('href="/docs/components/auth#sign-up"');
    expect(markup).toContain("GitHub");
    expect(markup).toContain("Google");
    expect(text(markup)).toContain("Don't have an account?");
  });

  it("opens with a live status row that paints only when it has words", () => {
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('class="gx-auth-status"');
  });

  it("opens on the reference's heading and sentence, with no mark", () => {
    // The card is the reference the page was asked to reproduce: the head is
    // the title and one sentence, and a site mark above the form was neither
    // part of it nor part of the shipped `CardHeader`.
    expect(markup).toContain(
      '<h3 class="gx-auth-title">Login to your account</h3>',
    );
    expect(markup).toContain(
      '<p class="gx-auth-desc">Enter your email below to login to your account</p>',
    );
    expect(markup).not.toContain("gx-auth-mark");
    expect(markup).not.toContain(">Sign in</h3>");
  });

  it("labels its fields as the shipped Field does, on a divider", () => {
    // The preview painted each label as a 10px uppercase mono eyebrow; the
    // shipped `FieldLabel` is 14px medium sans in the body role, so the drawing
    // now names the control rather than annotating a diagram.
    expect(markup).toContain('class="gx-auth-label"');
    expect(markup).not.toContain("gx-block-label");
    expect(markup).toContain('class="gx-auth-divider"');
    expect(rule(".gx-auth-label")).toContain("font-size: 14px");
    expect(rule(".gx-auth-label")).not.toContain("text-transform");
    expect(rule(".gx-auth-card")).toContain("gap: 14px");
    // At rest the reserved note is absent, so the primary action and the
    // divider are not separated by an empty row.
    expect(rule(".gx-auth-status:empty")).toContain("display: none");
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
    expect(markup).toContain('href="/docs/components/auth#sign-in"');
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
    expect(markup).toContain('href="/docs/components/auth#sign-in"');
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
    expect(markup.match(/name="code-[1-6]"/g) ?? []).toHaveLength(6);
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

describe("the sign-in page", () => {
  const markup = renderToStaticMarkup(<SignInPageRender />);

  it("lays out a navbar over a form column and the quote panel", () => {
    expect(markup).toContain("gx-auth-page-nav");
    expect(markup).toContain("gx-auth-page-body");
    expect(markup).toContain("gx-auth-page-aside");
    expect(markup).toContain('href="/#features"');
    expect(markup).toContain('href="/#pricing"');
    expect(markup).toContain('href="/docs"');
    expect(text(markup)).toContain("The same components, one theme away.");
  });

  it("prints the whole form, the providers and the account footer", () => {
    expect(text(markup)).toContain("Welcome back");
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain('name="remember"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="Show password"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('href="/docs/components/auth#forgot-password"');
    expect(markup).toContain('href="/docs/components/auth#sign-up"');
    expect(text(markup)).toContain("GitHub");
    expect(text(markup)).toContain("Google");
    expect(text(markup)).toContain("New here?");
  });

  it("reserves the status row and names the demo credentials at rest", () => {
    expect(markup).toContain('aria-live="polite"');
    expect(text(markup)).toContain(
      "Preview: use ada@example.com and analytical.",
    );
  });

  it("refuses an empty, malformed or wrong submission and accepts the demo one", () => {
    expect(signInPageFeedback({ email: "", password: "" })).toEqual({
      phase: "error",
      message: "Enter your email and password.",
    });
    expect(
      signInPageFeedback({ email: "nope", password: "analytical" }).phase,
    ).toBe("error");
    expect(
      signInPageFeedback({ email: "ada@example.com", password: "wrong" }),
    ).toEqual({
      phase: "error",
      message: "Those credentials do not match an account.",
    });
    expect(
      signInPageFeedback({ email: "ada@example.com", password: "analytical" })
        .phase,
    ).toBe("success");
  });
});

describe("the auth surface's placement", () => {
  it("keeps one auth entry in Blocks, and it is the full page", () => {
    // The `fullBleed` flag this case read is gone with the preview frame: every
    // block page now paints its scene at the column's width, so "fills the
    // preview" is no longer a per-block choice. What makes the sign-in entry a
    // page is its own markup — navbar, body, quote panel — which the render
    // check below holds; the registry keeps exactly one auth entry beside the
    // auth cards on `/docs/components/auth`.
    const auth = blockList.filter((block) =>
      ["login", "signup", "forgot-password", "otp", "sign-in"].includes(
        block.slug,
      ),
    );

    expect(auth.map((block) => block.slug)).toEqual(["sign-in"]);
    expect(renderToStaticMarkup(<SignInPageRender />)).toContain(
      '<div class="gx-auth-page">',
    );
  });
});
