# shadcn/ui — component API and docs experience

- Repository: <https://github.com/shadcn-ui/ui>
- Commit read: `d2fba50` (read 2026-10-22)
- Licence: MIT — `Copyright (c) 2023 shadcn`
- Consumers: `@gpuixui/tw` (class recipes), the docs site (Preview/Code, install, theming)

## What we use

The component API and composition, and the docs experience. The shadcn class
recipes — `h-9`, `bg-popover`, `rounded-4xl` and the rest of the Button/Input
strings and the dialog/popover animation tokens in `packages/tw/src/recipes.ts`
— are kept verbatim so a diff against upstream is meaningful, and are compiled
to GPUix `StyleDesc` rather than CSS. The `cn` class-joining helper is a runtime
dependency. The docs site follows shadcn's anatomy: a sectioned sidebar, a
Preview/Code component page, the `nub` install block and theming.

## What we do not use

No shadcn source file is copied or vendored — only the class strings, which are
facts about the public API. No shadcn logo, wordmark or brand mark is used, and
the design system's specific visual identity (the `new-york` palette, radii and
type) is not reproduced: the tokens and themes are this project's own. The `cn`
package carries its own MIT notice where it is installed.

## MIT License

Copyright (c) 2023 shadcn

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
