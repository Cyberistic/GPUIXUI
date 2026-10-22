# TanStack — headless cores

- Repository: <https://github.com/TanStack> (table, virtual, form, pacer, hotkeys)
- Package read: `@tanstack/hotkeys` `0.17.0` (read 2026-10-22)
- Licence: MIT — `Copyright (c) Tanner Linsley` (the year line varies by package)

## What we use

The headless cores — Table (grid state), Virtual (windowing), Form (field
state), Pacer (debounce/throttle) and Hotkeys (accelerators). The keyboard
package builds its accelerator layer on `@tanstack/hotkeys`; the Tier 3 data
package adopts the rest (plan 610).

## What we do not use

Dependency, no code copied. No TanStack source is copied or vendored; each
headless core is installed from npm under its own MIT licence.

## MIT License

Copyright (c) Tanner Linsley

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
