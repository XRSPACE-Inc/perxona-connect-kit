import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ARKIT_52, buildGlb, vrm1Document } from "./glb.mjs";
import {
  makeWorkDir,
  removeWorkDir,
  runJson,
  runScript,
  writeFixture,
} from "./run.mjs";

const EXIT_OK = 0;
const EXIT_UPLOAD_FAILED = 3;
const SECRET_KEY = "pxc_secret_for_tests";

let server = null;
let received = [];

/**
 * Stands in for the Connect API. The multipart body is asserted as raw text —
 * enough to prove which fields went out, with no parser to keep in step.
 */
function startStub(respond) {
  return new Promise((resolve) => {
    server = createServer((request, response) => {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        received.push({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: Buffer.concat(chunks).toString("latin1"),
        });
        respond(response);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function respondJson(status, payload) {
  return (response) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  };
}

/**
 * A `curl` that logs the arguments it was given and then becomes the real one.
 * Placed first on PATH, it is how a test can see what ended up in argv.
 */
async function recordingCurl() {
  const binDir = await mkdtemp(path.join(tmpdir(), "vrm-uploader-bin-"));
  const argvLog = path.join(binDir, "argv.txt");
  const realCurl = execFileSync("which", ["curl"], { encoding: "utf8" }).trim();
  const shim = path.join(binDir, "curl");

  await writeFile(
    shim,
    `#!/bin/sh\nprintf '%s\\n' "$@" > ${JSON.stringify(argvLog)}\nexec ${JSON.stringify(realCurl)} "$@"\n`,
  );
  await chmod(shim, 0o755);
  return { binDir, argvLog };
}

function formValue(body, name) {
  const match = body.match(
    new RegExp(`name="${name}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`),
  );
  return match ? match[1] : null;
}

beforeAll(makeWorkDir);
afterAll(removeWorkDir);

afterEach(async () => {
  received = [];
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
});

describe("a successful upload", () => {
  it("sends the key, the file and the form fields, then prints the avatar id", async () => {
    const baseUrl = await startStub(
      respondJson(200, { avatar_id: "01JTESTAVATAR" }),
    );
    const file = await writeFixture("upload-ok.vrm", buildGlb(vrm1Document()));

    const { code, json } = await runJson(
      [file, "--skeleton-type", "female", "--avatar-name", "My Avatar"],
      { PERXONA_CONNECT_SECRET_KEY: SECRET_KEY, PERXONA_API_BASE_URL: baseUrl },
    );

    expect(code).toBe(EXIT_OK);
    expect(json.upload).toEqual({
      status: "ok",
      http_status: 200,
      avatar_id: "01JTESTAVATAR",
    });

    expect(received).toHaveLength(1);
    const request = received[0];
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/api/v1/connect/assets/vrm/upload");
    expect(request.headers["x-connect-key"]).toBe(SECRET_KEY);
    expect(request.headers.authorization).toBeUndefined();
    expect(formValue(request.body, "skeleton_type")).toBe("female");
    expect(formValue(request.body, "avatar_name")).toBe("My Avatar");
    expect(request.body).toContain('name="vrm_file"');
    expect(request.body).toContain("glTF");
  });

  // The key reaches curl on stdin, never in its argv, where any user on a Linux
  // box could read it out of /proc. A curl placed ahead on PATH records the
  // argv it was handed, which is the only place that claim can be checked from.
  // The key carries the two characters curl's config format escapes, so the
  // header arriving intact also proves the encoding survives the trip.
  it("hands curl the key on stdin, never in its argv", async () => {
    const awkwardKey = 'pxc_a"b\\c';
    const baseUrl = await startStub(
      respondJson(200, { avatar_id: "01JQUOTE" }),
    );
    const file = await writeFixture("upload-key.vrm", buildGlb(vrm1Document()));
    const { binDir, argvLog } = await recordingCurl();

    const { code } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: awkwardKey,
      PERXONA_API_BASE_URL: baseUrl,
      PATH: `${binDir}:${process.env.PATH}`,
    });

    expect(code).toBe(EXIT_OK);
    expect(received[0].headers["x-connect-key"]).toBe(awkwardKey);

    const argv = await readFile(argvLog, "utf8");
    expect(argv).not.toContain(awkwardKey);
    expect(argv).not.toContain("X-Connect-Key");
    expect(argv).toContain("--config");
  });

  it("omits avatar_name when it was not given", async () => {
    const baseUrl = await startStub(
      respondJson(200, { avatar_id: "01JTESTAVATAR" }),
    );
    const file = await writeFixture(
      "upload-noname.vrm",
      buildGlb(vrm1Document()),
    );

    await runJson([file, "--skeleton-type", "male"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    });

    expect(received[0].body).not.toContain('name="avatar_name"');
  });

  // curl reads `;`, `@` and `<` inside a --form value as syntax: a name is cut
  // at the semicolon, refused outright, or replaced by the contents of a local
  // file. --form-string is what keeps a name the caller's.
  it.each([
    ["a semicolon", "Rin; idol"],
    ["a leading at sign", "@mascot"],
    ["a leading angle bracket", "</etc/hosts"],
    ["an equals sign", "Rin=v2"],
  ])(
    "sends an avatar name carrying %s verbatim",
    async (_label, avatarName) => {
      const baseUrl = await startStub(
        respondJson(200, { avatar_id: "01JNAME" }),
      );
      const file = await writeFixture(
        "upload-name.vrm",
        buildGlb(vrm1Document()),
      );

      const { code } = await runJson(
        [file, "--skeleton-type", "female", "--avatar-name", avatarName],
        {
          PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
          PERXONA_API_BASE_URL: baseUrl,
        },
      );

      expect(code).toBe(EXIT_OK);
      expect(formValue(received[0].body, "avatar_name")).toBe(avatarName);
    },
  );

  // After the `@`, curl reads `,` as another file and `;` as the start of a
  // parameter, and a quote or backslash ends the quoting that holds them off.
  // Any of them unhandled fails the upload before a request is made.
  it.each([
    ["a semicolon", "up;load.vrm"],
    ["a comma", "my avatar,v2.vrm"],
    ["a quote", 'quo"ted.vrm'],
    ["a backslash", "back\\slash.vrm"],
  ])("sends a file whose path carries %s", async (_label, fileName) => {
    const baseUrl = await startStub(respondJson(200, { avatar_id: "01JPATH" }));
    const file = await writeFixture(fileName, buildGlb(vrm1Document()));

    const { code, json } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    });

    expect(code).toBe(EXIT_OK);
    expect(json.upload.status).toBe("ok");
    expect(received[0].body).toContain("glTF");
  });

  it("sends the lip-sync engine the checks picked", async () => {
    const baseUrl = await startStub(
      respondJson(200, { avatar_id: "01JARKIT" }),
    );
    const withArkit = await writeFixture(
      "upload-arkit.vrm",
      buildGlb(vrm1Document({ targetNames: ARKIT_52 })),
    );
    const withoutArkit = await writeFixture(
      "upload-presets.vrm",
      buildGlb(vrm1Document()),
    );
    const env = {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    };

    await runJson([withArkit, "--skeleton-type", "female"], env);
    expect(formValue(received[0].body, "lipsync_mode")).toBe("xrlipsync");

    await runJson([withoutArkit, "--skeleton-type", "female"], env);
    expect(formValue(received[1].body, "lipsync_mode")).toBe("wlipsync");
  });

  it("tolerates a trailing slash on the base URL", async () => {
    const baseUrl = await startStub(
      respondJson(200, { avatar_id: "01JSLASH" }),
    );
    const file = await writeFixture(
      "upload-slash.vrm",
      buildGlb(vrm1Document()),
    );

    const { code } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: `${baseUrl}/`,
    });

    expect(code).toBe(EXIT_OK);
    expect(received[0].url).toBe("/api/v1/connect/assets/vrm/upload");
  });
});

