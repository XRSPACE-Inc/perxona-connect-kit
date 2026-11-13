import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ARKIT_52, buildGlb, vrm0Document, vrm1Document } from "./glb.mjs";
import {
  checkMessage,
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
      "node_constraints",
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

describe("skin weights", () => {
  it("fails when a skinned node's mesh has no JOINTS_0/WEIGHTS_0", async () => {
    const document = vrm1Document();
    delete document.meshes[0].primitives[0].attributes.JOINTS_0;
    delete document.meshes[0].primitives[0].attributes.WEIGHTS_0;
    const file = await writeFixture("unweighted.vrm", buildGlb(document));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "skinned_mesh")).toBe("fail");
    expect(checkMessage(json, "skinned_mesh")).toContain("Body");
  });

  // The glTF loader builds every primitive of a skinned node as skinned, so
  // one primitive without weights is enough, even though glTF itself allows it.
  it("fails when only one primitive of a skinned mesh lacks weights", async () => {
    const document = vrm1Document();
    document.meshes[0].primitives.push({ attributes: { POSITION: 0 } });
    const file = await writeFixture("half-weighted.vrm", buildGlb(document));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "skinned_mesh")).toBe("fail");
  });

  it("ignores a mesh without weights on a node with no skin", async () => {
    const document = vrm1Document();
    document.meshes.push({ name: "Prop", primitives: [{ attributes: { POSITION: 0 } }] });
    document.nodes.push({ name: "Prop", mesh: document.meshes.length - 1 });
    document.nodes[0].children.push(document.nodes.length - 1);
    const file = await writeFixture("static-prop.vrm", buildGlb(document));
    const { code, json } = await runJson([file, "--validate-only"]);

    expect(code).toBe(EXIT_OK);
    expect(checkStatus(json, "skinned_mesh")).toBe("pass");
  });
});

/**
 * Put VRMC_node_constraint on the fixture's nodes. The fixture's tree is
 * Root(0) -> { J_Bip_C_Hips(1), Body(2) }.
 */
function withConstraints(constraints, { declared = true, specVersion = "1.0" } = {}) {
  const document = vrm1Document();
  for (const [node, constraint] of Object.entries(constraints)) {
    document.nodes[node].extensions = {
      VRMC_node_constraint: { specVersion, constraint },
    };
  }
  if (declared) document.extensionsUsed = ["VRMC_vrm", "VRMC_node_constraint"];
  return document;
}

async function checkConstraints(name, document) {
  const file = await writeFixture(name, buildGlb(document));
  return runJson([file, "--validate-only"]);
}

