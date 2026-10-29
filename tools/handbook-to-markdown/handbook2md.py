"""Split the single-page Perxona handbook into per-section, per-language Markdown
and build llms.txt + llms-full.txt. Usage: handbook2md.py shell.html outdir"""
import sys, re, pathlib
from bs4 import BeautifulSoup
from markdownify import MarkdownConverter

src, out = sys.argv[1], pathlib.Path(sys.argv[2])
html = open(src, encoding="utf-8").read()
soup = BeautifulSoup(html, "html.parser")

LANGS = {"en": "en", "zh-tw": "zh-tw", "ja": "ja"}
REPO = "https://github.com/XRSPACE-Inc/perxona-connect-kit"
SITE = "https://connect.perxona.ai"

# nav order + titles (EN) from the sidebar
nav = []
seen = set()
for a in soup.select("nav a[href^='#'], .sidebar a[href^='#'], aside a[href^='#']"):
    sid = a["href"][1:]
    if sid not in seen and soup.find("section", id=sid):
        seen.add(sid); nav.append(sid)
for sec in soup.select("section.section[id]"):
    if sec["id"] not in seen:
        seen.add(sec["id"]); nav.append(sec["id"])

class Conv(MarkdownConverter):
    def convert_pre(self, el, text, parent_tags=None, **kw):
        code = el.find("code")
        lang = ""
        if code and code.get("class"):
            m = [c[9:] for c in code["class"] if c.startswith("language-")]
            lang = m[0] if m else ""
        body = (code or el).get_text()
        return f"\n```{lang}\n{body.rstrip()}\n```\n"
conv = Conv(heading_style="ATX", bullets="-", strip=["button", "script", "style", "svg"])

def section_md(sec, lang):
    s = BeautifulSoup(str(sec), "html.parser")
    for d in s.select("[data-lang]"):
        if d["data-lang"] != lang:
            d.decompose()
    for d in s.select(".lang-switcher, .hero-actions, .mobile-menu-btn, .copy-btn"):
        d.decompose()
    md = conv.convert(str(s))
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    # internal anchors -> site anchors
    md = md.replace("](#", f"]({SITE}/#")
    return md

def title_of(md):
    m = re.search(r"^#{1,2} (.+)$", md, re.M)
    return m.group(1).strip() if m else ""

pages = {}
for lang in LANGS:
    d = out / "docs" / lang
    d.mkdir(parents=True, exist_ok=True)
    for sid in nav:
        sec = soup.find("section", id=sid)
        md = section_md(sec, lang)
        if len(md) < 40:
            continue
        (d / f"{sid}.md").write_text(md + "\n", encoding="utf-8")
        pages.setdefault(lang, []).append((sid, title_of(md), md))

# llms.txt (EN)
en = pages["en"]
lines = ["# Perxona Connect Kit", "",
 "> Add a talking 3D AI avatar to any web app. The Perxona Connect API (REST) plus the `<sv-presenter>` avatar Web Component (Presenter SDK): pick an avatar, scene and voice, call `present(text)`, and it speaks with lip-sync and emotion. Samples and tools live in this repo; the full handbook is at " + SITE + ".", "",
 "Key facts for agents:", "",
 "- The Presenter SDK is loaded once as a module script from a `PRESENTER_URL` your server supplies (not a secret) and registers the `<sv-presenter>` custom element. There is no bundled npm SDK yet; `@perxona/presenter-types` on npm provides TypeScript types only.",
 "- Two keys: a **secret** Connect API key (server side only) and a **publishable** key (browser). Create both in the Perxona Console under the organization management page, Integration, Connect API keys.",
 "- Fastest path: `git clone` this repo, `cd samples/express`, copy `.env.example` to `.env`, `npm install`, `npm run dev`, open http://localhost:8083.",
 "- Usage is metered in organization credits (`GET /credit`); when they run out, metered calls fail with HTTP 400 and `code: 1003`.", "",
 "## Handbook (English)", ""]
for sid, t, md in en:
    if sid == "demo-walkthrough": t = "Demo Walkthrough: Presenter basics"
    lines.append(f"- [{t or sid}]({REPO}/blob/main/docs/en/{sid}.md): {SITE}/#{sid}")
lines += ["", "## Samples and tools", "",
 f"- [Express sample README]({REPO}/blob/main/samples/express/README.md): setup, auth model, backend adapter routes, troubleshooting",
 f"- [Agent notes for the Express sample]({REPO}/blob/main/samples/express/AGENTS.md): how to scaffold a new demo from the existing ones",
 f"- [InterviewCoach demo]({REPO}/blob/main/samples/express/public/demos/interview/README.md): a practice app where the avatar is the product",
 f"- [VRM uploader]({REPO}/blob/main/tools/vrm-uploader/README.md): check and upload your own .vrm avatar",
 "", "## Optional", "",
 f"- [Handbook in Traditional Chinese]({REPO}/tree/main/docs/zh-tw)",
 f"- [Handbook in Japanese]({REPO}/tree/main/docs/ja)",
 f"- [Showcase](https://showcase.perxona.ai): live demos built by the community",
 f"- [Pricing](https://perxona.ai/pricing)", ""]
(out / "llms.txt").write_text("\n".join(lines), encoding="utf-8")

full = ["# Perxona Connect Kit — full handbook (English)", "",
        f"Source: {SITE} (single-page handbook, split per section). Generated from the public page; regenerate with tools/handbook2md.py.", ""]
for sid, t, md in en:
    full += [f"<!-- section: {sid} -->", md, ""]
(out / "llms-full.txt").write_text("\n".join(full), encoding="utf-8")

for lang, ps in pages.items():
    print(lang, len(ps), "pages", sum(len(m) for _,_,m in ps), "chars")
print("llms.txt", len((out/'llms.txt').read_text()), "chars; llms-full.txt", len((out/'llms-full.txt').read_text()), "chars")
