# 692 — The platform registry's retyped variant lists

> **Status: executed 2026-10-19.** `PlatformVariant` moved beside `PlatformName`,
> `platformMonos` is typed against it, `knownPlatform` and the fallback derive
> from the registry, and the suites use `platformVariants` plus an
> unknown-platform case. No token value, family, pair, floor or shipped theme
> moves. Execution evidence is at the end of this plan.
>
> **Renumbered from `690`** on 2026-10-19: the `playground` worktree committed
> `690-live-image-source-pixels.md` (still planned) while this plan was being
> executed. A duplicate in the union index is worse than a minute-old rename, so
> this plan moved to the next free number, `692`; its commit message and the
> plan-history note keep the old number.

## Why

`PlatformName` has one owner, `platformNames` in
`packages/tokens/src/platform-types.ts`. Three code sites still retype its
members:

| Site | Current shape | Failure when a platform is added |
| ---- | ------------- | -------------------------------- |
| `knownPlatform(name)` | `name === "darwin" \|\| name === "linux" \|\| name === "win32"` | the new platform resolves to `default`, so a machine running it gets the identity's fallback mono instead of its own family, and no check fails |
| `platformMonos` | three literal keys, unrelated to `PlatformVariant` | the record can gain a stale key or lose a live one without a compile-time relation to the union; only `systemMonoFamily`'s index happens to fail today |
| `platforms.test.ts` `variants` | `["darwin", "linux", "win32"] as const` | the "one installed-mono registry" case would silently skip a fourth styled platform, so the suite would keep claiming full coverage |

The suite already has a case titled *"names every real family from the one
installed-mono registry"*, but it iterates a local copy of the three names. That
is the same defect plans `668`, `673` and `674` closed one index over: a guard
that claims totality while naming its own members.

`fallbackMono = "Menlo"` is a second literal for `platformMonos.darwin`. It is
the same family by intent — the identity's mono was designed on macOS — so the
two must move together; today they can drift.

This is a **maintenance hazard**, recorded by plan `609`'s audit as candidate 1.
No shipped behaviour changes on the three platforms the library knows, so the
plan ships a structural guard, not a palette or contract change.

## Decision

1. Move `PlatformVariant` from `shipped-themes.ts` to `platform-types.ts`, beside
   `PlatformName`, because it is derived from that union. Re-export it from
   `platforms.ts`; `shipped-themes.ts` imports it and stops exporting it, so the
   package still exports the type exactly once (through `platforms`).
2. Type `platformMonos` with
   `as const satisfies Readonly<Record<PlatformVariant, string>>`, so a new
   styled platform cannot land without a family.
3. Derive the fallback: `const fallbackMono = platformMonos.darwin;`.
4. Derive `knownPlatform` through a private `isPlatformVariant` predicate built
   from `platformNames`, with no cast. A name outside the union (including an
   unknown OS, a browser, or the `"default"` sentinel itself) keeps returning
   `"default"`.
5. Replace `platforms.test.ts`'s local `variants` with the package's
   `platformVariants` and add the key-set/coverage case. Extend
   `default-platform.test.ts` with an unknown-platform simulation.

`PlatformVariant` stays part of the public type surface and the docs type table
(`docs/tokens.md` already lists it); no document changes.

## Exact files and changes

### 1. `packages/tokens/src/platform-types.ts`

After `PlatformName`:

```ts
/**
 * A platform that carries its own style: every shipped platform except
 * `default`, which is the identity rather than a fourth look. Derived from
 * {@link PlatformName}, so a new platform joins the styled set by default.
 */
export type PlatformVariant = Exclude<PlatformName, "default">;
```

Replace the untyped record and literal fallback:

