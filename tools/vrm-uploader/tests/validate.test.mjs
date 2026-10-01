import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ARKIT_52, buildGlb, vrm0Document, vrm1Document } from "./glb.mjs";
import {
  checkStatus,
  makeWorkDir,
  removeWorkDir,
  runJson,
  runScript,
  writeFixture,
} from "./run.mjs";

const EXIT_OK = 0;
const EXIT_USAGE = 1;
const EXIT_INVALID = 2;

beforeAll(makeWorkDir);
afterAll(removeWorkDir);

describe("a file that passes every check", () => {
  it("passes and reports which lip-sync engine it picked", async () => {
    const file = await writeFixture("valid.vrm", buildGlb(vrm1Document()));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(json.valid).toBe(true);
    expect(json.vrm_version).toBe("1.0");
    expect(json.upload).toEqual({
      status: "skipped",
      reason: "--validate-only",
    });
    for (const check of json.checks) {
      expect(check.status, `${check.id}: ${check.message}`).not.toBe("fail");
    }
  });

  it("reports every check by id, even the ones that only warn", async () => {
    const file = await writeFixture("ids.vrm", buildGlb(vrm1Document()));
    const { json } = await runJson([file, "--validate-only"]);

    expect(json.checks.map((check) => check.id)).toEqual([
      "file_readable",
      "file_size",
      "glb_container",
      "json_chunk",
      "vrm_extension",
      "embedded_resources",
      "skinned_mesh",
      "expressions",
    ]);
  });

  it("prints a human report when --json is not given", async () => {
    const file = await writeFixture("human.vrm", buildGlb(vrm1Document()));
    const { code, stdout } = await runScript([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(stdout).toContain("glb_container");
    expect(stdout).toContain("lipsync_mode: wlipsync");
    expect(stdout).toContain("Result: PASSED");
  });
});

describe("checks that block an upload", () => {
  it("fails when the file does not exist", async () => {
    const { code, json } = await runJson([
      "/definitely/not/here.vrm",
      "--validate-only",
    ]);

    expect(code).toBe(EXIT_INVALID);
    expect(json.valid).toBe(false);
    expect(checkStatus(json, "file_readable")).toBe("fail");
    expect(checkStatus(json, "file_size")).toBe("skipped");
  });

  it("fails when the file is over 50 MB", async () => {
    const document = vrm1Document();
    // Padding inside the JSON is the cheapest way past the limit: the check
    // reads the file size, so where the bytes sit does not matter.
    document.asset.padding = "x".repeat(51 * 1024 * 1024);
    const file = await writeFixture("huge.vrm", buildGlb(document));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "file_size")).toBe("fail");
    expect(
      json.checks.find((check) => check.id === "file_size").message,
    ).toContain("50 MB");
  });

  it("fails when the file is not a GLB", async () => {
    const file = await writeFixture(
      "plain.vrm",
      Buffer.from("this is not a GLB at all"),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "glb_container")).toBe("fail");
  });

  it("fails when the GLB version is not 2", async () => {
    const file = await writeFixture(
      "v1.vrm",
      buildGlb(vrm1Document(), { version: 1 }),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "glb_container")).toBe("fail");
  });

  it("fails when the first chunk is not JSON", async () => {
    const file = await writeFixture(
      "binfirst.vrm",
      buildGlb(vrm1Document(), { jsonChunkType: 0x004e4942 }),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "glb_container")).toBe("fail");
  });

  it("fails when the JSON chunk runs past the end of the file", async () => {
    const file = await writeFixture(
      "truncated.vrm",
      buildGlb(vrm1Document(), { declaredJsonChunkLength: 5_000_000 }),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "glb_container")).toBe("fail");
  });

  // The API compares the declared length for equality, so a header that
  // under-reports it must fail here rather than on the server.
  it("fails when the GLB header disagrees with the file length", async () => {
    const file = await writeFixture(
      "short-header.vrm",
      buildGlb(vrm1Document(), { declaredTotalLength: 40 }),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "glb_container")).toBe("fail");
  });

  it("fails when the JSON chunk does not parse", async () => {
    const file = await writeFixture(
      "badjson.vrm",
      buildGlb(null, { rawJson: '{"asset": {"version": "2.0"' }),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "glb_container")).toBe("pass");
    expect(checkStatus(json, "json_chunk")).toBe("fail");
  });

  it("fails when the glTF carries no VRM extension", async () => {
    const document = vrm1Document();
    delete document.extensions;
    const file = await writeFixture("plain-gltf.vrm", buildGlb(document));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "vrm_extension")).toBe("fail");
    expect(json.vrm_version).toBeNull();
  });

  it("fails when a buffer or image points outside the file", async () => {
    const file = await writeFixture(
      "external.vrm",
      buildGlb(vrm1Document({ externalUri: "textures/body.png" })),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "embedded_resources")).toBe("fail");
    expect(
      json.checks.find((check) => check.id === "embedded_resources").message,
    ).toContain("textures/body.png");
  });

  it("accepts a data: uri as embedded", async () => {
    const file = await writeFixture(
      "datauri.vrm",
      buildGlb(vrm1Document({ externalUri: "data:image/png;base64,AAAA" })),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(checkStatus(json, "embedded_resources")).toBe("pass");
  });

  it("fails when no mesh is bound to a skin", async () => {
    const file = await writeFixture(
      "noskin.vrm",
      buildGlb(vrm1Document({ skinnedNode: false })),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "skinned_mesh")).toBe("fail");
  });
});

