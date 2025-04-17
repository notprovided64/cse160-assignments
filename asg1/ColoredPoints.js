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

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 20;
let g_drawingOn = false;
let g_rotationAngle = 0;
let g_funMode = false;
let g_spinRate = 0.2

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
  document.getElementById("circle-slider").addEventListener("mouseup", function () {
    g_selectedSegments= this.value;
  });
  document.getElementById("fun-slider").addEventListener("mouseup", function () {
    g_spinRate = this.value / 100;
  });
  document
    .getElementById("size-slider")
    .addEventListener("mouseup", function () {
      g_selectedSize = this.value;
    });
  document.getElementById("clear-btn").addEventListener("mouseup", function () {
    g_shapes_list = [];
    g_drawingOn = false;
    renderAllShapes();
  });
  document.getElementById("draw-btn").addEventListener("mouseup", function () {
    g_drawingOn = true;
    setupDrawing();
    renderAllShapes();
  });
  document.getElementById("point-btn").addEventListener("mouseup", function () {
    g_selectedType = POINT;
  });
  document.getElementById("triangle-btn").addEventListener("mouseup", function () {
    g_selectedType = TRIANGLE;
  });
  document.getElementById("circle-btn").addEventListener("mouseup", function () {
    g_selectedType = CIRCLE;
  });
  document.getElementById('fun-toggle').addEventListener('change', function() {
    if (this.checked) {
      g_funMode = true;
    } else {
      g_funMode = false;
      g_rotationAngle = 0;
    }
  });

}

const MAGIKARP_RED    = "#DF7669";
const MAGIKARP_YELLOW = "#FFD998";
const MAGIKARP_WHITE  = "#E7B9BB";

