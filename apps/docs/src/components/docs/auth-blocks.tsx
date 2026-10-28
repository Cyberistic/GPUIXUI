import { useEffect, useId, useRef, useState } from "react";

/**
 * The auth examples — browser reproductions and `@gpuixui/*` recipes for
 * sign-in, sign-up, password reset and one-time-code cards — and the full
 * sign-in page the Blocks lane ships.
 *
 * Each reproduction owns only the state a reader can watch: a submission walks
 * idle → loading → success or error, the code cells take focus and typing, and
 * the resend countdown ticks. The card reserves its status row, so a state
 * never moves the layout.
 */

type Phase = "idle" | "loading" | "success" | "error";

interface Feedback {
  readonly phase: "success" | "error";
  readonly message: string;
}

/** How long a submission spends in the loading state before it resolves. */
const REVEAL_MS = 700;

/** The code the preview accepts, so the error state is reachable too. */
const PREVIEW_CODE = "123456";

const RESEND_SECONDS = 30;

const useSubmission = <Payload,>(check: (payload: Payload) => Feedback) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = (payload: Payload) => {
    setPhase("loading");
    setMessage("");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const feedback = check(payload);
      setPhase(feedback.phase);
      setMessage(feedback.message);
    }, REVEAL_MS);
  };

  const reset = (notice = "") => {
    clearTimeout(timer.current);
    setPhase("idle");
    setMessage(notice);
  };

  return { phase, message, submit, reset };
};

const toneOf = (phase: Phase): "muted" | "success" | "error" =>
  phase === "success" ? "success" : phase === "error" ? "error" : "muted";

const AuthStatus = ({
  phase,
  message,
}: {
  readonly phase: Phase;
  readonly message: string;
}) => (
  <p
    aria-live="polite"
    className="gx-auth-status"
    data-tone={toneOf(phase)}
    role="status"
  >
    {message}
  </p>
);

const AuthField = ({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
}: {
  readonly label: string;
  readonly name: string;
  readonly type?: "email" | "password" | "text";
  readonly placeholder?: string;
  readonly autoComplete?: string;
}) => {
  const id = useId();

  return (
    <div className="gx-auth-field">
      <label className="gx-auth-label" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="gx-field gx-auth-input"
        id={id}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
};

/** The site mark, on its own tile: the card opens with a mark, not a favicon. */
const AuthMark = () => (
  <span aria-hidden="true" className="gx-auth-mark">
    <span className="gx-mark gx-auth-mark-glyph" />
  </span>
);

const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const readField = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};

interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

export const loginFeedback = ({ email, password }: LoginPayload): Feedback => {
  if (email === "" || password === "") {
    return { phase: "error", message: "Enter your email and password." };
  }
  if (!isEmail(email)) {
    return { phase: "error", message: "Enter a valid email address." };
  }
  return {
    phase: "success",
    message: "Signed in. Taking you to your workspace…",
  };
};

export const LoginRender = () => {
  const { phase, message, submit } = useSubmission(loginFeedback);

  return (
    <div className="gx-auth">
      <form
        className="gx-auth-card"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          submit({
            email: readField(data, "email"),
            password: readField(data, "password"),
          });
        }}
      >
        <div className="gx-auth-head">
          <h3 className="gx-auth-title">Login to your account</h3>
          <p className="gx-auth-desc">
            Enter your email below to login to your account
          </p>
        </div>
        <AuthField
          autoComplete="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
        <AuthField
          autoComplete="current-password"
          label="Password"
          name="password"
          placeholder="••••••••"
          type="password"
        />
        <div className="gx-auth-between">
          <a
            className="gx-auth-link"
            href="/docs/components/auth#forgot-password"
          >
            Forgot password?
          </a>
        </div>
        <button
          className="gx-btn gx-btn-primary gx-auth-submit"
          disabled={phase === "loading"}
          type="submit"
        >
          {phase === "loading" ? "Signing in…" : "Sign in"}
        </button>
        <AuthStatus message={message} phase={phase} />
        <div className="gx-auth-divider">or continue with</div>
        <div className="gx-auth-oauth">
          <button className="gx-btn gx-btn-secondary" type="button">
            GitHub
          </button>
          <button className="gx-btn gx-btn-secondary" type="button">
            Google
          </button>
        </div>
        <p className="gx-auth-footer">
          Don't have an account?{" "}
          <a className="gx-auth-link" href="/docs/components/auth#sign-up">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
};

interface SignupPayload {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly confirm: string;
  readonly terms: boolean;
}

