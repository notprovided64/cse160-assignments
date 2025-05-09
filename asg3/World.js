const dirtTexturePath = "./textures/dirt.png";
const woodTexturePath = "./textures/wood.png";
const stoneTexturePath = "./textures/stone.png";

// should be in same order as block types
const texturePaths = [dirtTexturePath, woodTexturePath, stoneTexturePath];

var VSHADER_SOURCE = `
uniform mat4 u_GlobalPositionMatrix;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

attribute vec4 a_Position;
attribute vec2 a_UV;
attribute float a_TexIndex;

varying vec2 v_UV;
varying float v_TexIndex;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalPositionMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
  v_TexIndex = a_TexIndex;
}
`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_Textures[8];

varying vec2 v_UV;
varying float v_TexIndex;

void main() {
  int index = int(v_TexIndex);
  vec4 color;

  //color = texture2D(u_Textures[index], v_UV);
  if (index == 0) {
      color = texture2D(u_Textures[0], v_UV);
  } else if (index == 1) {
      color = texture2D(u_Textures[1], v_UV);
  } else if (index == 2) {
      color = texture2D(u_Textures[2], v_UV);
  } else if (index == 3) {
      color = texture2D(u_Textures[3], v_UV);
  } else if (index == 4) {
      color = texture2D(u_Textures[4], v_UV);
  } else if (index == 5) {
      color = texture2D(u_Textures[5], v_UV);
  } else if (index == 6) {
      color = texture2D(u_Textures[6], v_UV);
  } else {
      color = texture2D(u_Textures[7], v_UV);
  }

  gl_FragColor = color;
}
`;

// gl context
let canvas;
let gl;

// webgl variables
let a_Position;
let a_UV;
let a_TexIndex;
let u_ModelMatrix;
let u_GlobalPositionMatrix;
let u_Textures;
let u_ViewMatrix;
let u_ProjectionMatrix;

let g_Vbo;

//performance
var g_stats;

// timing info
var g_startTime = performance.now() / 1000;
var g_seconds = performance.now() / 1000 - g_startTime;

// controls
let g_isDragging = false;
let g_previousMousePosition = { x: 0, y: 0 };
let g_rotation = { x: 0, y: 0 };
let g_position = { x: 0.0, y: 0.0 };

//block data
let g_testChunk = newChunk();

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
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
  gl.enableVertexAttribArray(a_TexIndex);

  const elem = Float32Array.BYTES_PER_ELEMENT;
  const stride = 6 * elem;

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 3 * elem);
  gl.vertexAttribPointer(a_TexIndex, 1, gl.FLOAT, false, stride, 5 * elem);
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

  a_TexIndex = gl.getAttribLocation(gl.program, "a_TexIndex");
  if (a_TexIndex < 0) {
    console.log("Failed to get the storage location of a_TexIndex");
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
        gl.LINEAR_MIPMAP_LINEAR,
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

    g_rotation.y += deltaX * sensitivity;
    g_rotation.x += deltaY * sensitivity;

    //in radians, probably should fix this
    const maxRotationX = 90; // degrees
    const minRotationX = -90;
    g_rotation.x = Math.max(minRotationX, Math.min(maxRotationX, g_rotation.x));

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
    size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = size;
    canvas.height = size;
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

function main() {
  setupUI();
  setupWebGL();

  console.log(
    gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) +
      " texture units to work with",
  );

  gl.clearColor(0.9725, 0.8863, 0.5176, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //chunkFillLayer(g_testChunk, 0, BlockType.DIRT);
  //chunkSetBlock(g_testChunk, BlockType.STONE, [16, 1, 31]);
  chunkSetBlock(g_testChunk, BlockType.WOOD, [16, 2, 31]);
  //chunkSetBlock(g_testChunk, BlockType.STONE, [16, 3, 31]);
  //chunkSetBlock(g_testChunk, BlockType.STONE, [16, 6, 31]);

  vertices = chunkGenerateMesh(g_testChunk);
  for (let i = 5; i < vertices.length; i += 6) {
    console.log(vertices[i]);
  }

  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  g_stats.begin();

  updateRotationMatrix();
  renderScene();

  g_stats.end();
  requestAnimationFrame(tick);
}

function updateRotationMatrix() {}

function renderScene() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // setup render matrices
  var globalRotMat = new Matrix4();
  globalRotMat.rotate(g_rotation.x, 1, 0, 0);
  globalRotMat.rotate(g_rotation.y, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalPositionMatrix, false, globalRotMat.elements);

  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  var viewMat = new Matrix4();
  viewMat.setLookAt(0, 1, 12, 0, 0, 100, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  //generate chunk mesh
  vertices = chunkGenerateMesh(g_testChunk);
  //render blocks

  modelMat = new Matrix4();
  modelMat.translate(-CHUNK_SIZE.x / 2, -2, -CHUNK_SIZE.z / 2);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMat.elements);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
}