```ts
export const platformMonos = {
  darwin: "Menlo",
  linux: "DejaVu Sans Mono",
  win32: "Consolas",
} as const satisfies Readonly<Record<PlatformVariant, string>>;

/** The identity's fallback where the runtime reports no known platform. */
const fallbackMono = platformMonos.darwin;

/**
 * Narrow a runtime platform string to a styled platform. A value the library
 * does not ship — another OS, a browser, or the `default` sentinel — is not a
 * variant.
 */
const isPlatformVariant = (value: string): value is PlatformVariant =>
  platformNames.some(
    (platform) => platform === value && platform !== "default",
  );

const knownPlatform = (name: string): PlatformName =>
  isPlatformVariant(name) ? name : "default";
```

Keep `currentPlatform` and `systemMonoFamily` as they are.

### 2. `packages/tokens/src/platforms.ts`

Add `PlatformVariant` to the type re-export from `./platform-types.js`.
`platformStyles` and `platformTypes` are unchanged: both are
`Record<PlatformName, …>`, so they already force an entry per platform.

### 3. `packages/tokens/src/shipped-themes.ts`

- Import `type PlatformVariant` from `./platform-types.js` beside the
  `platformNames` import.
- Delete the local `export type PlatformVariant = …` declaration and its JSDoc;
  move the JSDoc's sentence ("A platform name that carries its own style…") to
  the new declaration in `platform-types.ts`.
- `platformVariants` stays in this module (the enumeration owner) and keeps its
  current implementation.

### 4. `packages/tokens/src/figures.ts`

Import `type PlatformVariant` from `./platforms.js` (or
`./platform-types.js`) instead of `./shipped-themes.js`; `shippedThemes` and
`type ShippedTheme` stay where they are.

### 5. `packages/tokens/src/platforms.test.ts`

- Import `platformVariants` from `./shipped-themes.js`.
- Delete the local `const variants = [...] as const;` and use
  `platformVariants` in the three cases that iterate it.
- Add, in `describe("platformTypes")`:

```ts
it("names one family for every styled platform, and no other", () => {
  expect(Object.keys(platformMonos).toSorted()).toEqual(
    [...platformVariants].toSorted(),
  );
});
```

The existing "gives each real platform its own monospace family" case keeps its
distinctness assertion. This new case is the guard that can fail: a fourth
styled platform without a `platformMonos` entry, or a stale key, breaks the
equality. (The `satisfies` clause makes the missing-key half a compile error
too; the runtime case covers a JSON/JS consumer of the shipped table.)

### 6. `packages/tokens/src/default-platform.test.ts`

Add one case outside the `describe.each`:

```ts
it("falls back to the identity on a platform the library does not know", async () => {
  simulate("freebsd");
  const { currentPlatform, systemMonoFamily, platformMonos } = await import(
    "./platform-types.js"
  );
  expect(currentPlatform).toBe("default");
  expect(systemMonoFamily).toBe(platformMonos.darwin);
});
```

Change `simulate`'s parameter to `string` (or `NodeJS.Platform`) so the
unknown name is expressible. Keep the existing linux/win32 cases and the
`installedMono` table exactly as they are.

### 7. `TODO.md`

Under *Design tokens and theming*, add one `[x]` row and bump the section
counter by one:

```
`[x]` Give the platform registry one owner for its variant set — `knownPlatform`
retyped `darwin`/`linux`/`win32`, so a fourth platform added to `platformNames`
would silently resolve to the identity's fallback mono, `platformMonos` was not
tied to the union, and the suite's "one installed-mono registry" case iterated
its own local copy of the three names; `PlatformVariant` now lives beside
`PlatformName`, `platformMonos` satisfies a `Record<PlatformVariant, string>`,
`knownPlatform` derives from `platformNames`, and the tests derive the variant
list from `platformVariants` plus an unknown-platform fallback case (plan 692)
```

Also extend the existing repo-tooling uniqueness row with the `689` collision
(`tokens-theme` and `components` both executed a plan `689`) so the record is
current.

### 8. `.agents/slop/plans/README.md`

Add one row to the tokens table:

```
| [692](./692-platform-variant-owner.md) | The platform registry's retyped variant lists | F | 051, 063, 067, 387, 609, 678 | done |
```