export const signupFeedback = ({
  name,
  email,
  password,
  confirm,
  terms,
}: SignupPayload): Feedback => {
  if (name === "" || email === "" || password === "" || confirm === "") {
    return { phase: "error", message: "Fill in every field." };
  }
  if (!isEmail(email)) {
    return { phase: "error", message: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { phase: "error", message: "Use at least eight characters." };
  }
  if (password !== confirm) {
    return { phase: "error", message: "The passwords do not match." };
  }
  if (!terms) {
    return {
      phase: "error",
      message: "Accept the terms to create an account.",
    };
  }
  return {
    phase: "success",
    message: "Account created. Check your inbox to verify.",
  };
};

export const SignupRender = () => {
  const { phase, message, submit } = useSubmission(signupFeedback);

  return (
    <div className="gx-auth">
      <form
        className="gx-auth-card"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          submit({
            name: readField(data, "name"),
            email: readField(data, "email"),
            password: readField(data, "password"),
            confirm: readField(data, "confirm"),
            terms: readField(data, "terms") === "accepted",
          });
        }}
      >
        <div className="gx-auth-head">
          <AuthMark />
          <h3 className="gx-auth-title">Create your account</h3>
          <p className="gx-auth-desc">
            Start with the free plan. No card required.
          </p>
        </div>
        <AuthField
          autoComplete="name"
          label="Name"
          name="name"
          placeholder="Ada Lovelace"
        />
        <AuthField
          autoComplete="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
        <AuthField
          autoComplete="new-password"
          label="Password"
          name="password"
          placeholder="At least eight characters"
          type="password"
        />
        <AuthField
          autoComplete="new-password"
          label="Confirm password"
          name="confirm"
          placeholder="Repeat your password"
          type="password"
        />
        <label className="gx-auth-terms">
          <input
            className="sr-only gx-auth-check-input"
            name="terms"
            type="checkbox"
            value="accepted"
          />
          <span aria-hidden="true" className="gx-auth-check" />
          <span>I agree to the terms of service and privacy policy.</span>
        </label>
        <button
          className="gx-btn gx-btn-primary gx-auth-submit"
          disabled={phase === "loading"}
          type="submit"
        >
          {phase === "loading" ? "Creating account…" : "Create account"}
        </button>
        <AuthStatus message={message} phase={phase} />
        <p className="gx-auth-footer">
          Already have an account?{" "}
          <a className="gx-auth-link" href="/docs/components/auth#sign-in">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
};

interface ResetPayload {
  readonly email: string;
}

export const resetFeedback = ({ email }: ResetPayload): Feedback => {
  if (email === "") {
    return { phase: "error", message: "Enter the email on your account." };
  }
  if (!isEmail(email)) {
    return { phase: "error", message: "Enter a valid email address." };
  }
  return { phase: "success", message: `Reset link sent to ${email}.` };
};

export const ForgotPasswordRender = () => {
  const { phase, message, submit } = useSubmission(resetFeedback);

  return (
    <div className="gx-auth">
      <form
        className="gx-auth-card"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          submit({ email: readField(data, "email") });
        }}
      >
        <div className="gx-auth-head">
          <AuthMark />
          <h3 className="gx-auth-title">Reset your password</h3>
          <p className="gx-auth-desc">
            Enter the email on your account and we'll send a reset link.
          </p>
        </div>
        <AuthField
          autoComplete="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
        <button
          className="gx-btn gx-btn-primary gx-auth-submit"
          disabled={phase === "loading"}
          type="submit"
        >
          {phase === "loading" ? "Sending link…" : "Send reset link"}
        </button>
        <AuthStatus message={message} phase={phase} />
        <p className="gx-auth-footer">
          <a className="gx-auth-link" href="/docs/components/auth#sign-in">
            Back to sign in
          </a>
        </p>
      </form>
    </div>
  );
};

export const otpFeedback = (code: string): Feedback => {
  if (code.length < 6) {
    return { phase: "error", message: "Enter all six digits." };
  }
  if (code !== PREVIEW_CODE) {
    return { phase: "error", message: "The code does not match." };
  }
  return { phase: "success", message: "Code verified. Continuing…" };
};

const emptyDigits = (): ReadonlyArray<string> => ["", "", "", "", "", ""];

