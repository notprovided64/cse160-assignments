const dirtTexturePath = "./textures/dirt.png";
const woodTexturePath = "./textures/wood.png";
const stoneTexturePath = "./textures/stone.png";

const TARGET_FRAME_TIME = 1.0 / 60.0;

const PLAYER_WIDTH = 0.5;
const PLAYER_HALF_WIDTH = PLAYER_WIDTH / 2;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE_TO_HEAD = 0.2;
const PLAYER_EYE_TO_GROUND = PLAYER_HEIGHT - PLAYER_EYE_TO_HEAD;

const TERMINAL_VELOCITY = -0.25;

const GRAVITY = -0.02;
const JUMP_STRENGTH = 0.5; // how strong the jump is

// should be in same order as block types
const texturePaths = [dirtTexturePath, woodTexturePath, stoneTexturePath];

let VSHADER_SOURCE = `
uniform mat4 u_GlobalPositionMatrix;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_TexWeights;

varying vec2 v_UV;
varying vec3 v_TexWeights;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalPositionMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
  v_TexWeights = a_TexWeights;
}
`;

// Fragment shader program
let FSHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_Textures[3];
uniform vec4 u_Color;
uniform float u_ColorWeight;

varying vec2 v_UV;
varying vec3 v_TexWeights;

void main() {
  vec4 color0 = texture2D(u_Textures[0], v_UV);
  vec4 color1 = texture2D(u_Textures[1], v_UV);
  vec4 color2 = texture2D(u_Textures[2], v_UV);

  vec4 color = color0 * v_TexWeights[0] +
               color1 * v_TexWeights[1] +
               color2 * v_TexWeights[2];

  color = mix(color, u_Color, u_ColorWeight);

  gl_FragColor = color;
}
`;

// gl context
let canvas;
let gl;
let vaoExt;

// webgl variables
let a_Position;
let a_UV;
let a_TexWeights;
let u_ModelMatrix;
let u_GlobalPositionMatrix;
let u_Textures;
let u_ViewMatrix;
let u_ProjectionMatrix;

let g_Vao;
let g_Vbo;
let g_vertices;

//performance
var g_stats;

// timing info
var g_prevTime = performance.now() / 1000;
var g_dTime = 0;

// controls
var g_movementKeys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  rotateL: false,
  rotateR: false,
  sprint: false,
};

let g_selectedBlock = BlockType.DIRT;
let g_grounded = false;
let g_yvel = 0;

let g_pointerLocked = false;
//let g_isDragging = false;
//let g_previousMousePosition = { x: 0, y: 0 };

let g_yaw = 90;
let g_pitch = 0;

var g_eye = [0, 0, 5];
var g_at = [0, 0, -100];
var g_up = [0, 1, 0];

let g_viewMat = new Matrix4();
let g_modelMat = new Matrix4();

//block data
let g_testChunk = new Uint8Array();

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: false,
    antialias: true,
  });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  vaoExt = gl.getExtension("OES_vertex_array_object");
  if (!vaoExt) {
    console.log("VAO not supported!");
  }

  gl.enable(gl.DEPTH_TEST);
  connectVariablesToGLSL();

  loadTexturesSeq(texturePaths).then((textures) => {
    textures.forEach((tex, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    });

    //realistically this code needs to be ran again if we ever try and render something else

    gl.uniform1iv(
      u_Textures,
      textures.map((_, i) => i),
    );
  });

  g_Vao = vaoExt.createVertexArrayOES();
  vaoExt.bindVertexArrayOES(g_Vao);

  g_Vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_Vbo);

  // setup vertex data mapping
  gl.enableVertexAttribArray(a_Position);
  gl.enableVertexAttribArray(a_UV);
  gl.enableVertexAttribArray(a_TexWeights);

  const elem = Float32Array.BYTES_PER_ELEMENT;
  const stride = 8 * elem;

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 3 * elem);
  gl.vertexAttribPointer(a_TexWeights, 3, gl.FLOAT, false, stride, 5 * elem);

  vaoExt.bindVertexArrayOES(null);
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  if (a_UV < 0) {
    console.log("Failed to get the storage location of a_UV");
    return;
  }

  a_TexWeights = gl.getAttribLocation(gl.program, "a_TexWeights");
  if (a_TexWeights < 0) {
    console.log("Failed to get the storage location of a_TexWeights");
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.log("Failed to get the storage location of u_ModelMatrix");
    return;
  }

  u_GlobalPositionMatrix = gl.getUniformLocation(
    gl.program,
    "u_GlobalPositionMatrix",
  );
  if (!u_GlobalPositionMatrix) {
    console.log("Failed to get the storage location of u_GlobalPositionMatrix");
    return;
  }
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  if (!u_ViewMatrix) {
    console.log("Failed to get the storage location of u_ViewMatrix");
    return;
  }
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  if (!u_ProjectionMatrix) {
    console.log("Failed to get the storage location of u_ProjectionMatrix");
    return;
  }

  u_Textures = gl.getUniformLocation(gl.program, "u_Textures");
  if (!u_Textures) {
    console.log("Failed to get the storage location of u_Textures");
    return;
  }

  u_ColorWeight = gl.getUniformLocation(gl.program, "u_ColorWeight");
  if (!u_ColorWeight) {
    console.log("Failed to get the storage location of u_cwieght");
    return;
  }

  u_Color = gl.getUniformLocation(gl.program, "u_Color");
  if (!u_Color) {
    console.log("Failed to get the storage location of u_colloh");
    return;
  }

  var iden = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalPositionMatrix, false, iden.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, iden.elements);
}

function loadTextures(urls) {
  return Promise.all(urls.map((url) => loadTexture(url)));
}

function saveWorld() {
  const defaultName = "world.wld";
  const filename = prompt("Enter filename:", defaultName);
  if (!filename) return;

  const blob = new Blob([g_testChunk], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".wld") ? filename : `${filename}.wld`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadWorld() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".wld";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      g_testChunk = new Uint8Array(arrayBuffer);
      updateChunkMesh();
      console.log("Loaded world:", g_testChunk);
      g_eye = [CHUNK_SIZE.x / 2, 3, CHUNK_SIZE.z / 2];
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

async function loadDefaultWorld() {
  try {
    const response = await fetch("default.wld");
    if (!response.ok) throw new Error("Failed to load world file");

    const arrayBuffer = await response.arrayBuffer();
    g_testChunk = new Uint8Array(arrayBuffer);
    g_vertices = chunkGenerateMesh(g_testChunk);
    updateChunkMesh();
    console.log("Loaded world:", g_testChunk);
    g_eye = [CHUNK_SIZE.x / 2, 3, CHUNK_SIZE.z / 2];
  } catch (err) {
    console.error("Error loading world:", err);
  }
}

async function loadTexturesSeq(urls) {
  const textures = [];
  for (const url of urls) {
    const texture = await loadTexture(url);
    textures.push(texture);
  }
  return textures;
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // placeholder
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([128, 128, 128, 255]),
    );

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );

      // always using powers of two (and no atlas) so we can mipmap :)
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR,
        gl.LINEAR,
      );
      //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

      resolve(texture);
    };

    image.onerror = () => reject(new Error(`failed to load image ${url}`));
    image.src = url;
  });
}

function setupUI() {
  g_stats = new Stats();
  g_stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(g_stats.dom);

  let canvas = document.getElementById("webgl");
  //canvas.addEventListener("mousedown", (e) => {
  //
  //  g_isDragging = true;
  //  g_previousMousePosition = { x: e.clientX, y: e.clientY };
  //  console.log("stardrag");
  //});
  //

  //canvas.addEventListener("mousemove", (e) => {
  //  if (!g_isDragging) return;
  //
  //  const deltaX = e.clientX - g_previousMousePosition.x;
  //  const deltaY = e.clientY - g_previousMousePosition.y;
  //
  //  const sensitivity = 0.5;
  //
  //  g_yaw += deltaX * sensitivity;
  //  g_pitch -= deltaY * sensitivity;
  //
  //  g_pitch = Math.max(-89, Math.min(89, g_pitch));
  //
  //  g_previousMousePosition = { x: e.clientX, y: e.clientY };
  //  console.log("yraaaaaaa");
  //});
  //
  //canvas.addEventListener("mouseup", (e) => {
  //  g_isDragging = false;
  //  console.log("enduh");
  //});
  //
  //canvas.addEventListener("mouseleave", (e) => {
  //  g_isDragging = false;
  //});

  canvas.addEventListener("mousedown", (event) => {
    if (event.button == 0) {
      if (!g_pointerLocked) {
        canvas.requestPointerLock();
      } else {
        const hit = getLookAtBlock();
        console.log(hit);
        if (hit) {
          chunkSetBlock(g_testChunk, BlockType.AIR, hit);
          g_vertices = chunkGenerateMesh(g_testChunk);
          updateChunkMesh();
        }
      }
    } else if (event.button == 2) {
      console.log("wiclick.");
      const hit = getLookAtBlocMinusOne();
      console.log(hit);
      if (hit) {
        chunkSetBlock(g_testChunk, g_selectedBlock, hit);
        g_vertices = chunkGenerateMesh(g_testChunk);
        updateChunkMesh();
      }
    }
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      console.log("Pointer locked");
      g_pointerLocked = true;
      document.addEventListener("mousemove", onMouseMove, false);
    } else {
      console.log("Pointer unlocked");
      g_pointerLocked = false;
      document.removeEventListener("mousemove", onMouseMove, false);
    }
  });

  function onMouseMove(e) {
    const sensitivity = 0.1;
    g_yaw += e.movementX * sensitivity;
    g_pitch -= e.movementY * sensitivity;

    g_pitch = Math.max(-89, Math.min(89, g_pitch));

    //updateRotationMatrix();
  }

  // resize the canvas to fill browser window dynamically
  window.addEventListener("resize", resizeCanvas, false);

  function resizeCanvas() {
    //size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    var projMat = new Matrix4();
    projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements); // may need to specify program here later
  }

  resizeCanvas();

  document.onkeydown = keydown;
  document.onkeyup = keyup;
}

function convertCoordsEvToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function keydown(ev) {
  switch (ev.code) {
    case "KeyW":
      g_movementKeys.forward = true;
      break;
    case "KeyS":
      g_movementKeys.backward = true;
      break;
    case "KeyA":
      g_movementKeys.left = true;
      break;
    case "KeyD":
      g_movementKeys.right = true;
      break;
    case "KeyQ":
      g_movementKeys.rotateL = true;
      break;
    case "KeyE":
      g_movementKeys.rotateR = true;
      break;
    case "Space":
      g_movementKeys.up = true;
      break;
    case "ShiftLeft":
      g_movementKeys.down = true;
      break;
    case "Digit1":
      selectBlock(BlockType.DIRT);
      break;
    case "Digit2":
      selectBlock(BlockType.WOOD);
      break;
    case "Digit3":
      selectBlock(BlockType.STONE);
      break;
    default:
      break;
  }
}

function selectBlock(blockType) {
  g_selectedBlock = blockType;

  document
    .querySelectorAll("#toolbar button[data-block]")
    .forEach((btn) => btn.classList.remove("selected"));

  const blockName = Object.keys(BlockType).find(
    (key) => BlockType[key] === blockType,
  );

  const selectedBtn = document.querySelector(
    `#toolbar button[data-block="${blockName}"]`,
  );
  if (selectedBtn) selectedBtn.classList.add("selected");
}

