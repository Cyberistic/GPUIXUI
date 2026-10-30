# `npm/` — the public names

A folder outside the workspace on purpose: these manifests claim a name on npm,
they are not packages the monorepo builds or imports. `apps/*`, `packages/*` and
`examples/*` are the workspace; nothing here joins the dependency graph, the
entry budget or the type-check.

## `@sudokw/gpuixui`

The library's public name. Unscoped `gpuixui` was refused by npm as too similar
to a name already on the registry, so the package lives under the project's own
`sudokw` scope. It is currently a **reservation**: version `0.0.0` ships only its
README, which says the library is not published yet, points at the docs, and
states that GPUIxUI is not part of the `@gpuix` scope on npm.

```sh
cd npm/gpuixui && npm publish --access public
```

Publishing the real library is a separate job: the entry points, the
`@gpuix/react` peer and the per-platform `@gpuix/native` binaries all have to line
up, and the workspace packages are `workspace:*` today.
