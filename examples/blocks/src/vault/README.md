# Vault

A linked-notes app: a folder list, a reading pane whose links open notes, and the graph and backlinks of the open note.

<!-- TODO: a docs page, once the site has a preview for this block. -->

Run it natively:

```sh
nub run --filter @gpuixui/blocks dev -- vault
```

## Composition

`Vault` in `@gpuixui/blocks/vault`:

- the folders are `SourceList` under `Window`'s traffic lights;
- a note's body marks a link as `[[id]]`, and `spans` splits it into text and
  link spans, so a link is a press target that opens that note;
- the graph is one `<svg source>` for the edges, tinted by the theme's border, with
  a pressable node per note; the open note and what it links to take the primary
  colour;
- backlinks are derived from every note's links, so they cannot disagree with the
  bodies.

The notes are sample data. Nothing is read from disk.