export const OtpRender = () => {
  const { phase, message, submit, reset } = useSubmission(otpFeedback);
  const [digits, setDigits] = useState<ReadonlyArray<string>>(emptyDigits);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const cells = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const setDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigits((current) =>
      current.map((value, at) => (at === index ? digit : value)),
    );
    if (digit !== "") cells.current[index + 1]?.focus();
  };

  const resend = () => {
    setDigits(emptyDigits());
    setSeconds(RESEND_SECONDS);
    reset("A new code is on its way.");
    cells.current[0]?.focus();
  };

  return (
    <div className="gx-auth">
      <div className="gx-auth-card">
        <div className="gx-auth-head">
          <AuthMark />
          <h3 className="gx-auth-title">Check your email</h3>
          <p className="gx-auth-desc">
            Enter the six-digit code we sent to you@example.com.
          </p>
        </div>
        <div
          aria-label="Verification code"
          className="gx-otp gx-auth-otp"
          role="group"
        >
          {digits.map((digit, index) => (
            <input
              aria-invalid={phase === "error"}
              aria-label={`Verification code digit ${index + 1}`}
              className="gx-otp-cell"
              data-invalid={phase === "error" ? "" : undefined}
              inputMode="numeric"
              key={index}
              maxLength={1}
              name={`code-${index + 1}`}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && digit === "" && index > 0) {
                  event.preventDefault();
                  cells.current[index - 1]?.focus();
                }
              }}
              ref={(element) => {
                cells.current[index] = element;
              }}
              value={digit}
            />
          ))}
        </div>
        <p className="gx-auth-hint">Use {PREVIEW_CODE} in the preview.</p>
        <button
          className="gx-btn gx-btn-primary gx-auth-submit"
          disabled={phase === "loading"}
          onClick={() => submit(digits.join(""))}
          type="button"
        >
          {phase === "loading" ? "Verifying…" : "Verify"}
        </button>
        <AuthStatus message={message} phase={phase} />
        <p className="gx-auth-resend">
          Didn't get a code?{" "}
          <button
            className="gx-auth-link"
            disabled={seconds > 0}
            onClick={resend}
            type="button"
          >
            {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
          </button>
        </p>
      </div>
    </div>
  );
};

/**
 * The demo credentials the sign-in page accepts, printed in its status row at
 * rest so a reader can reach the error and success states.
 */
const PAGE_EMAIL = "ada@example.com";
const PAGE_PASSWORD = "analytical";

interface PagePayload {
  readonly email: string;
  readonly password: string;
}

export const signInPageFeedback = ({
  email,
  password,
}: PagePayload): Feedback => {
  if (email === "" || password === "") {
    return { phase: "error", message: "Enter your email and password." };
  }
  if (!isEmail(email)) {
    return { phase: "error", message: "Enter a valid email address." };
  }
  if (email !== PAGE_EMAIL || password !== PAGE_PASSWORD) {
    return {
      phase: "error",
      message: "Those credentials do not match an account.",
    };
  }
  return {
    phase: "success",
    message: "Signed in. Opening your workspace…",
  };
};

