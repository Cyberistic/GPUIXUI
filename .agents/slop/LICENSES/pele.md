# Pele — the diagram renderer

- Repository: <https://pele.run> (package `pele`)
- Package read: `pele` `1.13.0` (read 2026-11-04)
- Licence: MIT — `Copyright (c) Pele contributors` (read from the shipped
  `package.json`)
- Dependencies: **none**

## What we use

`render(source)` — a **synchronous, DOM-free** renderer that turns a Mermaid
source into an SVG drawing. The `Diagram` component in `@gpuixui/components`
calls it, and the drawing travels as a **data URL** on an `<img>`, which the
runtime's own SVG decoder paints.

Pele writes its palette as CSS custom properties, twice: the public `--pele-*`
set and an internal `--_*` set. A raster resolves neither, so the theme's
values are read and **baked into** the drawing as literal colours.

## What we do not use

Dependency, no code copied. Pele's own DOM helpers, its palette resolution and
its theme handling are not used — the theme's colours are ours, and a source
the parser refuses paints the parser's sentence in the drawing's place.

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