describe("a rejected upload", () => {
  it("exits 3 and passes the API's own error back", async () => {
    const baseUrl = await startStub(
      respondJson(422, {
        code: 15003,
        details: "Uploaded GLB does not contain a supported VRM extension.",
      }),
    );
    const file = await writeFixture("upload-422.vrm", buildGlb(vrm1Document()));

    const { code, json } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    });

    expect(code).toBe(EXIT_UPLOAD_FAILED);
    expect(json.valid).toBe(true);
    expect(json.upload.status).toBe("failed");
    expect(json.upload.http_status).toBe(422);
    expect(json.upload.error.code).toBe(15003);
    expect(json.upload.error.details).toContain("VRM extension");
  });

  it("passes a FastAPI validation error back unchanged", async () => {
    const baseUrl = await startStub(
      respondJson(422, {
        detail: [
          {
            loc: ["body", "skeleton_type"],
            msg: "unexpected value",
            type: "enum",
          },
        ],
      }),
    );
    const file = await writeFixture(
      "upload-enum.vrm",
      buildGlb(vrm1Document()),
    );

    const { code, json } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    });

    expect(code).toBe(EXIT_UPLOAD_FAILED);
    expect(json.upload.error.detail[0].loc).toEqual(["body", "skeleton_type"]);
  });

  it("prints the error on the human report too", async () => {
    const baseUrl = await startStub(
      respondJson(413, {
        code: 15002,
        details: "File size exceeds the maximum limit of 50 MB.",
      }),
    );
    const file = await writeFixture("upload-413.vrm", buildGlb(vrm1Document()));

    const { code, stdout, stderr } = await runScript(
      [file, "--skeleton-type", "female"],
      {
        PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
        PERXONA_API_BASE_URL: baseUrl,
      },
    );

    expect(code).toBe(EXIT_UPLOAD_FAILED);
    expect(stdout).toContain("Upload failed with HTTP 413");
    expect(stderr).toContain("15002");
  });

  it("keeps a non-JSON error body as raw text", async () => {
    const baseUrl = await startStub((response) => {
      response.writeHead(502, { "content-type": "text/html" });
      response.end("<html>502 Bad Gateway</html>");
    });
    const file = await writeFixture("upload-502.vrm", buildGlb(vrm1Document()));

    const { code, json } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    });

    expect(code).toBe(EXIT_UPLOAD_FAILED);
    expect(json.upload.error.raw).toContain("502 Bad Gateway");
  });

  it("exits 3 when the API cannot be reached at all", async () => {
    const file = await writeFixture(
      "upload-unreachable.vrm",
      buildGlb(vrm1Document()),
    );

    const { code, json } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: "http://127.0.0.1:1",
    });

    expect(code).toBe(EXIT_UPLOAD_FAILED);
    expect(json.upload.status).toBe("failed");
    expect(json.upload.http_status).toBeNull();
  });
});

describe("a file that fails the checks", () => {
  it("is never uploaded", async () => {
    const baseUrl = await startStub(
      respondJson(200, { avatar_id: "01JSHOULDNOTHAPPEN" }),
    );
    const file = await writeFixture(
      "upload-noskin.vrm",
      buildGlb(vrm1Document({ skinnedNode: false })),
    );

    const { code, json } = await runJson([file, "--skeleton-type", "female"], {
      PERXONA_CONNECT_SECRET_KEY: SECRET_KEY,
      PERXONA_API_BASE_URL: baseUrl,
    });

    expect(code).toBe(2);
    expect(json.upload.status).toBe("skipped");
    expect(received).toHaveLength(0);
  });
});