function keyup(ev) {
  switch (ev.code) {
    case "KeyW":
      g_movementKeys.forward = false;
      break;
    case "KeyS":
      g_movementKeys.backward = false;
      break;
    case "KeyA":
      g_movementKeys.left = false;
      break;
    case "KeyD":
      g_movementKeys.right = false;
      break;
    case "KeyQ":
      g_movementKeys.rotateL = false;
      break;
    case "KeyE":
      g_movementKeys.rotateR = false;
      break;
    case "Space":
      g_movementKeys.up = false;
      break;
    case "ShiftLeft":
      g_movementKeys.down = false;
      break;
    default:
      break;
  }
}

function updateMovement() {
  // should calc this from pitch, not forward vec
  var forward = new Vector3([
    -g_viewMat.elements[8],
    0,
    -g_viewMat.elements[10],
  ]);
  var right = new Vector3([g_viewMat.elements[0], 0, g_viewMat.elements[2]]);

  forward.normalize();
  right.normalize();

  let moveSpeed = 0.15 * g_dTime;
  let turnSpeedMod = 20;

  // copy current position for collission detection
  let nextPos = [...g_eye];

  if (g_movementKeys.forward) {
    nextPos[0] -= forward.elements[0] * moveSpeed;
    nextPos[1] += forward.elements[1] * moveSpeed;
    nextPos[2] += forward.elements[2] * moveSpeed;
  }
  if (g_movementKeys.backward) {
    nextPos[0] += forward.elements[0] * moveSpeed;
    nextPos[2] -= forward.elements[2] * moveSpeed;
  }
  if (g_movementKeys.left) {
    nextPos[0] -= right.elements[0] * moveSpeed;
    nextPos[2] += right.elements[2] * moveSpeed;
  }
  if (g_movementKeys.right) {
    nextPos[0] += right.elements[0] * moveSpeed;
    nextPos[2] -= right.elements[2] * moveSpeed;
  }
  if (g_movementKeys.up && g_grounded) {
    console.log("jumped");
    g_yvel = JUMP_STRENGTH;
    g_grounded = false;
  }

  g_yvel += GRAVITY;
  g_yvel = Math.max(g_yvel, TERMINAL_VELOCITY);
  nextPos[1] = g_eye[1] + g_yvel * g_dTime;
  //if (g_movementKeys.down) {
  //  nextPos[1] -= moveSpeed;
  //}

  // test axes separately to handle moving properly
  const testX = [nextPos[0], g_eye[1], g_eye[2]];
  const testY = [g_eye[0], nextPos[1], g_eye[2]];
  const testZ = [g_eye[0], g_eye[1], nextPos[2]];

  if (!checkCollision(testX, g_testChunk)) {
    g_eye[0] = nextPos[0];
  }
  if (!checkCollision(testY, g_testChunk)) {
    g_eye[1] = nextPos[1];
    g_grounded = false;
  } else {
    if (g_yvel < 0) {
      g_grounded = true;
    }

    g_yvel = 0;
  }
  if (!checkCollision(testZ, g_testChunk)) {
    g_eye[2] = nextPos[2];
  }

  if (g_movementKeys.rotateL) {
    g_yaw -= moveSpeed * turnSpeedMod;
  }
  if (g_movementKeys.rotateR) {
    g_yaw += moveSpeed * turnSpeedMod;
  }
}
function main() {
  setupWebGL();
  setupUI();

  console.log(
    gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) +
      " texture units to work with",
  );

  gl.clearColor(0.9725, 0.8863, 0.5176, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //chunkSetBlock(g_testChunk, BlockType.STONE, [16, 1, 31]);
  //chunkSetBlock(g_testChunk, BlockType.WOOD, [16, 2, 31]);
  //chunkSetBlock(g_testChunk, BlockType.STONE, [16, 3, 31]);
  //chunkSetBlock(g_testChunk, BlockType.STONE, [16, 6, 31]);
  //chunkSetBlock(g_testChunk, BlockType.STONE, [8, 1, 31]);

  // need to make a chunk by default so that vertices can render on the first frame.
  // or could wait to laod world to start requestAnimationFrame
  g_testChunk = newChunk();
  g_vertices = chunkGenerateMesh(g_testChunk);

  loadDefaultWorld();

  //setup projection matrix
  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  //g_modelMat.translate(-CHUNK_SIZE.x / 2, -2, -CHUNK_SIZE.z / 2);
  //gl.uniformMatrix4fv(u_ModelMatrix, false, g_modelMat.elements);
  //

  // currently we're basing player position around g_eye
  // this is not ideal and should be abstracted
  g_eye = [CHUNK_SIZE.x / 2, 3, CHUNK_SIZE.z / 2];

  requestAnimationFrame(tick);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function tick() {
  let currentTime = performance.now() / 1000;
  let rawDTime = currentTime - g_prevTime;
  g_prevTime = currentTime;
  g_dTime = rawDTime / TARGET_FRAME_TIME;
  g_dTime = Math.min(g_dTime, 2.0);

  g_stats.begin();

  updateMovement();
  updateRotationMatrix();

  renderScene();

  g_stats.end();
  requestAnimationFrame(tick);
}

function checkCollision(newPos, chunk) {
  //get the min and max blocks we're in in whatever new pos we're trying to go to
  const minX = Math.floor(newPos[0] - PLAYER_HALF_WIDTH);
  const maxX = Math.floor(newPos[0] + PLAYER_HALF_WIDTH);
  const minY = Math.floor(newPos[1] - PLAYER_EYE_TO_GROUND);
  const maxY = Math.floor(newPos[1] + PLAYER_EYE_TO_HEAD);
  const minZ = Math.floor(newPos[2] - PLAYER_HALF_WIDTH);
  const maxZ = Math.floor(newPos[2] + PLAYER_HALF_WIDTH);

  //go through each block and see if we're hitting anything
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (chunkIsSolidBlock(chunk, [x, y, z])) {
          return true;
        }
      }
    }
  }
  return false;
}

