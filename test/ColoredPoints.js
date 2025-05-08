// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec2 a_Position;
  attribute vec3 a_Color;

  varying vec3 v_Color;
  void main() {
    v_Color = a_Color;
    gl_Position = vec4(a_Position, 0.0, 1.0);
  }
  `;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;

  varying vec3 v_Color;
  void main() {
    gl_FragColor = vec4(v_Color, 1.0);
  }
  `;

let canvas;
let gl;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }
}

function setupUIFunctions() {}

function main() {
  setupUIFunctions();
  setupWebGL();
  connectVariablesToGLSL();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  let vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  let vertices = new Float32Array([
    -1, 1, 0, 0, 0, 1, 1, 0, 0, 1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 1, -1, -1, 0, 0,
    0, 1, -1, 0, 0, 1,
  ]);
  const F_SIZE = vertices.BYTES_PER_ELEMENT;

  let a_Position = gl.getAttribLocation(gl.program, "a_Position");
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, F_SIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  let a_Color = gl.getAttribLocation(gl.program, "a_Color");
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, F_SIZE * 5, F_SIZE * 2);
  gl.enableVertexAttribArray(a_Color);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function convertCoordsEvToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}
