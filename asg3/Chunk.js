const CHUNK_SIZE = { x: 64, y: 64, z: 64 };

function newChunk() {
  return new Uint8Array(CHUNK_SIZE.x * CHUNK_SIZE.y * CHUNK_SIZE.z).fill(0);
}

function isValidChunk(chunk) {
  return (
    chunk instanceof Uint8Array &&
    chunk.length == CHUNK_SIZE.x * CHUNK_SIZE.y * CHUNK_SIZE.z
  );
}

function getBlockIndex(x, y, z) {
  return x + CHUNK_SIZE.x * y + CHUNK_SIZE.x * CHUNK_SIZE.y * z;
}

function chunkGetBlock(chunk, [x, y, z]) {
  if (
    x < 0 ||
    x >= CHUNK_SIZE.x ||
    y < 0 ||
    y >= CHUNK_SIZE.y ||
    z < 0 ||
    z >= CHUNK_SIZE.z
  ) {
    return BlockType.AIR; // we lazy
  }
  return chunk[getBlockIndex(x, y, z)];
}

function chunkIsSolidBlock(chunk, [x, y, z]) {
  const block = chunkGetBlock(chunk, [x, y, z]);
  return block !== BlockType.AIR;
}

function chunkFillLayer(chunk, yIndex, blockId) {
  if (!isValidChunk(chunk)) {
    throw new TypeError("invalid chunk data");
  }
  if (yIndex >= CHUNK_SIZE.y) {
    throw new ValueError("invalid layerIndex");
  }
  // we can just pray that blockid is set correctly lol

  // should maybe be correct
  offset = yIndex * CHUNK_SIZE.x;
  for (let i = 0; i < CHUNK_SIZE.x; i++) {
    for (let j = 0; j < CHUNK_SIZE.z; j++)
      chunk[offset + i + j * CHUNK_SIZE.x * CHUNK_SIZE.y] = blockId;
  }
}

function chunkSetBlock(chunk, blockId, coords) {
  if (!isValidChunk(chunk)) {
    throw new TypeError("invalid chunk data");
  }
  if (
    !Array.isArray(coords) ||
    coords.length !== 3 ||
    !coords.every(Number.isInteger)
  ) {
    throw new TypeError("invalid coords");
  }

  const index = (x, y, z) =>
    x + CHUNK_SIZE.x * y + CHUNK_SIZE.x * CHUNK_SIZE.y * z;

  let x = coords[0];
  let y = coords[1];
  let z = coords[2];

  chunk[index(x, y, z)] = blockId;
}

function chunkGenerateMesh(chunk) {
  if (!isValidChunk(chunk)) {
    throw new TypeError("invalid chunk data");
  }

  const index = (x, y, z) =>
    x + CHUNK_SIZE.x * y + CHUNK_SIZE.x * CHUNK_SIZE.y * z;

  // TODO could move this to block,js
  const faceNormals = {
    front: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    top: [0, 1, 0],
    bottom: [0, -1, 0],
  };

  // gonna keep this separate from chunkIsSolidBlock
  // since air blocks are basically the absence of a block
  const isAir = (x, y, z) => {
    if (
      x < 0 ||
      y < 0 ||
      z < 0 ||
      x >= CHUNK_SIZE.x ||
      y >= CHUNK_SIZE.y ||
      z >= CHUNK_SIZE.z
    )
      return true;

    return chunk[index(x, y, z)] === BlockType.AIR;
  };

  const vertices = [];
  for (let z = 0; z < CHUNK_SIZE.z; z++) {
    for (let y = 0; y < CHUNK_SIZE.y; y++) {
      for (let x = 0; x < CHUNK_SIZE.x; x++) {
        const blockId = chunk[index(x, y, z)];
        if (blockId == BlockType.AIR) {
          continue;
        }

        for (const [face, faceVertices] of Object.entries(BLOCK_GEOMETRY)) {
          const [dx, dy, dz] = faceNormals[face];

          const nx = x + dx,
            ny = y + dy,
            nz = z + dz;
          if (!isAir(nx, ny, nz)) {
            continue;
          }

          let texW0 = 0,
            texW1 = 0,
            texW2 = 0;
          if (blockId === BlockType.DIRT) {
            texW0 = 1;
          } else if (blockId === BlockType.WOOD) {
            texW1 = 1;
          } else if (blockId === BlockType.STONE) {
            texW2 = 1;
          }

          // adding face vertices and uv map to
          for (const [vx, vy, vz, u, v] of faceVertices) {
            // layer given through blockId - 1, starts at Wood, goes to stone and so on
            vertices.push(vx + x, vy + y, vz + z, u, v, texW0, texW1, texW2);
          }
        }
      }
    }
  }

  return new Float32Array(vertices);
}

function renderChunkMesh(vertices) {}
