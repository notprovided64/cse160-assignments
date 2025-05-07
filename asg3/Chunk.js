// information about chunk goes here, including how to render
//
const CHUNK_SIZE = {x: 32, y: 32, z:32}

function newChunk() {
  return new Uint8Array(CHUNK_SIZE.x * CHUNK_SIZE.y * CHUNK_SIZE.z).fill(0);
}

function isValidChunk(chunk) {
  return (chunk instanceof Uint8Array) && chunk.length == (CHUNK_SIZE.x * CHUNK_SIZE.y * CHUNK_SIZE.z);
}

function chunkFillLayer(chunk, yIndex, blockId) {
  if (!isValidChunk(chunk)) {
    throw new TypeError('invalid chunk data');
  }
  if (yIndex >= CHUNK_SIZE.y) {
    throw new ValueError('invalid layerIndex');
  }
  // we can just pray that blockid is set correctly lol

  // should maybe be correct
  offset = yIndex * CHUNK_SIZE.x;
  for (let i = 0; i < CHUNK_SIZE.x; i++) {
    for (let j = 0 < j < CHUNK_SIZE.z)
    chunk[offset + i + (j * CHUNK_SIZE.x * CHUNK_SIZE.y)] = blockId;
  }
}

function chunkSetBlock(chunk, blockId, coords) {
  if (!isValidChunk(chunk)) {
    throw new TypeError('invalid chunk data');
  }
  if (
    !Array.isArray(coords) ||
    coords.length !== 3 ||
    !coords.every(Number.isInteger)
  ) {
    throw new TypeError('invalid coords');
  }

  x = coords[0];
  y = coords[1];
  z = coords[2];

  chunk[x + (CHUNK_SIZE.x * y) + (CHUNK_SIZE.x * CHUNK_SIZE.y * z)] = blockId;
}



class
