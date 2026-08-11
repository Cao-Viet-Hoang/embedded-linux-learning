# §3.1. The product mark

> Split out of `CLAUDE.md` on 2026-08-11. **Section numbers are unchanged.**
> Needed only when the logo, the topbar tile or the favicon changes.

There is exactly **one** mark: a terminal prompt `>_`, white, on a rounded tile filled with
`linear-gradient(140deg, var(--primary), var(--accent))`. It appears in the topbar and as the
favicon, and it must look identical in both. Tux was dropped because its line art is
illegible once scaled to a 16px browser tab, which guaranteed the two would keep drifting.

It lives in **three** places that have no automatic link between them:

| Place | What it holds |
|---|---|
| `js/icons.js` → `logo` | the glyph, in a 24×24 box, `stroke-width` 3.12 / 2.64 |
| `css/layout.css` → `.brand__mark` | the tile: 32px, `--r-md`, the gradient. The svg is sized 32px so the icon's own padding becomes the tile inset |
| `assets/favicon.svg` | both, redrawn in a 32×32 box — glyph coords are the icon's × 32/24, gradient axis is the 140° CSS angle resolved to `x1/y1/x2/y2` |

Changing any one of them means changing all three **and** regenerating `assets/favicon.ico`.
The `.ico` is not built by a script in the repo — `tools/check.js` stays the only Node file
and it is a test, never a build step. Regenerate it by writing a throwaway rasteriser
(rounded-rect + segment SDFs, 4×4 supersampling, 32-bit BGRA DIBs at 16/32/48) and deleting
it afterwards.
