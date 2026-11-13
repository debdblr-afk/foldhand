#!/usr/bin/env python3
"""Generate tokens.css and tailwind-theme.css from tokens.json. Standard library only.

    python3 design/build_tokens.py [path/to/app/styles]

tokens.css          plain CSS custom properties (import once in the root layout)
tailwind-theme.css  Tailwind v4 @theme mapping, so components write bg-surface text-muted

Pass the app's styles folder (once the app exists) to copy both CSS files there.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
t = json.loads((HERE / "tokens.json").read_text())


def px(v):
    return f"{v}px" if isinstance(v, (int, float)) else str(v)


css = ["/* Generated from tokens.json by build_tokens.py. Do not edit by hand. */",
       ":root {", "  color-scheme: light;"]
for group in ("color", "alpha"):
    for k, v in t[group].items():
        css.append(f"  --t-color-{k}: {v};")
for k, v in t["font"].items():
    css.append(f"  --t-font-{k}: {v};")
for k, v in t["type"].items():
    css.append(f"  --t-text-{k}: {px(v['size'])};")
    css.append(f"  --t-leading-{k}: {px(v['line'])};")
    css.append(f"  --t-weight-{k}: {v['weight']};")
    if "tracking" in v:
        css.append(f"  --t-tracking-{k}: {v['tracking']};")
for i, v in enumerate(t["space"]):
    css.append(f"  --t-space-{i}: {px(v)};")
for k, v in t["radius"].items():
    css.append(f"  --t-radius-{k}: {px(v)};")
for k, v in t["shadow"].items():
    css.append(f"  --t-shadow-{k}: {v};")
for k, v in t["motion"].items():
    css.append(f"  --t-motion-{k}: {v};")
for k, v in t["layout"].items():
    if k != "breakpoints":
        css.append(f"  --t-layout-{k}: {px(v)};")
css += ["}", "",
        "@media (prefers-reduced-motion: reduce) {",
        "  :root { --t-motion-fast: 0ms; --t-motion-base: 0ms; --t-motion-slow: 0ms; }",
        "}"]
(HERE / "tokens.css").write_text("\n".join(css) + "\n")

# Tailwind v4. "inline" keeps the var() references live, so a token edit needs no rebuild of components.
tw = ["/* Generated from tokens.json by build_tokens.py. Do not edit by hand.",
      "   Import order in globals.css: tailwindcss, then tokens.css, then this file. */",
      "@theme inline {", "  --color-*: initial;",
      "  --color-white: #ffffff;", "  --color-black: #000000;", "  --color-transparent: transparent;"]
for k in list(t["color"]) + list(t["alpha"]):
    tw.append(f"  --color-{k}: var(--t-color-{k});")
tw.append("  --font-*: initial;")
for k in t["font"]:
    tw.append(f"  --font-{k}: var(--t-font-{k});")
tw.append("  --text-*: initial;")
for k, v in t["type"].items():
    tw.append(f"  --text-{k}: var(--t-text-{k});")
    tw.append(f"  --text-{k}--line-height: var(--t-leading-{k});")
    tw.append(f"  --text-{k}--font-weight: var(--t-weight-{k});")
    if "tracking" in v:
        tw.append(f"  --text-{k}--letter-spacing: var(--t-tracking-{k});")
tw.append("  --spacing: 4px;")
tw.append("  --radius-*: initial;")
for k in t["radius"]:
    tw.append(f"  --radius-{k}: var(--t-radius-{k});")
tw.append("  --shadow-*: initial;")
for k in t["shadow"]:
    tw.append(f"  --shadow-{k}: var(--t-shadow-{k});")
tw.append("  --breakpoint-*: initial;")
for k, v in t["layout"]["breakpoints"].items():
    tw.append(f"  --breakpoint-{k}: {v}px;")
tw.append(f"  --container-page: {t['layout']['container']}px;")
tw.append("  --ease-brand: var(--t-motion-ease);")
tw.append("}")
(HERE / "tailwind-theme.css").write_text("\n".join(tw) + "\n")

print("wrote tokens.css, tailwind-theme.css")

if len(sys.argv) > 1:
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    for name in ("tokens.css", "tailwind-theme.css"):
        (dest / name).write_text((HERE / name).read_text())
    print("copied to", dest)
