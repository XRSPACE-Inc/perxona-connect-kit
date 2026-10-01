/** Runs upload-vrm.sh the way a user would, and hands back what it printed. */

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCRIPT = path.join(HERE, "..", "upload-vrm.sh");

/**
 * `env` replaces the environment wholesale so a real PERXONA_CONNECT_SECRET_KEY
 * in the developer's shell can never reach a test.
 *
 * `VRM_UPLOADER_BASH` runs the script under a chosen interpreter instead of the
 * one its shebang finds. macOS ships bash 3.2 at /bin/bash, which is the floor
 * the script is written to, while a machine that also has a newer bash on PATH
 * would otherwise never exercise it.
 */
export function runScript(args, env = {}) {
  const bash = process.env.VRM_UPLOADER_BASH;
  const [command, commandArgs] = bash
    ? [bash, [SCRIPT, ...args]]
    : [SCRIPT, args];

  return new Promise((resolve) => {
    execFile(
      command,
      commandArgs,
      {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          VRM_UPLOADER_BASH: bash ?? "",
          ...env,
        },
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          code: error ? (error.code ?? 1) : 0,
          stdout,
          stderr,
        });
      },
    );
  });
}

export async function runJson(args, env = {}) {
  const result = await runScript([...args, "--json"], env);
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    json = null;
  }
  return { ...result, json };
}

export function checkStatus(json, id) {
  return json?.checks?.find((check) => check.id === id)?.status ?? null;
}

let workDir = null;

export async function makeWorkDir() {
  workDir = await mkdtemp(path.join(tmpdir(), "vrm-uploader-tests-"));
  return workDir;
}

export async function removeWorkDir() {
  if (!workDir) return;
  await rm(workDir, { recursive: true, force: true });
  workDir = null;
}

export async function writeFixture(name, contents) {
  const target = path.join(workDir, name);
  await writeFile(target, contents);
  return target;
}
