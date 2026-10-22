# Lucide — icon geometry

- Repository: <https://github.com/lucide-icons/lucide>
- Package read: `lucide-static` `1.61.0` (read 2026-10-22 from
  `unpkg.com/lucide-static@1.61.0`, the release the geometry below was taken
  from)
- Licence: ISC for the set, MIT for the icons Lucide derives from Feather
  (`LICENSE` in the package carries both notices, reproduced here in full)
- Consumer: `@gpuixui/icons`

## What we use

The **geometry** of the icons in `packages/icons/src/registry.ts`: the `d`,
`cx`/`cy`/`r`, `x`/`y`/`width`/`height`/`rx` and `points` values of each
`<path>`, `<circle>`, `<rect>`, `<line>`, `<polyline>` or `<polygon>` element,
on Lucide's 24x24 grid, at `stroke-width="2"`.

Two shapes in the registry are ours rather than Lucide's, and are marked as such
beside their entry: `star-filled` (Lucide's `star` outline with `fill` instead of
`stroke`, because `Rating` paints a chosen star) and `sort-desc` (the mirror of
`sort-asc`). `database` is Lucide's geometry with its one `<ellipse>` written as
two arc paths, so every icon in the set uses only the element types the runtime
suite has painted.

We do **not** copy:

- any colour, class, `width`/`height` attribute or wrapper element — each entry
  holds geometry only, and the shared wrapper in `registry.ts` supplies the grid,
  `fill="none"` and the retintable `stroke="#000"`;
- an icon font, sprite sheet, ligature table or animation;
- any logo, wordmark or brand mark.

## Why the notice travels with us

ISC and MIT both require the copyright notice and permission notice to appear in
all copies or substantial portions of the software. `@gpuixui/icons` redistributes
the geometry, so both notices are reproduced below and are part of the release;
`packages/icons/docs/icon.mdx` points a reader here, and
`packages/icons/src/docs.test.ts` fails if this record loses either notice, the
version it was read at, or the page's citation of it.

## ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

## MIT License (for the icons derived from Feather)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
