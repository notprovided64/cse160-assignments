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

function setupUIFunctions() {
  document
    .getElementById("angle_slider")
    .addEventListener("mousemove", function () {
      g_globalAngle = this.value;
    });
  document
    .getElementById("head_slider")
    .addEventListener("mousemove", function () {
      g_headAngle = this.value;
    });
  document
    .getElementById("tail_slider")
    .addEventListener("mousemove", function () {
      g_tailAngle = this.value;
    });
  document
    .getElementById("tail_slider2")
    .addEventListener("mousemove", function () {
      g_tailAngle2 = this.value;
    });
  document
    .getElementById("animation_checkbox")
    .addEventListener("change", function () {
      if (this.checked) {
        g_animationOn = true;
        g_startTime = performance.now() / 1000;
      } else {
        g_animationOn = false;
      }
    });

  let canvas = document.getElementById("webgl");
  canvas.addEventListener("mousedown", (e) => {
    g_isDragging = true;
    g_previousMousePosition = { x: e.clientX, y: e.clientY };
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
  });

  canvas.addEventListener("mouseup", (e) => {
    isDragging = false;
  });

  canvas.addEventListener("mouseleave", (e) => {
    isDragging = false;
  });

  canvas.addEventListener("click", (event) => {
    if (event.shiftKey) {
      console.log("Shift+Click detected on canvas!");
      g_specialAnimation = true;
      g_startTime = performance.now() / 1000;
    }
  });
}

const MAGIKARP_RED = [0.8745, 0.4627, 0.4118, 1];
const MAGIKARP_YELLOW = [1.0, 0.851, 0.5961, 1];
const MAGIKARP_WHITE = [0.9059, 0.7255, 0.7333, 1];

