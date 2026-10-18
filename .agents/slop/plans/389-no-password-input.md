# 389 — `Input` must state that it cannot collect a secret

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (docs truth; security) |
| Owner | primitives workstream |
| Depends on | `025`, `030`, `040`, `047`, `074`, `093` |
| Evidence | playground plan `188` §9, its `TODO.md` hand-off |

## 1. The gap

GPUix 0.10.0's `<input>` has no `type` and no secure-entry flag: the runtime
paints and announces every typed character in clear. Playground plan `188` §9
measured this while probing text entry, and its hand-off row asks primitives to
**not** ship a `PasswordInput` and to document the limitation on the `Input`
page (owner: primitives).

The page's current Limitations list says "No masks, formatting or prefix/suffix
slots", which names the missing decoration but not the consequence: a caller
could reasonably read it as "a password field is a future variant". It is not —
a typed secret would be visible on screen and in the accessibility tree.

## 2. The change

Documentation only, no new component:

- `packages/primitives/docs/input.mdx` — replace the "No masks" bullet with a
  security-shaped limitation:
  - 0.10.0 has no `type`/`secureTextEntry`/masking surface, so a value is
    painted and announced verbatim;
  - do not collect a password, API key or token in `Input`;
  - the honest routes are an OS credential prompt (keychain/password manager)
    resolved by the application, or a secret loaded from configuration — pass
    the resolved secret programmatically, never through this field;
  - no `PasswordInput` will ship until the runtime provides a masking surface.
- `COMPONENTS.md` — append the same one-line limitation to the **Text inputs**
  row so the inventory says it too.
- `TODO.md` — tick the primitives hand-off row.
- `.agents/slop/plans/README.md` — index this plan.

No code, test or example changes: the behaviour is correct (a plain text field);
the defect is a missing truthful statement, and inventing a test that asserts a
sentence is present would be the tautology AGENTS §3 rejects. The docs-coverage
guard (plan `074`) already proves the page exists and is indexed.

## 3. STOP conditions

1. A masking surface exists in the installed `@gpuix/react` 0.10.0 host props
   (search `secure`, `password`, `mask`, `type` in `host.d.ts`). If it does,
   stop and re-plan a real `PasswordInput` instead of documenting a limitation.
2. An existing docs page already states this limitation. Then only the inventory
   row and TODO need the cross-reference; do not duplicate the paragraph.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `grep -n "secure\\|password\\|mask" node_modules/.store/@gpuix+native@0.10.0/node_modules/@gpuix/native/dist/host.d.ts` | no masking prop; `InputProps` is `value`, `placeholder`, `readOnly`, `theme` (measured) |
| `nub run --filter @gpuixui/primitives test` | unchanged, all pass (docs are not executed; the coverage guard still sees the page) |
| `nub run check` | exit `0` |

## 5. Acceptance

- The `Input` page states the limitation, the consequence and the alternatives,
  in the caller's terms.
- The inventory row and `TODO.md` record it.
- No `PasswordInput` export exists.
- Gates green; committed on `agent/primitives` and pushed.

## 6. Results (2026-10-18)

**Measured before writing** — `host.d.ts` in the installed
`@gpuix/native@0.10.0`:

```ts
export interface InputProps extends HostProps {
    value?: string;
    placeholder?: string;
    readOnly?: boolean;
    theme?: GpuixTheme;
}
```

No `type`, `secureTextEntry`, `mask` or password prop exists. The only `mask`
grep hit is `"linear-gradient"`'s unrelated `type`, and `@gpuix/react` has no
such export either.

**Changed** — `packages/primitives/docs/input.mdx` gained a security-shaped
limitation bullet (consequence, prohibition and the OS-credential/configuration
routes); `COMPONENTS.md`'s Text inputs row records the same; `TODO.md` ticks the
playground hand-off. No code, export, test or example changed, because the
behaviour is a correct plain field — the defect was the missing statement.

**Runs** — `nub run check` exit `0` (check-tests, lint, format, all workspace
type checks); `nub run --filter @gpuixui/primitives test` stays at 47 files /
679 tests.

