# handbook-to-markdown

Regenerates `docs/` (per section, per language), `llms.txt` and `llms-full.txt` from the
single-page handbook at https://connect.perxona.ai.

```bash
pip install beautifulsoup4 markdownify
curl -s https://connect.perxona.ai/ -o /tmp/handbook.html
python3 tools/handbook-to-markdown/handbook2md.py /tmp/handbook.html .
```

Run it whenever the handbook changes, then commit the result. The same `llms.txt` should
also be served at https://connect.perxona.ai/llms.txt (today that URL returns the app shell).