function updateRotationMatrix() {
  g_at[0] =
    g_eye[0] + Math.cos(toRadians(g_yaw)) * Math.cos(toRadians(g_pitch));
  g_at[1] = g_eye[1] + Math.sin(toRadians(g_pitch));
  g_at[2] =
    g_eye[2] + Math.sin(toRadians(g_yaw)) * Math.cos(toRadians(g_pitch));

  g_viewMat.setLookAt(
    g_eye[0],
    g_eye[1],
    g_eye[2],
    g_at[0],
    g_at[1],
    g_at[2],
    g_up[0],
    g_up[1],
    g_up[2],
  );
}

function selectBlock(blockType) {
  g_selectedBlock = blockType;
}

function getLookAtBlock() {
  // there is a more efficient way to have and use this information given what is already in the code
  const forwardX = g_at[0] - g_eye[0];
  const forwardY = g_at[1] - g_eye[1];
  const forwardZ = g_at[2] - g_eye[2];

  const forward = new Vector3([forwardX, forwardY, forwardZ]);
  forward.normalize();

  let rayPos = g_eye.slice();
  const stepSize = 0.1;
  const maxDistance = 10.0;

  for (let d = 0; d < maxDistance; d += stepSize) {
    rayPos[0] += forward.elements[0] * stepSize;
    rayPos[1] += forward.elements[1] * stepSize;
    rayPos[2] += forward.elements[2] * stepSize;

    const blockX = Math.floor(rayPos[0]);
    const blockY = Math.floor(rayPos[1]);
    const blockZ = Math.floor(rayPos[2]);
    console.log(blockX + " " + blockY + " " + blockZ);

    if (
      blockX >= 0 &&
      blockX < CHUNK_SIZE.x &&
      blockY >= 0 &&
      blockY < CHUNK_SIZE.y &&
      blockZ >= 0 &&
      blockZ < CHUNK_SIZE.z
    ) {
      if (chunkIsSolidBlock(g_testChunk, [blockX, blockY, blockZ])) {
        return [blockX, blockY, blockZ];
      }
    }
  }
}

