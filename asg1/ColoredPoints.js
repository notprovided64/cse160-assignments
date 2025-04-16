// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
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
let u_Size;

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

  u_Size = gl.getUniformLocation(gl.program, "u_Size");
  if (!u_Size) {
    console.log("Failed to get the storage location of u_Size");
    return;
  }
}

function setupUIFunctions() {
  document.getElementById("r-slider").addEventListener("mouseup", function () {
    g_selectedColor[0] = this.value / 100;
  });
  document.getElementById("g-slider").addEventListener("mouseup", function () {
    g_selectedColor[1] = this.value / 100;
  });
  document.getElementById("b-slider").addEventListener("mouseup", function () {
    g_selectedColor[2] = this.value / 100;
  });
  document
    .getElementById("size-slider")
    .addEventListener("mouseup", function () {
      g_selectedSize = this.value;
    });
  document.getElementById("clear-btn").addEventListener("mouseup", function () {
    g_shapes_list = [];
    renderAllShapes();
  });
}

let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
function main() {
  setupUIFunctions();
  setupWebGL();
  connectVariablesToGLSL();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function (ev) {
    if (ev.buttons == 1) {
      click(ev);
    }
  };
  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function convertCoordsEvToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function renderAllShapes() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapes_list.length;
  for (var i = 0; i < len; i++) {
    g_shapes_list[i].render();
  }
}

var g_shapes_list = [];

function click(ev) {
  let [x, y] = convertCoordsEvToGL(ev);

  // Store the coordinates to g_points array
  let point = new Point();
  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapes_list.push(point);

  renderAllShapes();
}