function main() {
  setupUIFunctions();
  setupWebGL();
  connectVariablesToGLSL();

  g_stats = new Stats();
  g_stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(g_stats.dom);

  canvas.onmousedown = click;
  canvas.onmousemove = function (ev) {
    if (ev.buttons == 1) {
      click(ev);
    }
  };
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  //console.log(g_seconds);
  g_stats.begin();
  renderScene();

  if (g_specialAnimation) {
    if (g_seconds > g_specialAnimationTime) {
      g_specialAnimation = false;
      g_startTime = performance.now() / 1000;
    }
  }
  g_stats.end();

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

function renderScene() {
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  globalRotMat.rotate(g_rotation.x, 1, 0, 0);
  globalRotMat.rotate(g_rotation.y, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalPositionMatrix, false, globalRotMat.elements);

  var spine = new Cube();
  spine.color = [0.0, 1.0, 0.0, 1.0];
  spine.matrix.translate(-0.35, -0.1, -0.1);
  if (g_animationOn) {
    spine.matrix.translate(0, Math.sin(g_seconds / 2) * 0.05, 0);
  }
  if (g_specialAnimation) {
    spine.matrix.rotate(Math.sin(g_seconds) * 360, 0, 1, 1);
    if (Math.sin(g_seconds) * 360 > 350) {
      g_specialAnimation = false;
    }
  }
  spine.matrix.rotate(0, 0, 0, 1);
  var spineMat = new Matrix4(spine.matrix);
  spine.matrix.translate(-0, 0, 0.05);
  spine.matrix.scale(0.5, 0.2, 0.1);
  //spine.render();

  var main_front = new Cube();
  main_front.color = [1.0, 0.0, 0.0, 1.0];
  main_front.matrix = new Matrix4(spineMat);
  main_front.matrix.translate(-0.2, -0.3, 0);

  //translate to different point before rotation to rotate around different axis
  main_front.matrix.translate(0.4, 0.4, 0.1);
  var headJointMat = new Matrix4(main_front.matrix);
  //if manual
  if (g_animationOn) {
    main_front.matrix.rotate(Math.sin(g_seconds / 2) * 30, 0, 1, 0);
  } else {
    //TODO
    main_front.matrix.rotate(g_headAngle, 0, 1, 0);
  }
  main_front.matrix.translate(-0.4, -0.4, -0.1);

  //main_front.matrix.translate(0, -0.7, 0);
  var main_frontMat = new Matrix4(main_front.matrix);
  main_front.matrix.scale(0.4, 0.8, 0.2);
  main_front.render();

  //head joint
  var headJoint = new Cube();
  headJoint.color = [0.0, 0.0, 1.0, 1.0];
  headJoint.matrix = headJointMat;
  headJoint.matrix.scale(0.1, 0.9, 0.1);
  //headJoint.render();

  var main_front2 = new Cube();
  main_front2.color = [1.0, 0.0, 0.0, 1.0];
  main_front2.matrix = new Matrix4(main_frontMat);
  main_front2.matrix.translate(-0.15, 0.1, 0);
  //main_front2.matrix.rotate(0, 0, 0, 1);
  var main_front2Mat = new Matrix4(main_front2.matrix);
  main_front2.matrix.scale(0.2, 0.6, 0.2);
  main_front2.render();

  //var eye = new Cube();
  //eye.color = [1.0, 1.0, 1.0, 1.0];
  //eye.matrix = new Matrix4(main_front2Mat)
  //eye.matrix.translate(0.25, 0.45, -0.025);
  ////eye.matrix.rotate(0, 0, 0, 1);
  //var eyeMat = new Matrix4(eye.matrix)
  //eye.matrix.scale(0.15, 0.15, 0.25);
  //eye.render();
  //
  //// pupil
  //var eye = new Cube();
  //eye.color = [.0, .0, .0, 1.0];
  //eye.matrix = new Matrix4(eyeMat)
  //eye.matrix.translate(0.05, 0.05, -0.01);
  ////eye.matrix.rotate(0, 0, 0, 1);
  //var eyeMat = new Matrix4(eye.matrix)
  //eye.matrix.scale(0.04, 0.04, 0.27);
  //eye.render();

  // frill looking thing
  var frill = new Cube();
  frill.color = [0.9, 0.0, 0.0, 1.0];
  frill.matrix = new Matrix4(main_frontMat);
  frill.matrix.translate(0.2, -0.02, -0.025);
  frill.matrix.rotate(-10, 0, 0, 1);
  frillMat = new Matrix4(frill.matrix);
  frill.matrix.scale(0.08, 0.85, 0.25);
  frill.render();

  var finL = new Cube();
  finL.color = [0.9, 0.0, 0.0, 1.0];
  finL.matrix = new Matrix4(main_frontMat);
  finL.matrix.translate(0.25, 0.3, -0.05);
  finL.matrix.rotate(-45, 0.5, 0, 1);
  // -15 - 15 + 15
  if (g_animationOn) {
    finL.matrix.rotate(Math.sin(g_seconds / 0.2) * 15 + 15, -0, 0.5, 0);
  }
  //finL.matrix.rotate(g_headAngle, -0, 0.5, 0);
  finLMat = new Matrix4(finL.matrix);
  finL.matrix.scale(0.08, 0.35, 0.05);
  finL.render();

  var finL2 = new Cube();
  finL2.color = [0.9, 0.0, 0.0, 1.0];
  finL2.matrix = new Matrix4(finLMat);
  finL2.matrix.translate(0.0, 0.35, 0);
  finL2.matrix.rotate(-45, 0, 0, 1);
  finL2Mat = new Matrix4(finL.matrix);
  finL2.matrix.scale(0.08, 0.35, 0.05);
  finL2.render();

  var finInnerL = new TriangularPrism();
  finInnerL.color = [0.9, 1, 1, 1.0];
  finInnerL.matrix = new Matrix4(finLMat);
  finInnerL.matrix.translate(0.14, 0.3, 0.01);
  finInnerL.matrix.rotate(65, 0, 0, 1);
  finInnerLMat = new Matrix4(finInnerL.matrix);
  finInnerL.matrix.scale(0.55, 0.1, 0.03);
  finInnerL.render();

  var finInnerL2 = new TriangularPrism();
  finInnerL2.color = [0.9, 1, 1, 1.0];
  finInnerL2.matrix = new Matrix4(finInnerLMat);
  finInnerL2.matrix.translate(0, -0.1, 0.01);
  //finInnerL2.matrix.rotate(65, 0, 0, 1);
  finInnerL2.matrix.scale(0.55, -0.1, 0.03);
  finInnerL2.render();

  var finR = new Cube();
  finR.color = [0.9, 0.0, 0.0, 1.0];
  finR.matrix = new Matrix4(main_frontMat);
  finR.matrix.translate(0.25, 0.3, 0.2);
  finR.matrix.rotate(-45, -0.5, 0, 1);
  finRMat = new Matrix4(finR.matrix);
  finR.matrix.scale(0.08, 0.35, 0.05);
  finR.render();

  var finR2 = new Cube();
  finR2.color = [0.9, 0.0, 0.0, 1.0];
  finR2.matrix = new Matrix4(finRMat);
  finR2.matrix.translate(0.0, 0.35, 0);
  finR2.matrix.rotate(-45, 0, 0, 1);
  finR2Mat = new Matrix4(finR2.matrix);
  finR2.matrix.scale(0.08, 0.35, 0.05);
  finR2.render();

  var finInnerR = new TriangularPrism();
  finInnerR.color = [0.9, 1, 1, 1.0];
  finInnerR.matrix = new Matrix4(finRMat);
  finInnerR.matrix.translate(0.14, 0.3, 0.01);
  finInnerR.matrix.rotate(65, 0, 0, 1);
  finInnerRMat = new Matrix4(finInnerR.matrix);
  finInnerR.matrix.scale(0.55, 0.1, 0.03);
  finInnerR.render();

  var finInnerR2 = new TriangularPrism();
  finInnerR2.color = [0.9, 1, 1, 1.0];
  finInnerR2.matrix = new Matrix4(finInnerRMat);
  finInnerR2.matrix.translate(0, -0.1, 0.01);
  //finInnerR2.matrix.rotate(65, 0, 0, 1);
  finInnerR2.matrix.scale(0.55, -0.1, 0.03);
  finInnerR2.render();

  // real eye
  var test_cylinder = new Cylinder();
  test_cylinder.matrix = new Matrix4(main_frontMat);
  test_cylinder.matrix.translate(0.175, 0.62, -0.025);
  test_cylinder.height = 0.25;
  test_cylinder.size = 20;
  test_cylinder.render();

  var test_cylinder = new Cylinder();
  test_cylinder.color = [0.0, 0, 0, 1];
  test_cylinder.matrix = new Matrix4(main_frontMat);
  test_cylinder.matrix.translate(0.175, 0.62, -0.027);
  test_cylinder.height = 0.26;
  test_cylinder.size = 3;
  test_cylinder.render();

  // top crown
  var crown = new Cube();
  crown.color = [1.0, 1, 0, 1.0];
  crown.matrix = new Matrix4(spineMat);
  crown.matrix.translate(0.1, 0.5, 0.025);
  //crown.matrix.rotate(0, 0, 0, 1);
  crownMat = new Matrix4(crown.matrix);
  crown.matrix.scale(0.2, 0.05, 0.15);
  crown.render();

  var crspike1 = new TriangularPrism();
  crspike1.color = [1.0, 1, 0, 1.0];
  crspike1.matrix = new Matrix4(crownMat);
  crspike1.matrix.translate(0, 0.15, 0);
  crspike1.matrix.rotate(10, 0, 0, 1);
  crspike1.matrix.scale(0.1, 0.3, 0.15);
  crspike1.render();

  var crspike2 = new TriangularPrism();
  crspike2.color = [1.0, 1, 0, 1.0];
  crspike2.matrix = new Matrix4(crownMat);
  crspike2.matrix.translate(0.1, 0.2, 0);
  crspike2.matrix.rotate(-10, 0, 0, 1);
  crspike2.matrix.scale(0.15, 0.4, 0.15);
  crspike2.render();

  var crspike3 = new TriangularPrism();
  crspike3.color = [1.0, 1, 0, 1.0];
  crspike3.matrix = new Matrix4(crownMat);
  crspike3.matrix.translate(0.17, 0.14, 0);
  crspike3.matrix.rotate(-15, 0, 0, 1);
  crspike3.matrix.scale(0.15, 0.25, 0.15);
  crspike3.render();

  // bottom crown
  var crown = new Cube();
  crown.color = [1.0, 1, 0, 1.0];
  crown.matrix = new Matrix4(spineMat);
  crown.matrix.translate(0.35, -0.3, 0.025);
  crown.matrix.rotate(180, 0, 0, 1);
  crown.matrix.scale(1.3, 0.8, 1);
  crownMat = new Matrix4(crown.matrix);
  crown.matrix.scale(0.2, 0.05, 0.15);
  crown.render();

  var crspike1 = new TriangularPrism();
  crspike1.color = [1.0, 1, 0, 1.0];
  crspike1.matrix = new Matrix4(crownMat);
  crspike1.matrix.translate(0, 0.15, 0);
  crspike1.matrix.rotate(10, 0, 0, 1);
  crspike1.matrix.scale(0.1, 0.3, 0.15);
  crspike1.render();

  var crspike2 = new TriangularPrism();
  crspike2.color = [1.0, 1, 0, 1.0];
  crspike2.matrix = new Matrix4(crownMat);
  crspike2.matrix.translate(0.1, 0.2, 0);
  crspike2.matrix.rotate(-10, 0, 0, 1);
  crspike2.matrix.scale(0.15, 0.4, 0.15);
  crspike2.render();

  var crspike3 = new TriangularPrism();
  crspike3.color = [1.0, 1, 0, 1.0];
  crspike3.matrix = new Matrix4(crownMat);
  crspike3.matrix.translate(0.17, 0.14, 0);
  crspike3.matrix.rotate(-15, 0, 0, 1);
  crspike3.matrix.scale(0.15, 0.25, 0.15);
  crspike3.render();

  // TODO make whisker

  // TODO if extra time smooth body lines out with triprisms

  // lip
  var lip = new Cube();
  lip.color = [1.0, 0.8, 0.8, 1.0];
  lip.matrix = new Matrix4(main_front2Mat);
  lip.matrix.translate(-0.001, -0.025, -0.025);
  //lip.matrix.rotate(0, 0, 0, 1);
  lip.matrix.scale(0.05, 0.65, 0.25);
  lip.render();

  // TODO back side including back tail and crowns
  var main_back = new Cube();
  main_back.color = [1, 0, 0, 1];
  main_back.matrix = new Matrix4(spineMat);
  main_back.matrix.translate(0.2, -0.3, 0);
  //main_back.matrix.translate(0, -0.7, 0);
  //main_back.matrix.rotate(0, 0, 0, 1);
  main_back.matrix.translate(0, 0, 0.1);
  if (g_animationOn) {
    main_back.matrix.rotate(Math.sin(g_seconds / 2) * 5, 0, 1, 0);
  }
  main_back.matrix.translate(0, 0, -0.1);
  var main_backMat = new Matrix4(main_back.matrix);
  main_back.matrix.scale(0.3, 0.8, 0.2);
  main_back.render();

  var main_back = new Cube();
  main_back.color = [1.0, 0.0, 0.0, 1.0];
  main_back.matrix = new Matrix4(main_backMat);
  main_back.matrix.translate(0.3, 0.15, 0.0125);
  main_back.matrix.translate(0, 0, 0.1);
  if (g_animationOn) {
    main_back.matrix.rotate(Math.sin(g_seconds / 2) * 10, 0, 1, 0);
  } else {
    main_back.matrix.rotate(g_tailAngle, 0, 1, 0);
  }
  main_back.matrix.translate(0, 0, -0.1);
  //main_back.matrix.rotate(0, 0, 0, 1);
  var main_backMat = new Matrix4(main_back.matrix);
  main_back.matrix.scale(0.2, 0.5, 0.175);
  main_back.render();

  var main_back = new Cube();
  main_back.color = [1.0, 0.0, 0.0, 1.0];
  main_back.matrix = new Matrix4(main_backMat);
  main_back.matrix.translate(0.2, 0.1, 0);
  main_back.matrix.translate(0, 0, 0.1);
  if (g_animationOn) {
    main_back.matrix.rotate(Math.sin(g_seconds / 2) * 20, 0, 1, 0);
  } else {
    main_back.matrix.rotate(g_tailAngle2, 0, 1, 0);
  }
  main_back.matrix.translate(0, 0, -0.1);
  //main_back.matrix.rotate(0, 0, 0, 1);
  var main_backMat = new Matrix4(main_back.matrix);
  main_back.matrix.scale(0.1, 0.2, 0.2);
  main_back.render();

  // tail
  var tail1 = new Cube();
  tail1.color = [1.0, 0.0, 0.0, 1.0];
  tail1.matrix = new Matrix4(main_backMat);
  tail1.matrix.translate(0.05, 0, 0);
  tail1.matrix.rotate(-10, 0, 0, 1);
  var tail1Mat = new Matrix4(tail1.matrix);
  tail1.matrix.scale(0.05, 0.5, 0.2);
  tail1.render();

  var tail2 = new Cube();
  tail2.color = [1.0, 0.0, 0.0, 1.0];
  tail2.matrix = new Matrix4(main_backMat);
  tail2.matrix.translate(0.09, 0.04, 0);
  tail2.matrix.rotate(-80, 0, 0, 1);
  var tail2Mat = new Matrix4(tail2.matrix);
  tail2.matrix.scale(0.05, 0.4, 0.2);
  tail2.render();

  var tailInner = new TriangularPrism();
  tailInner.color = [1.0, 1.0, 1.0, 1.0];
  tailInner.matrix = new Matrix4(main_backMat);
  tailInner.matrix.translate(0.18, 0.15, 0.05);
  tailInner.matrix.rotate(135, 0, 0, 1);
  var tailInnerMat = new Matrix4(tail2.matrix);
  tailInner.matrix.scale(0.475, 0.35, 0.1);
  tailInner.render();

  //var yube2 = new Cube();
  //yube2.color = [1.0, 1.0, 0.0, 1.0];
  //yube2.matrix.translate(-.7, -.5, -.5);
  //yube2.matrix.rotate(0, 45, 45, 1);
  //yube2.matrix.scale(1.5, 1, 0.5);
  //yube2.render();
}

function click(ev) {
  //let [x, y] = convertCoordsEvToGL(ev);
  //
  //if (g_selectedType == POINT) {
  //  let point = new Point();
  //  point.position = [x, y];
  //  point.color = g_selectedColor.slice();
  //  point.size = g_selectedSize;
  //  g_shapes_list.push(point);
  //} else if (g_selectedType == TRIANGLE) {
  //  let point = new Triangle();
  //  point.position = [x, y];
  //  point.color = g_selectedColor.slice();
  //  point.size = g_selectedSize;
  //  g_shapes_list.push(point);
  //} else {
  //  let point = new Circle();
  //  point.segments = g_selectedSegments;
  //  point.position = [x, y];
  //  point.color = g_selectedColor.slice();
  //  point.size = g_selectedSize;
  //  g_shapes_list.push(point);
  //}
  //
  //();
}
