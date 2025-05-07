// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalPositionMatrix;
  void main() {
    gl_Position = u_GlobalPositionMatrix * u_ModelMatrix * a_Position;
  }
  `;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
  `;

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalPositionMatrix;

let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_globalAngle = 0;
let g_headAngle = 0;
let g_tailAngle = 0;
let g_tailAngle2 = 0;
var g_startTime = performance.now() / 1000;
var g_seconds = performance.now() / 1000 - g_startTime;
var g_animationOn = false;
var g_stats;

let g_isDragging = false;
let g_previousMousePosition = { x: 0, y: 0 };
let g_rotation = { x: 0, y: 0 };

let g_specialAnimation = false;
let g_specialAnimationTime = 2;

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
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.log("Failed to get the storage location of u_FragColor");
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

  var iden = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalPositionMatrix, false, iden.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, iden.elements);
}

function setupUI() {
  g_stats = new Stats();
  g_stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(g_stats.dom);

  let canvas = document.getElementById("webgl");
  //canvas.addEventListener('mousedown', (e) => {
  //    g_isDragging = true;
  //    g_previousMousePosition = { x: e.clientX, y: e.clientY };
  //});

  //canvas.addEventListener('mousemove', (e) => {
  //    if (!g_isDragging) return;
  //
  //    const deltaX = e.clientX - g_previousMousePosition.x;
  //    const deltaY = e.clientY - g_previousMousePosition.y;
  //
  //    const sensitivity = 0.5;
  //
  //    g_rotation.y += deltaX * sensitivity;
  //    g_rotation.x += deltaY * sensitivity;
  //
  //    //in radians, probably should fix this
  //    const maxRotationX = 90; // degrees
  //    const minRotationX = -90;
  //    g_rotation.x = Math.max(minRotationX, Math.min(maxRotationX, g_rotation.x));
  //
  //    g_previousMousePosition = { x: e.clientX, y: e.clientY };
  //});

  //canvas.addEventListener('mouseup', (e) => {
  //    isDragging = false;
  //});
  //
  //canvas.addEventListener('mouseleave', (e) => {
  //    isDragging = false;
  //});

  canvas.addEventListener('click', (event) => {
    if (event.shiftKey) {
      console.log('Shift+Click detected on canvas!');
      g_specialAnimation = true;
      g_startTime = performance.now() / 1000;
    }
  });

  // resize the canvas to fill browser window dynamically
  window.addEventListener('resize', resizeCanvas, false);
        
  function resizeCanvas() {
    size = Math.min(window.innerWidth, window.innerHeight)
    canvas.width = size;
    canvas.height = size;

    //canvas.
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
  connectVariablesToGLSL();

  gl.clearColor(0.9725, 0.8863, 0.5176, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  
  g_stats.begin();
  renderScene();

  g_stats.end();

  requestAnimationFrame(tick);
}

function updateRotationMatrix() {
  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  globalRotMat.rotate(g_rotation.x, 1, 0, 0);
  globalRotMat.rotate(g_rotation.y, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalPositionMatrix, false, globalRotMat.elements);
}

function renderScene() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   updateRotationMatrix();

  //render blocks
}