export const SignInPageRender = () => {
  const { phase, message, submit } = useSubmission(signInPageFeedback);
  const [revealed, setRevealed] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  return (
    <div className="gx-auth-page">
      <header className="gx-auth-page-nav">
        <a className="gx-auth-page-brand" href="/">
          <span aria-hidden="true" className="gx-mark gx-auth-page-mark" />
          <span>GPUIxUI</span>
        </a>
        <nav aria-label="Primary" className="gx-auth-page-links">
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
          <a href="/docs">Docs</a>
        </nav>
        <button className="gx-btn gx-btn-ghost" type="button">
          Sign in
        </button>
      </header>
      <div className="gx-auth-page-body">
        <div className="gx-auth-page-form">
          <form
            className="gx-auth-page-card"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              submit({
                email: readField(data, "email"),
                password: readField(data, "password"),
              });
            }}
          >
            <div className="gx-auth-page-head">
              <h3 className="gx-auth-page-title">Welcome back</h3>
              <p className="gx-auth-page-desc">
                Sign in to your workspace and pick up where you left off.
              </p>
            </div>
            <div className="gx-auth-field">
              <label className="gx-block-label" htmlFor={emailId}>
                Email
              </label>
              <input
                autoComplete="email"
                className="gx-field gx-auth-input"
                id={emailId}
                name="email"
                placeholder="you@example.com"
                type="email"
              />
            </div>
            <div className="gx-auth-field">
              <label className="gx-block-label" htmlFor={passwordId}>
                Password
              </label>
              <div className="gx-auth-page-password">
                <input
                  autoComplete="current-password"
                  className="gx-field gx-auth-input"
                  id={passwordId}
                  name="password"
                  placeholder="••••••••"
                  type={revealed ? "text" : "password"}
                />
                <button
                  aria-label={revealed ? "Hide password" : "Show password"}
                  aria-pressed={revealed}
                  className="gx-auth-page-toggle"
                  onClick={() => setRevealed((shown) => !shown)}
                  type="button"
                >
                  {revealed ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="gx-auth-page-meta">
              <label className="gx-auth-page-remember">
                <input
                  className="sr-only gx-auth-check-input"
                  name="remember"
                  type="checkbox"
                  value="yes"
                />
                <span aria-hidden="true" className="gx-auth-check" />
                <span>Remember me</span>
              </label>
              <a
                className="gx-auth-link"
                href="/docs/components/auth#forgot-password"
              >
                Forgot password?
              </a>
            </div>
            <button
              className="gx-btn gx-btn-primary gx-auth-submit"
              disabled={phase === "loading"}
              type="submit"
            >
              {phase === "loading" ? "Signing in…" : "Sign in"}
            </button>
            <div className="gx-block-divider">or</div>
            <div className="gx-auth-page-oauth">
              <button className="gx-btn gx-btn-outline" type="button">
                GitHub
              </button>
              <button className="gx-btn gx-btn-outline" type="button">
                Google
              </button>
            </div>
            <AuthStatus
              message={
                message === ""
                  ? `Preview: use ${PAGE_EMAIL} and ${PAGE_PASSWORD}.`
                  : message
              }
              phase={phase}
            />
            <p className="gx-auth-footer">
              New here?{" "}
              <a className="gx-auth-link" href="/docs/components/auth#sign-up">
                Create an account
              </a>
            </p>
          </form>
        </div>
        <aside aria-label="About GPUIxUI" className="gx-auth-page-aside">
          <figure className="gx-auth-page-quote">
            <blockquote className="gx-auth-page-quote-text">
              One page, every platform — the controls, the palette and the type
              all arrive from the theme.
            </blockquote>
            <figcaption className="gx-auth-page-quote-by">
              The same components, one theme away.
            </figcaption>
          </figure>
        </aside>
      </div>
    </div>
  );
};

const loginSource = `import { Button, Input, Label, Separator, Stack, Text } from "@gpuixui/primitives";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";

export function LoginPage() {
  return (
    <Stack direction="column" gap="xl" align="center" style={{ padding: 48 }}>
      <Card variant="outline" style={{ width: 400 }}>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <Label>Email</Label>
            <Input label="Email" placeholder="you@example.com" fullWidth />
            <Label>Password</Label>
            <Input label="Password" placeholder="••••••••" fullWidth />
            <Button variant="link" onActivate={forgotPassword}>Forgot password?</Button>
            <Button variant="primary" fullWidth loading={busy} onActivate={signIn}>
              Sign in
            </Button>
            <Separator label="or continue with" />
            <Button variant="secondary" fullWidth onActivate={signInWithGitHub}>
              GitHub
            </Button>
            <Button variant="secondary" fullWidth onActivate={signInWithGoogle}>
              Google
            </Button>
          </Stack>
        </CardContent>
        <CardFooter>
          <Text role="caption" tone="muted">Don't have an account?</Text>
          <Button variant="link" onActivate={openSignUp}>Sign up</Button>
        </CardFooter>
      </Card>
    </Stack>
  );
}`;

const signupSource = `import { Button, Checkbox, Input, Label, Stack, Text } from "@gpuixui/primitives";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";

export function SignupPage() {
  return (
    <Stack direction="column" gap="xl" align="center" style={{ padding: 48 }}>
      <Card variant="outline" style={{ width: 400 }}>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start with the free plan. No card required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <Label>Name</Label>
            <Input label="Name" placeholder="Ada Lovelace" fullWidth />
            <Label>Email</Label>
            <Input label="Email" placeholder="you@example.com" fullWidth />
            <Label>Password</Label>
            <Input label="Password" placeholder="At least eight characters" fullWidth />
            <Label>Confirm password</Label>
            <Input label="Confirm password" placeholder="Repeat your password" fullWidth />
            <Checkbox label="I agree to the terms of service and privacy policy" />
            <Button variant="primary" fullWidth loading={busy} onActivate={createAccount}>
              Create account
            </Button>
          </Stack>
        </CardContent>
        <CardFooter>
          <Text role="caption" tone="muted">Already have an account?</Text>
          <Button variant="link" onActivate={openSignIn}>Sign in</Button>
        </CardFooter>
      </Card>
    </Stack>
  );
}`;

