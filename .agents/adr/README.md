# Architecture Decision Records

One file per structural decision: `NNNN-kebab-title.md`, numbered in the order
the decisions were accepted. `PLAN.md` §4 is the index of decisions; an ADR is
written when a decision is structural enough that a future agent would otherwise
re-litigate it.

## Template

```md
# NNNN — Title

- Status: proposed | accepted | superseded by NNNN
- Date: YYYY-MM-DD
- Deciders: <who>
- Related: <plans, ADRs>

## Context

What forces are at play. What we know, and what we do not.

## Decision

The decision, in the active voice.

## Consequences

What becomes easier, what becomes harder, what is now impossible.
```

## Records

- `0001-native-smoke-host.md` — the 0.10.0 binding gap on this host (amended by
  0003: the gap is closed by a source build).
- `0002-two-gpuix-versions.md` — 0.10.0 is the library target; 0.5.1 is the last
  runnable published binding and its measured limits.
- `0003-darwin-x64-source-build.md` — the `darwin-x64` binding is built from
  source with `runtime_shaders`; the native smoke suite is green on this host.
