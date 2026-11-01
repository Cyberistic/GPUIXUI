# Registry

What this site publishes for other tools to install GPUIxUI from, and the
directory entry that makes the shadcn CLI find it.

The registry itself is generated, not kept here: `apps/docs/src/lib/registry-source.ts`
reads every component page and the source behind it, and
`apps/docs/plugins/registry-assets-plugin.ts` writes the result into the built
site. So this folder holds only what is written by hand:

| File | What it is |
| --- | --- |
| `shadcn-directory.json` | The entry submitted to shadcn's [registry directory](https://ui.shadcn.com/docs/registry/registry-index), which is how `@sudokw/<item>` resolves in the CLI |

## What the site serves

| Address | Document |
| --- | --- |
| `/registry.json` | The index: every item, its type, and the file paths it installs, without their content |
| `/<package>-<component>.json` | One component, with the source of every file it installs |
| `/gpuix-<package>.json` | One runtime, with the `@gpuixui/<package>` modules the components import |

Names are `<package>-<component>` because the registry is flat and eight page
names belong to two components in different sections: `primitives-progress` and
`components-progress` are different components. A document is the same JSON the
shadcn schema describes, so a client reads it with no special case.

## What keeps an install closed

Every component source imports `@gpuixui/*`, and those packages are private to
the workspace. Copying the source alone would install a tree that resolves
nowhere, so the generator does two things:

- every `@gpuixui/*` specifier is rewritten to a relative path inside the
  install root, `@ui/gpuixui/<package>/…` — the `ui` alias plus one folder per
  package, so `primitives-progress` and `components-progress` cannot overwrite
  each other;
- the files those imports need ship as a runtime item (`gpuix-<package>`) named
  in `registryDependencies`, so the CLI installs each runtime once, transitively,
  with the component.

The item's npm `dependencies` carry the versions the workspace pins, not bare
names: the CLI resolves a bare name at `latest`, and `@tanstack/hotkeys` 0.22
changed the signature the keyboard source calls.

The copied files also need `"jsxImportSource": "@gpuix/react"` in the consuming
project: the CLI removes the comment block at the top of each file, and that is
where the source's `@jsxImportSource` pragma lives.

## The requirements the registry publishes

- The registry is open source and publicly reachable.
- `/registry.json` conforms to the registry schema.
- The registry is flat: the index and one document per item at the root.
- The index's `files` carry paths, not `content`. An item's own `files` carry
  `content`, which is how `shadcn add` writes the source.

`apps/docs/src/lib/registry.test.ts` holds all of it: one item per served page,
one runtime per borrowed package, byte-identical content apart from the
specifier rewrite, and every import in every installed tree resolving to a
shipped file or a declared npm package. It fails when a component starts
importing a package the runtime does not ship.