function getLookAtBlocMinusOne() {
  const forwardX = g_at[0] - g_eye[0];
  const forwardY = g_at[1] - g_eye[1];
  const forwardZ = g_at[2] - g_eye[2];

  const forward = new Vector3([forwardX, forwardY, forwardZ]);
  forward.normalize();

  let rayPos = g_eye.slice();
  const stepSize = 0.1;
  const maxDistance = 10.0;

  let lastEmptyBlock = null;

  for (let d = 0; d < maxDistance; d += stepSize) {
    rayPos[0] += forward.elements[0] * stepSize;
    rayPos[1] += forward.elements[1] * stepSize;
    rayPos[2] += forward.elements[2] * stepSize;

    const blockX = Math.floor(rayPos[0]);
    const blockY = Math.floor(rayPos[1]);
    const blockZ = Math.floor(rayPos[2]);

    if (
      blockX >= 0 &&
      blockX < CHUNK_SIZE.x &&
      blockY >= 0 &&
      blockY < CHUNK_SIZE.y &&
      blockZ >= 0 &&
      blockZ < CHUNK_SIZE.z
    ) {
      const pos = [blockX, blockY, blockZ];
      if (chunkIsSolidBlock(g_testChunk, pos)) {
        return lastEmptyBlock;
      } else {
        lastEmptyBlock = pos;
      }
    }
  }

  return null; // No solid block hit within maxDistance
}
function updateChunkMesh() {
  g_vertices = chunkGenerateMesh(g_testChunk);

  vaoExt.bindVertexArrayOES(g_Vao);
  gl.uniform1f(u_ColorWeight, 0.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_Vbo);
  gl.bufferData(gl.ARRAY_BUFFER, g_vertices, gl.STATIC_DRAW);
  vaoExt.bindVertexArrayOES(null);
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMat.elements);

  vaoExt.bindVertexArrayOES(g_Vao);
  gl.drawArrays(gl.TRIANGLES, 0, g_vertices.length / 8);
}
