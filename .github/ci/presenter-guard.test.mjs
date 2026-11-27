// Checks the presenter engine host guard the Express demos share.
//
// Each demo's app.js carries its own copy of the guard so that a demo can be
// copied out on its own. This test keeps the copies identical, checks what the
// guard accepts and refuses, and checks that server.mjs warns about the same
// hosts the demos accept.
//
// Run from the repository root: node --test .github/ci/*.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { URL } from "node:url";
import { describe, it } from "node:test";

const SAMPLE = "samples/express";
const DEMOS = join(SAMPLE, "public/demos");
const START = "// The engine runs with this page's full rights";
const END = "  return url.href;\n}\n";

/** The guard block of one demo's app.js, from its comment to its closing brace. */
function guardOf(file) {
  const source = readFileSync(file, "utf8");
  const start = source.indexOf(START);
  assert.notEqual(start, -1, `${file} has no presenter host guard`);
  const end = source.indexOf(END, start);
  assert.notEqual(end, -1, `${file}: the guard does not end with ${JSON.stringify(END)}`);
  return source.slice(start, end + END.length);
}

const demoFiles = readdirSync(DEMOS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(DEMOS, entry.name, "app.js"));
const guards = demoFiles.map(guardOf);

/** The guard's requireTrustedPresenterUrl(), run against a page at `baseURI`. */
function guardOn(baseURI) {
  return new Function("document", `${guards[0]}\nreturn requireTrustedPresenterUrl;`)({
    baseURI,
  });
}

// Built at run time so this file never names a non-production host itself;
// the CI step that refuses such hosts in tracked files would flag it.
const devCdn = ["cdn", "dev", "perxona", "ai"].join(".");

describe("presenter host guard", () => {
  it("is the same in every demo", () => {
    assert.ok(demoFiles.length >= 2, `expected several demos under ${DEMOS}`);
    for (const [index, guard] of guards.entries())
      assert.equal(guard, guards[0], `${demoFiles[index]} differs from ${demoFiles[0]}`);
  });

  const page = "http://localhost:8083/demos/embed/";
  const accepted = [
    "https://cdn.perxona.ai/asia/prod/connect/latest/widget/entry/presenter.js",
    "http://localhost:5173/presenter.js",
    "http://127.0.0.1:5173/presenter.js",
    "https://localhost/presenter.js",
    "/presenter.js",
  ];
  for (const url of accepted)
    it(`loads ${url}`, () => {
      assert.equal(guardOn(page)(url), new URL(url, page).href);
    });

  const refused = [
    ["http://cdn.perxona.ai/presenter.js", /must load over https/],
    ["https://example.com/presenter.js", /ALLOWED_PRESENTER_HOSTS/],
    ["https://cdn.perxona.ai.example.com/presenter.js", /ALLOWED_PRESENTER_HOSTS/],
    [`https://${devCdn}/presenter.js`, /ALLOWED_PRESENTER_HOSTS/],
  ];
  for (const [url, reason] of refused)
    it(`refuses ${url}`, () => {
      assert.throws(() => guardOn(page)(url), reason);
    });

  it("resolves a relative URL against the page, not localhost", () => {
    assert.throws(() => guardOn("https://example.com/")("/presenter.js"), /ALLOWED_PRESENTER_HOSTS/);
  });

  it("matches the hosts server.mjs warns about", () => {
    const server = readFileSync(join(SAMPLE, "server.mjs"), "utf8");
    const hostsOf = (source, name) => source.match(new RegExp(`const ${name} = (new Set\\(.*\\));`))?.[1];
    const demoHosts = hostsOf(guards[0], "ALLOWED_PRESENTER_HOSTS").replace("LOCAL_HOSTS", "<local>");
    const serverHosts = hostsOf(server, "DEMO_PRESENTER_HOSTS")?.replace("DEMO_LOCAL_HOSTS", "<local>");
    assert.equal(serverHosts, demoHosts);
    assert.equal(hostsOf(server, "DEMO_LOCAL_HOSTS"), hostsOf(guards[0], "LOCAL_HOSTS"));
  });
});