Add a short paragraph after the `689` summary naming the fix and stating that no
token value, family, pair, floor or shipped theme moves.

## Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Platform suites | `cd packages/tokens && nub exec vitest run src/platforms.test.ts src/default-platform.test.ts` | pass |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Package suite | `nub run --filter @gpuixui/tokens test` | all files pass |
| Whole gate | `nub run check` | exit 0 |
| Lint/format | `nub run lint` and `nub run fmt` | exit 0 |

## Test plan

- The new key-set case fails if `platformMonos` gains a key with no
  `platformNames` member, or loses one. Prove it by temporarily deleting
  `win32` from the record: `check-types` fails on the `satisfies` clause, and
  restoring the key returns green. Record both runs in the commit message.
- The unknown-platform case fails if `knownPlatform` stops returning
  `"default"` for `"freebsd"` (for example by returning the input). It also
  pins the documented fallback to `platformMonos.darwin`, so moving the macOS
  family moves the fallback.
- The linux/win32 cases already fail if `currentPlatform` stops following a
  simulated host; they are the behavioural half of the derivation.
- No test asserts a shipped colour or family value beyond the existing
  distinctness and registry equality, so no token value can move in this plan.

## Acceptance

- [ ] `knownPlatform` has no literal platform names; it narrows through
      `platformNames`.
- [ ] `platformMonos` is typed against `PlatformVariant`, and the fallback is
      derived from its `darwin` entry.
- [ ] `PlatformVariant` is declared in `platform-types.ts`, exported once
      through `platforms.ts`, and imported by `shipped-themes.ts` and
      `figures.ts`.
- [ ] The platform suites cover every `platformVariants` member without a local
      copy of the names, and an unknown platform falls back to `default`.
- [ ] `nub run check`, `nub run lint` and the tokens suite pass.
- [ ] No token value, colour, pair, floor, family, metric or shipped theme
      changes.

## STOP conditions

- `PlatformVariant` is imported from `./shipped-themes.js` by a file this plan
  did not list → add that import to the plan's file list before editing; do not
  leave a broken import.
- The package entry reports a duplicate export of `PlatformVariant` → keep the
  declaration in `platform-types.ts` and remove the `shipped-themes.ts` export;
  do not add a second re-export.
- The unknown-platform case changes behaviour on the host (`darwin` in this
  worktree) → stop and report; the fallback is only for names outside the union.
- A gate fails for a file this plan did not touch → report the output; do not
  fix another workstream's tree.

## Execution (2026-10-19)

`PlatformVariant` is declared in `src/platform-types.ts` beside `PlatformName` and
re-exported from `src/platforms.ts`; `shipped-themes.ts` imports it for
`platformVariants` and `ShippedTheme` no longer exports a duplicate declaration,
and `figures.ts` imports the type from its new owner. `platformMonos` is
`as const satisfies Readonly<Record<PlatformVariant, string>>`, the identity's
fallback is `platformMonos.darwin`, and `knownPlatform` narrows through a private
`isPlatformVariant` predicate built from `platformNames`.

`platforms.test.ts` imports `platformVariants` instead of a local three-name
copy, and its new `names one family for every styled platform, and no other`
case compares the `platformMonos` key set with `platformVariants`.
`default-platform.test.ts` adds the unknown-platform simulation: `freebsd`
resolves to `currentPlatform === "default"` and `systemMonoFamily ===
platformMonos.darwin`.

**Both directions.** Deleting `win32` from `platformMonos` makes `check-types`
fail on the `satisfies` clause and on the two platform style files that read the
registry; restoring it returns `Done`. The linux/win32 simulated cases fail if
`currentPlatform` stops following the host, so the derivation keeps its
behavioural half.

Gates: `nub run check` exit 0, `nub run lint` exit 0, `nub run test` and
`nub run --filter @gpuixui/tokens test` 193 files / 6742 tests. The suite grew by
the key-set case and the fallback case (6740 → 6742). No token value, family,
colour, pair, floor or shipped theme moves.