const forgotPasswordSource = `import { Button, Input, Label, Stack, Text } from "@gpuixui/primitives";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";
import { useState } from "react";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <Stack direction="column" gap="xl" align="center" style={{ padding: 48 }}>
      <Card variant="outline" style={{ width: 400 }}>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter the email on your account and we'll send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <Label>Email</Label>
            <Input label="Email" placeholder="you@example.com" fullWidth />
            <Button variant="primary" fullWidth loading={busy} onActivate={sendResetLink}>
              Send reset link
            </Button>
            {sent ? (
              <Text role="caption" tone="muted">
                Reset link sent. Check your inbox.
              </Text>
            ) : null}
          </Stack>
        </CardContent>
        <CardFooter>
          <Button variant="link" onActivate={openSignIn}>Back to sign in</Button>
        </CardFooter>
      </Card>
    </Stack>
  );
}`;

const otpSource = `import { Button, OTPField, Stack, Text } from "@gpuixui/primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gpuixui/components/card";
import { useEffect, useState } from "react";

export function OtpPage() {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const verify = (value: string) => {
    if (value !== "123456") {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    openDashboard();
  };

  return (
    <Stack direction="column" gap="xl" align="center" style={{ padding: 48 }}>
      <Card variant="outline" style={{ width: 400 }}>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>Enter the six-digit code we sent you.</CardDescription>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <OTPField
              label="Verification code"
              value={code}
              onValueChange={setCode}
              onComplete={verify}
              invalid={invalid}
            />
            {invalid ? (
              <Text role="caption" tone="destructive">
                The code does not match.
              </Text>
            ) : null}
            <Button variant="primary" fullWidth onActivate={() => verify(code)}>
              Verify
            </Button>
            <Button variant="ghost" disabled={seconds > 0} onActivate={resendCode}>
              {seconds > 0 ? "Resend in " + seconds + "s" : "Resend code"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}`;

const signInPageSource = `import { Button, Checkbox, Input, Label, Separator, Stack, Text } from "@gpuixui/primitives";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";
import { useState } from "react";

export function SignInPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = () => {
    setBusy(true);
    setError("");
    authenticate({ email, password })
      .catch((failure) => setError(failure.message))
      .finally(() => setBusy(false));
  };

  return (
    <Stack direction="column" fullHeight>
      <Stack direction="row" align="center" justify="between" style={{ padding: 20 }}>
        <Stack direction="row" align="center" gap="sm">
          <div className="size-5 bg-primary" />
          <Text role="label">GPUIxUI</Text>
        </Stack>
        <Stack direction="row" align="center" gap="lg">
          <Button variant="ghost" onActivate={openFeatures}>Features</Button>
          <Button variant="ghost" onActivate={openPricing}>Pricing</Button>
          <Button variant="ghost" onActivate={openDocs}>Docs</Button>
          <Button variant="ghost" onActivate={close}>Sign in</Button>
        </Stack>
      </Stack>
      <Stack direction="row" grow>
        <Stack direction="column" align="center" justify="center" grow>
          <Card variant="outline" style={{ width: 360 }}>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>
                Sign in to your workspace and pick up where you left off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                <Label>Email</Label>
                <Input label="Email" placeholder="you@example.com" fullWidth />
                <Label>Password</Label>
                <Input label="Password" placeholder="••••••••" fullWidth />
                <Stack direction="row" justify="between" align="center">
                  <Checkbox label="Remember me" />
                  <Button variant="link" onActivate={openReset}>Forgot password?</Button>
                </Stack>
                <Button variant="primary" fullWidth loading={busy} onActivate={signIn}>
                  Sign in
                </Button>
                {error ? (
                  <Text role="caption" tone="destructive">{error}</Text>
                ) : null}
                <Separator label="or" />
                <Stack direction="row" gap="sm">
                  <Button variant="outline" onActivate={signInWithGitHub}>GitHub</Button>
                  <Button variant="outline" onActivate={signInWithGoogle}>Google</Button>
                </Stack>
              </Stack>
            </CardContent>
            <CardFooter>
              <Text role="caption" tone="muted">New here?</Text>
              <Button variant="link" onActivate={openSignUp}>Create an account</Button>
            </CardFooter>
          </Card>
        </Stack>
        <Stack direction="column" justify="end" grow style={{ padding: 40 }}>
          <Text role="label">One page, every platform.</Text>
          <Text role="caption" tone="muted">The same components, one theme away.</Text>
        </Stack>
      </Stack>
    </Stack>
  );
}`;

export {
  forgotPasswordSource,
  loginSource,
  otpSource,
  signInPageSource,
  signupSource,
};