describe("VRM version", () => {
  it("accepts VRM 0.x and names the version it found", async () => {
    const file = await writeFixture("vrm0.vrm", buildGlb(vrm0Document()));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(json.valid).toBe(true);
    expect(json.vrm_version).toBe("0.0");
    expect(checkStatus(json, "expressions")).toBe("pass");
  });
});

describe("expression data and the lip-sync engine", () => {
  it("picks xrlipsync when all 52 ARKit blendshapes resolve", async () => {
    const file = await writeFixture(
      "arkit.vrm",
      buildGlb(vrm1Document({ targetNames: ARKIT_52 })),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(json.lipsync_mode).toBe("xrlipsync");
    expect(json.lipsync_reason).toContain("52");
  });

  it("resolves ARKit names that carry an exporter prefix", async () => {
    const file = await writeFixture(
      "arkit-prefixed.vrm",
      buildGlb(
        vrm1Document({ targetNames: ARKIT_52.map((name) => `Face.${name}`) }),
      ),
    );
    const { json } = await runJson([file, "--validate-only"]);

    expect(json.lipsync_mode).toBe("xrlipsync");
  });

  it("ignores a mesh no node references", async () => {
    const file = await writeFixture(
      "arkit-orphan.vrm",
      buildGlb(vrm1Document({ orphanMeshTargetNames: ARKIT_52 })),
    );
    const { json } = await runJson([file, "--validate-only"]);

    expect(json.lipsync_mode).toBe("wlipsync");
  });

  it("ignores the name list when its length disagrees with the morph target count", async () => {
    const file = await writeFixture(
      "arkit-mismatched.vrm",
      buildGlb(vrm1Document({ targetNames: ARKIT_52, targetCount: 51 })),
    );
    const { json } = await runJson([file, "--validate-only"]);

    expect(json.lipsync_mode).toBe("wlipsync");
  });

  it("picks wlipsync when only the VRM mouth presets are there", async () => {
    const file = await writeFixture("presets.vrm", buildGlb(vrm1Document()));
    const { json } = await runJson([file, "--validate-only"]);

    expect(json.lipsync_mode).toBe("wlipsync");
    expect(checkStatus(json, "expressions")).toBe("pass");
  });

  it("warns without blocking when nothing can drive the mouth", async () => {
    const file = await writeFixture(
      "nomouth.vrm",
      buildGlb(
        vrm1Document({ mouthPresets: [], targetNames: ["Fcl_ALL_Neutral"] }),
      ),
    );
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(json.valid).toBe(true);
    expect(checkStatus(json, "expressions")).toBe("warn");
    expect(
      json.checks.find((check) => check.id === "expressions").message,
    ).toContain("will not lip-sync");
    expect(json.lipsync_mode).toBe("wlipsync");
  });

  it("treats a mouth preset that binds nothing as absent", async () => {
    const file = await writeFixture(
      "unbound.vrm",
      buildGlb(
        vrm1Document({ boundPresets: false, targetNames: ["Fcl_ALL_Neutral"] }),
      ),
    );
    const { json } = await runJson([file, "--validate-only"]);

    expect(checkStatus(json, "expressions")).toBe("warn");
  });
});

describe("usage", () => {
  it("prints help and exits 0", async () => {
    const { code, stdout } = await runScript(["--help"]);

    expect(code).toBe(EXIT_OK);
    expect(stdout).toContain("--skeleton-type");
    expect(stdout).toContain("PERXONA_CONNECT_SECRET_KEY");
  });

  it("rejects an unknown option", async () => {
    const { code, stderr } = await runScript(["--nope", "x.vrm"]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("unknown option");
  });

  it("requires --skeleton-type unless --validate-only is given", async () => {
    const file = await writeFixture(
      "needs-skeleton.vrm",
      buildGlb(vrm1Document()),
    );
    const { code, stderr } = await runScript([file]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("--skeleton-type");
  });

  it("rejects an unknown skeleton type", async () => {
    const file = await writeFixture(
      "bad-skeleton.vrm",
      buildGlb(vrm1Document()),
    );
    const { code, stderr } = await runScript([
      file,
      "--skeleton-type",
      "robot",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("unknown --skeleton-type");
  });

  // The API caps an asset name at 256 characters, so a longer one is worth
  // catching before the upload rather than after it.
  it("rejects an avatar name past the API's limit", async () => {
    const file = await writeFixture("long-name.vrm", buildGlb(vrm1Document()));
    const { code, stderr } = await runScript([
      file,
      "--validate-only",
      "--avatar-name",
      "x".repeat(257),
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("257 characters");
    expect(stderr).toContain("256");
  });

  it("accepts an avatar name exactly at the limit", async () => {
    const file = await writeFixture("at-limit.vrm", buildGlb(vrm1Document()));
    const { code } = await runScript([
      file,
      "--validate-only",
      "--avatar-name",
      "x".repeat(256),
    ]);

    expect(code).toBe(EXIT_OK);
  });

  // 200 Japanese characters are 600 bytes. Counting bytes would reject a name
  // the API accepts, and the tests run without a UTF-8 locale, which is exactly
  // where bash's own ${#value} would count them.
  it("counts characters rather than bytes", async () => {
    const file = await writeFixture("multibyte.vrm", buildGlb(vrm1Document()));
    const { code } = await runScript([
      file,
      "--validate-only",
      "--avatar-name",
      "あ".repeat(200),
    ]);

    expect(code).toBe(EXIT_OK);
  });

  it("refuses to upload without a secret key", async () => {
    const file = await writeFixture("nokey.vrm", buildGlb(vrm1Document()));
    const { code, stderr } = await runScript([
      file,
      "--skeleton-type",
      "female",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("PERXONA_CONNECT_SECRET_KEY");
  });

  it("reports a usage error as JSON when --json is given", async () => {
    const { code, stdout } = await runScript([
      "--json",
      "--skeleton-type",
      "robot",
      "x.vrm",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(JSON.parse(stdout).valid).toBe(false);
  });

  // The message carries whatever the caller typed, so --json stays parsable
  // only if the characters JSON reserves are escaped on the way in.
  it.each([
    ["a quote", '--"weird'],
    ["a backslash", "--back\\slash"],
    ["both", '--a"b\\c'],
  ])(
    "keeps --json parsable when an option carries %s",
    async (_label, option) => {
      const { code, stdout } = await runScript(["--json", option, "x.vrm"]);

      expect(code).toBe(EXIT_USAGE);
      const parsed = JSON.parse(stdout);
      expect(parsed.valid).toBe(false);
      expect(parsed.error).toBe(`unknown option: ${option}`);
    },
  );

  it("keeps --json parsable when a file name carries a quote", async () => {
    const { code, stdout } = await runScript([
      "--json",
      "--validate-only",
      'a"b.vrm',
      "second.vrm",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(JSON.parse(stdout).error).toContain('a"b.vrm');
  });
});
