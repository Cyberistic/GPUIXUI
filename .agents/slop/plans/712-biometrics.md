# 712 — Biometric unlock

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | binding (`remorses/gpuix`) |
| Owner | runtime owner |
| Depends on | 713 (the secret store it unlocks) |
| Source | `references/fc-gpui` (Apache-2.0) fc-gpui biometrics backend (macOS `LocalAuthentication`); upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | an auth surface for a tray app |

---
## Goal

Ask the OS to authenticate the user (Touch ID / Windows Hello) before an action.

## Why

The user asked for it; it is the honest gate in front of a keyring read.

## Work

- API: `authenticateBiometric(reason) -> "success" | "cancelled" | "unavailable"`,
  with the reason shown in the OS prompt.
- macOS: `LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)`.
- Windows: `UserConsentVerifier`; Linux: unsupported unless a PAM/portal path is
  measured — return `unavailable`.
- Binding + a React helper; no hook (the result is an action, not state).

## Tests

- macOS runtime: a successful evaluation on this Mac (the user must touch the
  sensor) and a cancel path; the unavailable path is simulated by passing an empty
  reason? No — by a build without biometrics (unit test on the mapping).
- Rust: the policy result maps to the three states.

## Acceptance

The example gates a keyring read behind Touch ID; cancelling reports `cancelled`.

## STOP

If evaluating needs a foreground app with a specific activation policy, document
it and gate the example behind a manual step.