function setupDrawing(){

  // main body
  drawColoredTriangle([0, 0, -0.6, 0.2, -0.6, -0.2], MAGIKARP_RED);
  drawColoredTriangle([0, 0, -0.2, 0.6, 0.2, 0.6], MAGIKARP_RED);
  drawColoredTriangle([0, 0, -0.2, 0.6, -0.6, 0.2], MAGIKARP_RED);
  drawColoredTriangle([0, 0, 0.2, 0.6, 0.6, 0.2], MAGIKARP_RED);
  drawColoredTriangle([0, 0, 0.6, 0.2, 0.6, -0.2], MAGIKARP_RED);
  drawColoredTriangle([0, 0, 0.6, -0.2, 0.2, -0.6], MAGIKARP_RED);
  drawColoredTriangle([0, 0, 0.2, -0.6, -0.2, -0.6], MAGIKARP_RED);
  drawColoredTriangle([0, 0, -0.2, -0.6, -0.6, -0.2], MAGIKARP_RED);

  // tail
  drawColoredTriangle([0.6, 0.2, 0.6, -0.2, 1.0, 0.2], MAGIKARP_WHITE);
  drawColoredTriangle([1.0, -0.2, 0.6, -0.2, 1.0, 0.2],  MAGIKARP_WHITE);

  drawColoredTriangle([0.6, 0.2, 0.9, 0.4, 0.9, 0.2], MAGIKARP_RED);
  drawColoredTriangle([0.9, 0.4, 0.9, 0.3, 1, 0.3], MAGIKARP_RED);
  drawColoredTriangle([0.9, 0.2, 0.9, 0.3, 1, 0.3], MAGIKARP_RED);
  drawColoredTriangle([0.9, 0.2, 1, 0.2, 1, 0.3], MAGIKARP_RED);

  drawColoredTriangle([0.6, -0.2, 0.9, -0.4, 0.9, -0.2], MAGIKARP_RED);
  drawColoredTriangle([0.9, -0.4, 0.9, -0.3, 1.0, -0.3], MAGIKARP_RED);
  drawColoredTriangle([0.9, -0.2, 0.9, -0.3, 1.0, -0.3], MAGIKARP_RED);
  drawColoredTriangle([0.9, -0.2, 1.0, -0.2, 1.0, -0.3], MAGIKARP_RED);

  drawColoredTriangle([0.6, 0.2, 1.0, 0.3, 1.0, 0.2],  MAGIKARP_WHITE);
  drawColoredTriangle([0.6, -0.2, 1.0, -0.3, 1.0, -0.2],  MAGIKARP_WHITE);

  //fin
  drawColoredTriangle([-0.2, -0.4, 0.0, -0.4, 0.3, -0.1],  MAGIKARP_WHITE);
  drawColoredTriangle([0.0, -0.4, 0.3, -0.1, 0.5, -0.1],  MAGIKARP_WHITE);

  //eye
  drawColoredTriangle([-0.2, 0.4, -0.35, 0.2, -0.05, 0.2],  MAGIKARP_WHITE);
  drawColoredTriangle([-0.2, 0, -0.35, 0.2, -0.05, 0.2],  MAGIKARP_WHITE);

  //crown (top)
  drawColoredTriangle([-0.2, 0.6, -0.1, 0.6, -0.2, 0.8],  MAGIKARP_YELLOW);
  drawColoredTriangle([-0.2, 0.6, 0.1, 0.6, -0.05, 0.95],  MAGIKARP_YELLOW);
  drawColoredTriangle([-0.1, 0.6, 0.2, 0.6, 0.15, 0.9],  MAGIKARP_YELLOW);

  //crown (bottom)
  drawColoredTriangle([0.2, -0.6, 0.1, -0.6, 0.2, -0.8],  MAGIKARP_YELLOW);
  drawColoredTriangle([0.2, -0.6, -0.1, -0.6, 0.05, -0.95],  MAGIKARP_YELLOW);
  drawColoredTriangle([0.1, -0.6, -0.2, -0.6, -0.15, -0.9],  MAGIKARP_YELLOW);

  //whisker
  drawColoredTriangle([-0.45, 0, -0.5, 0, -0.3, -0.5],  MAGIKARP_YELLOW);
  drawColoredTriangle([-0.3, -0.5, -0.5, 0, -0.35, -0.5],  MAGIKARP_YELLOW);

  drawColoredTriangle([-0.3, -0.5, -0.5, -0.65, -0.35, -0.5],  MAGIKARP_YELLOW);
  drawColoredTriangle([-0.55, -0.65, -0.5, -0.65, -0.35, -0.5],  MAGIKARP_YELLOW);

  drawColoredTriangle([-0.55, -0.65, -0.5, -0.65, -0.35, -1],  MAGIKARP_YELLOW);
  drawColoredTriangle([-0.5, -0.65, -0.35, -1, -0.3, -0.95],  MAGIKARP_YELLOW);


}

function main() {
  setupUIFunctions();
  setupWebGL();
  connectVariablesToGLSL();

  canvas.onmousedown = click;
  canvas.onmousemove = function (ev) {
    if (ev.buttons == 1) {
      click(ev);
    }
  };
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  requestAnimationFrame(tick);
}

function tick() {
  if (g_funMode) {
    g_rotationAngle += g_spinRate;
    if (g_rotationAngle >= 360) g_rotationAngle -= 360;
  }
  renderAllShapes();
  requestAnimationFrame(tick);
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
  if (g_drawingOn)
    setupDrawing()

  var len = g_shapes_list.length;
  for (var i = 0; i < len; i++) {
    g_shapes_list[i].render();
  }
}

var g_shapes_list = [];

function click(ev) {
  let [x, y] = convertCoordsEvToGL(ev);

  if (g_selectedType == POINT) {
      let point = new Point();
      point.position = [x, y];
      point.color = g_selectedColor.slice();
      point.size = g_selectedSize;
      g_shapes_list.push(point);
  } else if (g_selectedType == TRIANGLE){
      let point = new Triangle();
      point.position = [x, y];
      point.color = g_selectedColor.slice();
      point.size = g_selectedSize;
      g_shapes_list.push(point);
  } else {
      let point = new Circle();
      point.segments = g_selectedSegments;
      point.position = [x, y];
      point.color = g_selectedColor.slice();
      point.size = g_selectedSize;
      g_shapes_list.push(point);
  }

  if (!g_funMode) {
    renderAllShapes();
  }
}
