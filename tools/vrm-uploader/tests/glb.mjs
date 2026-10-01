/**
 * Builds .vrm files byte by byte so each check has something that fails only it.
 *
 * A .vrm is a GLB: a 12-byte header, then a JSON chunk holding the glTF
 * document, then an optional binary chunk. Nothing here needs a real model —
 * upload-vrm.sh only ever reads the header and the JSON.
 */

const GLTF_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK_TYPE = 0x4e4f534a; // "JSON"
const BIN_CHUNK_TYPE = 0x004e4942; // "BIN\0"

/** The 52 blendshapes ARKit defines, spelled as the avatar runtime spells them. */
export const ARKIT_52 = [
  "browInnerUp",
  "browDownLeft",
  "browDownRight",
  "browOuterUpLeft",
  "browOuterUpRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  "noseSneerLeft",
  "noseSneerRight",
  "jawOpen",
  "jawForward",
  "jawLeft",
  "jawRight",
  "mouthFunnel",
  "mouthPucker",
  "mouthLeft",
  "mouthRight",
  "mouthRollUpper",
  "mouthRollLower",
  "mouthShrugUpper",
  "mouthShrugLower",
  "mouthClose",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "tongueOut",
];

function padTo4(buffer, padByte) {
  const remainder = buffer.length % 4;
  if (remainder === 0) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(4 - remainder, padByte)]);
}

/**
 * Assembles a GLB. Every header field can be overridden so a test can produce a
 * container that is wrong in exactly one way.
 */
export function buildGlb(document, options = {}) {
  const {
    magic = GLTF_MAGIC,
    version = 2,
    jsonChunkType = JSON_CHUNK_TYPE,
    bin = null,
    declaredTotalLength = null,
    declaredJsonChunkLength = null,
    rawJson = null,
  } = options;

  const jsonChunk = padTo4(
    Buffer.from(rawJson ?? JSON.stringify(document), "utf8"),
    0x20,
  );
  const binChunk = bin === null ? null : padTo4(Buffer.from(bin), 0x00);

  const parts = [];

  const header = Buffer.alloc(12);
  header.writeUInt32LE(magic, 0);
  header.writeUInt32LE(version, 4);
  parts.push(header);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(declaredJsonChunkLength ?? jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(jsonChunkType, 4);
  parts.push(jsonHeader, jsonChunk);

  if (binChunk) {
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binChunk.length, 0);
    binHeader.writeUInt32LE(BIN_CHUNK_TYPE, 4);
    parts.push(binHeader, binChunk);
  }

  const glb = Buffer.concat(parts);
  glb.writeUInt32LE(declaredTotalLength ?? glb.length, 8);
  return glb;
}

const MOUTH_PRESETS_VRM1 = ["aa", "ih", "ou", "ee", "oh"];
const MOUTH_PRESETS_VRM0 = ["a", "i", "u", "e", "o"];

function morphTargets(count) {
  return Array.from({ length: count }, (_, index) => ({
    POSITION: index + 10,
  }));
}

/**
 * A glTF document that passes every check: embedded resources, a mesh bound to
 * a skin, and mouth presets that bind a morph target.
 */
export function vrm1Document(overrides = {}) {
  const {
    targetNames = MOUTH_PRESETS_VRM1,
    targetCount = null,
    mouthPresets = MOUTH_PRESETS_VRM1,
    boundPresets = true,
    skinnedNode = true,
    externalUri = null,
    extensions = null,
    orphanMeshTargetNames = null,
  } = overrides;

  const preset = {};
  for (const name of mouthPresets) {
    preset[name] = {
      morphTargetBinds: boundPresets ? [{ node: 2, index: 0, weight: 1 }] : [],
    };
  }

  const bodyNode = { name: "Body", mesh: 0 };
  if (skinnedNode) bodyNode.skin = 0;

  return {
    asset: { version: "2.0", generator: "perxona-vrm-uploader-tests" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: "Root", children: [1, 2] },
      { name: "J_Bip_C_Hips", translation: [0, 0.9, 0] },
      bodyNode,
    ],
    meshes: [
      {
        name: "Body",
        primitives: [
          {
            attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 },
            targets: morphTargets(targetCount ?? targetNames.length),
          },
        ],
        extras: { targetNames },
      },
      // No node points at this one, so nothing loads it.
      ...(orphanMeshTargetNames
        ? [
            {
              name: "Orphan",
              primitives: [
                {
                  attributes: { POSITION: 0 },
                  targets: morphTargets(orphanMeshTargetNames.length),
                },
              ],
              extras: { targetNames: orphanMeshTargetNames },
            },
          ]
        : []),
    ],
    skins: [{ joints: [1], inverseBindMatrices: 3 }],
    materials: [{ name: "Skin", extensions: { VRMC_materials_mtoon: {} } }],
    images: externalUri ? [{ uri: externalUri }] : [{ bufferView: 0 }],
    buffers: [{ byteLength: 16 }],
    extensions: extensions ?? {
      VRMC_vrm: {
        specVersion: "1.0",
        meta: { name: "Test Avatar", authors: ["tests"] },
        humanoid: { humanBones: { hips: { node: 1 } } },
        expressions: { preset },
      },
    },
  };
}

/** The same model authored as VRM 0.x, where the mouth shapes live elsewhere. */
export function vrm0Document(overrides = {}) {
  const { boundPresets = true, ...rest } = overrides;

  const blendShapeGroups = MOUTH_PRESETS_VRM0.map((presetName) => ({
    name: presetName.toUpperCase(),
    presetName,
    binds: boundPresets ? [{ mesh: 0, index: 0, weight: 100 }] : [],
  }));

  return vrm1Document({
    ...rest,
    extensions: {
      VRM: {
        specVersion: "0.0",
        exporterVersion: "UniVRM-0.99.0",
        meta: { title: "Test Avatar" },
        humanoid: { humanBones: [{ bone: "hips", node: 1 }] },
        blendShapeMaster: { blendShapeGroups },
        materialProperties: [{ shader: "VRM/MToon" }],
      },
    },
  });
}