describe("node constraints", () => {
  it("passes a file without constraints", async () => {
    const { json } = await checkConstraints("no-constraints.vrm", vrm1Document());

    expect(checkStatus(json, "node_constraints")).toBe("pass");
    expect(checkMessage(json, "node_constraints")).toBe("no node constraints");
  });

  it("passes constraints that do not depend on each other in a loop", async () => {
    const { code, json } = await checkConstraints(
      "constraints-ok.vrm",
      withConstraints({ 1: { rotation: { source: 2 } } }),
    );

    expect(code).toBe(EXIT_OK);
    expect(checkStatus(json, "node_constraints")).toBe("pass");
  });

  it("fails when two constraints use each other as source", async () => {
    const { code, json } = await checkConstraints(
      "constraints-loop.vrm",
      withConstraints({ 1: { rotation: { source: 2 } }, 2: { rotation: { source: 1 } } }),
    );

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "node_constraints")).toBe("fail");
    expect(checkMessage(json, "node_constraints")).toContain("J_Bip_C_Hips -> Body -> J_Bip_C_Hips");
  });

  it("fails when a constraint is its own source", async () => {
    const { code, json } = await checkConstraints(
      "constraints-self.vrm",
      withConstraints({ 2: { roll: { source: 2, rollAxis: "X" } } }),
    );

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "node_constraints")).toBe("fail");
  });

  // A constraint also waits on whatever constrains an ancestor of its source,
  // so a source under the constrained node waits on that node itself.
  it("fails when a constraint's source sits under the constrained node", async () => {
    const { code, json } = await checkConstraints(
      "constraints-ancestor.vrm",
      withConstraints({ 0: { rotation: { source: 2 } } }),
    );

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "node_constraints")).toBe("fail");
  });

  it("fails when a source is not a node in the file", async () => {
    const { code, json } = await checkConstraints(
      "constraints-bad-source.vrm",
      withConstraints({ 1: { rotation: { source: 99 } } }),
    );

    expect(code).toBe(EXIT_INVALID);
    expect(checkStatus(json, "node_constraints")).toBe("fail");
    expect(checkMessage(json, "node_constraints")).toContain("99");
  });

  it("ignores constraints when the extension is not declared used", async () => {
    const { json } = await checkConstraints(
      "constraints-undeclared.vrm",
      withConstraints({ 2: { rotation: { source: 2 } } }, { declared: false }),
    );

    expect(checkStatus(json, "node_constraints")).toBe("pass");
  });

  it("ignores a constraint with an unknown specVersion", async () => {
    const { json } = await checkConstraints(
      "constraints-unknown-spec.vrm",
      withConstraints({ 2: { rotation: { source: 2 } } }, { specVersion: "2.0" }),
    );

    expect(checkStatus(json, "node_constraints")).toBe("pass");
  });

  // When a node carries more than one constraint, roll wins over aim and aim
  // over rotation, so a looping rotation behind a valid roll never runs.
  it("reads roll before aim before rotation", async () => {
    const { json } = await checkConstraints(
      "constraints-priority.vrm",
      withConstraints({ 2: { roll: { source: 1, rollAxis: "X" }, rotation: { source: 2 } } }),
    );

    expect(checkStatus(json, "node_constraints")).toBe("pass");
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
    expect(stdout).toContain("--gender");
    expect(stdout).toContain("--heads-tall");
    expect(stdout).toContain("PERXONA_CONNECT_SECRET_KEY");
  });

  it("rejects an unknown option", async () => {
    const { code, stderr } = await runScript(["--nope", "x.vrm"]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("unknown option");
  });

  it.each([
    ["--gender", ["--heads-tall", "8"]],
    ["--heads-tall", ["--gender", "female"]],
  ])("requires %s unless --validate-only is given", async (missing, given) => {
    const file = await writeFixture("needs-body.vrm", buildGlb(vrm1Document()));
    const { code, stderr } = await runScript([file, ...given]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain(`${missing} is required`);
  });

  it("rejects an unknown gender", async () => {
    const file = await writeFixture("bad-gender.vrm", buildGlb(vrm1Document()));
    const { code, stderr } = await runScript([
      file,
      "--gender",
      "robot",
      "--heads-tall",
      "8",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("unknown --gender");
  });

  it("rejects an unsupported heads-tall", async () => {
    const file = await writeFixture(
      "bad-heads-tall.vrm",
      buildGlb(vrm1Document()),
    );
    const { code, stderr } = await runScript([
      file,
      "--gender",
      "female",
      "--heads-tall",
      "5",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("unsupported --heads-tall");
  });

  it.each([
    ["--gender=robot", "unknown --gender"],
    ["--heads-tall=5", "unsupported --heads-tall"],
  ])("checks %s given in the --flag=value form", async (flag, message) => {
    const file = await writeFixture("bad-equals.vrm", buildGlb(vrm1Document()));
    const { code, stderr } = await runScript([file, "--validate-only", flag]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain(message);
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
      "--gender",
      "female",
      "--heads-tall",
      "8",
    ]);

    expect(code).toBe(EXIT_USAGE);
    expect(stderr).toContain("PERXONA_CONNECT_SECRET_KEY");
  });

  it("reports a usage error as JSON when --json is given", async () => {
    const { code, stdout } = await runScript([
      "--json",
      "--gender",
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
