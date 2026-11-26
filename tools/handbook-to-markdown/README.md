# handbook-to-markdown

Regenerates `docs/` (per section, per language), `llms.txt` and `llms-full.txt` from the
single-page handbook at https://connect.perxona.ai.

```bash
pip install beautifulsoup4 markdownify
curl -s https://connect.perxona.ai/ -o /tmp/handbook.html
python3 tools/handbook-to-markdown/handbook2md.py /tmp/handbook.html .
```

Run it against the production handbook whenever the handbook changes, then commit the result.

The generated files are overwritten on every run, so do not edit `docs/en|zh-tw|ja/`,
`llms.txt` or `llms-full.txt` by hand. To change the summary or the "Key facts for agents" list
at the top of `llms.txt`, edit the `lines` list in `handbook2md.py` (the block under
`# llms.txt (EN)`) and run the script again. Everything else comes from the handbook itself.

https://connect.perxona.ai/llms.txt is a short pointer to the files in this repo; it is not a copy
of `llms.txt` and does not need updating when they change.
