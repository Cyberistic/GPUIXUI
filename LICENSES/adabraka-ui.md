# adabraka-ui — reference record

| Field | Value |
| ----- | ----- |
| Project | [adabraka-ui](https://github.com/Augani/adabraka-ui) |
| Commit read | `e158684b23d9cb043fed3989ca252212046dabca` (2025) |
| Licence | MIT — `Copyright (c) 2025 Adabraka Team` (read from `LICENSE` in the clone) |
| What we used | the **structure** of `GAP_ANALYSIS.md` §2 — a checklist of renderer limits with a "workaround possible?" column — as the outline for `docs/gpuix-capabilities.md` |
| What we copied | nothing. No Rust source, no component code, no prose, no asset |
| Assets | none; `assets/` (icons, fonts, audio) was not read into the repo |
| Our artefact | `docs/gpuix-capabilities.md` (plan `203`) |

`adabraka-ui` targets **upstream GPUI** through a fork (`adabraka-gpui` 0.5), so
its verdicts are not transferable. Every row in our capability table was
re-checked against the published `@gpuix/react` / `@gpuix/native` **0.10.0**
types; several of its workarounds do not apply and several of our limits are not
in its table at all.

## Licence text

```
MIT License

Copyright (c) 2025 Adabraka Team

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
```
