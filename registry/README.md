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
| `/<package>-<component>.json` | One item, with the source of every file it installs |

Names are `<package>-<component>` because the registry is flat and eight page
names belong to two components in different sections: `primitives-progress` and
`components-progress` are different components. A document is the same JSON the
shadcn schema describes, so a client reads it with no special case.

## The directory entry

`shadcn-directory.json` is an array of one, in the shape
`apps/v4/registry/directory.json` uses. To submit it:

1. Fork [shadcn-ui/ui](https://github.com/shadcn-ui/ui).
2. Append the object to `apps/v4/registry/directory.json`.
3. Run `pnpm validate:registries` in `apps/v4`.
4. Open a pull request.

`apps/docs/src/lib/registry.test.ts` holds the entry to this site: the homepage
and the `{name}` template must name the deployed origin, and the namespace must
be the one the CLI resolves. Change where the registry lives and the test fails
before the entry starts pointing at a 404.

## The requirements the directory publishes

- The registry is open source and publicly reachable.
- `/registry.json` conforms to the registry schema.
- The registry is flat: the index and one document per item at the root.
- The index's `files` carry paths, not `content`. An item's own `files` carry
  `content`, which is how `shadcn add` writes the source.
