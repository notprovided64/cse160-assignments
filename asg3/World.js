const dirtTexturePath = "./textures/dirt.png";
const woodTexturePath = "./textures/wood.png";
const stoneTexturePath = "./textures/stone.png";

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

varying vec2 v_UV;
varying vec3 v_TexWeights;

void main() {
  vec4 color0 = texture2D(u_Textures[0], v_UV);
  vec4 color1 = texture2D(u_Textures[1], v_UV);
  vec4 color2 = texture2D(u_Textures[2], v_UV);

  vec4 color = color0 * v_TexWeights[0] +
               color1 * v_TexWeights[1] +
               color2 * v_TexWeights[2];

  gl_FragColor = color;
}
`;

// gl context
let canvas;
let gl;

// webgl variables
let a_Position;
let a_UV;
let a_TexWeights;
let u_ModelMatrix;
let u_GlobalPositionMatrix;
let u_Textures;
let u_ViewMatrix;
let u_ProjectionMatrix;

let g_Vbo;
let g_vertices;

//performance
var g_stats;

// timing info
var g_startTime = performance.now() / 1000;
var g_seconds = performance.now() / 1000 - g_startTime;

// controls
var g_movementKeys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  rotateL: false,
  rotateR: false,
  sprint: false,
};

let g_isDragging = false;
let g_previousMousePosition = { x: 0, y: 0 };

let g_yaw = 90;
let g_pitch = 0;

var g_eye = [0, 0, 3];
var g_at = [0, 0, -100];
var g_up = [0, 1, 0];

let g_viewMat = new Matrix4();
let g_modelMat = new Matrix4();

//block data
let g_testChunk = newChunk();

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: false, antialias: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  connectVariablesToGLSL();

  loadTexturesSeq(texturePaths).then((textures) => {
    textures.forEach((tex, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    });

    gl.uniform1iv(
      u_Textures,
      textures.map((_, i) => i),
    );
  });

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

  var iden = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalPositionMatrix, false, iden.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, iden.elements);
}

function loadTextures(urls) {
  return Promise.all(urls.map((url) => loadTexture(url)));
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
  canvas.addEventListener("mousedown", (e) => {
    g_isDragging = true;
    g_previousMousePosition = { x: e.clientX, y: e.clientY };
    console.log("stardrag");
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!g_isDragging) return;

    const deltaX = e.clientX - g_previousMousePosition.x;
    const deltaY = e.clientY - g_previousMousePosition.y;

    const sensitivity = 0.5;

    g_yaw += deltaX * sensitivity;
    g_pitch -= deltaY * sensitivity;

    g_pitch = Math.max(-89, Math.min(89, g_pitch));

    g_previousMousePosition = { x: e.clientX, y: e.clientY };
    console.log("yraaaaaaa");
  });

  canvas.addEventListener("mouseup", (e) => {
    g_isDragging = false;
    console.log("enduh");
  });

  canvas.addEventListener("mouseleave", (e) => {
    g_isDragging = false;
  });

  canvas.addEventListener("click", (event) => {
    if (event.shiftKey) {
      console.log("Shift+Click detected on canvas!");
    }
  });

  // resize the canvas to fill browser window dynamically
  window.addEventListener("resize", resizeCanvas, false);

  function resizeCanvas() {
    //size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
}

function convertCoordsEvToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function updateMovement(ev) {
  var forward = new Vector3([-g_viewMat.elements[8], -g_viewMat.elements[9], -g_viewMat.elements[10]]);
  var right = new Vector3([g_viewMat.elements[0], g_viewMat.elements[1], g_viewMat.elements[2]]);

  forward.normalize();
  right.normalize();

  var moveSpeed = 0.2;

  if (g_movementKeys.forward) {
    g_eye[0] -= forward.elements[0] * moveSpeed;
    //g_eye[1] += forward.elements[1] * moveSpeed;
    g_eye[2] += forward.elements[2] * moveSpeed;
  }

  if (g_movementKeys.backward) {
    g_eye[0] += forward.elements[0] * moveSpeed;
    //g_eye[1] -= forward.elements[1] * moveSpeed;
    g_eye[2] -= forward.elements[2] * moveSpeed;
  }

  if (g_movementKeys.left) {
    g_eye[0] -= right.elements[0] * moveSpeed;
    //g_eye[1] -= right.elements[1] * moveSpeed;
    g_eye[2] += right.elements[2] * moveSpeed;
  }

  if (g_movementKeys.right) {
    g_eye[0] += right.elements[0] * moveSpeed;
    //g_eye[1] += right.elements[1] * moveSpeed;
    g_eye[2] -= right.elements[2] * moveSpeed;
  }

  if (g_movementKeys.rotateL) {
    g_yaw -= moveSpeed * 10;
  }
  if (g_movementKeys.rotateR) {
    g_yaw += moveSpeed * 10;
  }
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
    case "KeyShift":
      g_movementKeys.rotateR = true;
      break;
    default:
      break;
  }
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
    default:
      break;
  }
}

function main() {
  setupUI();
  setupWebGL();

  document.onkeydown = keydown;
  document.onkeyup = keyup;

  console.log(
    gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) +
      " texture units to work with",
  );

  gl.clearColor(0.9725, 0.8863, 0.5176, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  chunkFillLayer(g_testChunk, 0, BlockType.DIRT);
  chunkSetBlock(g_testChunk, BlockType.STONE, [16, 1, 31]);
  chunkSetBlock(g_testChunk, BlockType.WOOD, [16, 2, 31]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [16, 3, 31]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [16, 6, 31]);


  // pillars  in corners of world
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 1, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 2, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 3, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 4, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 5, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 6, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 7, CHUNK_SIZE.z - 1]);

  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 1, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 2, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 3, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 4, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 5, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 6, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 7, CHUNK_SIZE.z - 1]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 1, CHUNK_SIZE.z - 1]);

  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 1, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 2, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 3, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 4, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 5, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 6, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [0, 7, 0]);

  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 1, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 2, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 3, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 4, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 5, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 6, 0]);
  chunkSetBlock(g_testChunk, BlockType.STONE, [CHUNK_SIZE.x - 1, 7, 0]);

  g_vertices = chunkGenerateMesh(g_testChunk);

  //setup projection matrix
  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  g_modelMat.translate(-CHUNK_SIZE.x / 2, -2, -CHUNK_SIZE.z / 2);
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_modelMat.elements);

  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  g_stats.begin();

  updateMovement();
  updateRotationMatrix();
  renderScene();

  g_stats.end();
  requestAnimationFrame(tick);
}

function updateRotationMatrix() {
  //didn't put g_eye/at/up into Vector3s...
  // this is probably prett yslow
  const radYaw = (Math.PI / 180) * g_yaw;
  const radPitch = (Math.PI / 180) * g_pitch;

  const front = [
    Math.cos(radPitch) * Math.cos(radYaw),
    Math.sin(radPitch),
    Math.cos(radPitch) * Math.sin(radYaw)
  ];

  const length = Math.hypot(front[0], front[1], front[2]);
  front[0] /= length;
  front[1] /= length;
  front[2] /= length;

  g_at = [
    g_eye[0] + front[0],
    g_eye[1] + front[1],
    g_eye[2] + front[2]
  ];
}

function renderScene() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  g_viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2],g_up[0], g_up[1], g_up[2]);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMat.elements);

  gl.bufferData(gl.ARRAY_BUFFER, g_vertices, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, g_vertices.length / 8);
}
