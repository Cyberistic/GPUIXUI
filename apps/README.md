# apps/

Two applications, deliberately different runtimes:

- `docs/` — the **Fumadocs** documentation site and showcase. A browser app. It
  may use ordinary web technology and must **not** depend on the native runtime.
- `playground/` — the **native** GPUix playground. It runs the library in the
  real runtime, hosts the native smoke tests, and is how a component is proven
  to work before its inventory row may say `done`.

`MISSION.md` requires both. Neither exists yet: their shells are Phase B
deliverables, and the plans for them are written first. Each directory's README
states exactly what Phase B must create, so nothing here pretends to be an app
that does not run.
