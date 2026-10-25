# 713 — Keyring credentials

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | binding (`remorses/gpuix`) |
| Owner | runtime owner |
| Depends on | none |
| Source | `references/fc-gpui` (Apache-2.0) `platform/{mac,linux,windows}/credentials.rs` (fc-gpui), macOS Security.framework; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | storing an API token for a tray app; the auth blocks |

---
## Goal

Store and read a secret in the OS keychain, so an app does not keep it in a file.

## Why

The user asked for it; fc-gpui ships a tested credentials layer.

## Work

- API: `setCredential(service, account, secret)`, `getCredential(service, account)`,
  `deleteCredential(service, account)`; secrets cross the bridge as strings and are
  never logged.
- macOS: Security.framework generic password; Windows: Credential Manager; Linux:
  Secret Service (libsecret) with an "unavailable" result when no daemon.
- Gate reads behind plan 712's biometric check where the caller asks.
- Document that the secret is stored by the OS, not encrypted by the library.

## Tests

- macOS runtime: set → get → delete; a missing account returns `None`; the item
  appears in Keychain Access.
- Rust: the mapping from `errSecItemNotFound` to `None`.

## Acceptance

The example stores a token, reads it after a restart, and deletes it.

## STOP

If libsecret/Secret Service adds a system dependency to the Linux build that the
container lacks, ship macOS/Windows and return `unavailable` on Linux with the
reason.
