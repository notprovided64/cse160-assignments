// import "./styles.css";
// import { initShaders } from "../lib/cuon-utils";
//
// structure taken from lab 4
//

function getContext() {
  var canvas = document.getElementById("webgl");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.2, 0.2, 0.25, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  window.addEventListener("resize", (e) => {
    gl.canvas.width = window.innerWidth;
    gl.canvas.height = window.innerHeight;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  });

  return gl;
}

g_lightPos = [0, 1, -2];

function addHtmlActions() {
  document
    .getElementById("lightSlideX")
    .addEventListener("mousemove", function (ev) {
      if (ev.buttons == 1) {
        g_lightPos[0] = this.value / 100;
      }
    });
  document
    .getElementById("lightSlideY")
    .addEventListener("mousemove", function (ev) {
      if (ev.buttons == 1) {
        g_lightPos[1] = this.value / 100;
      }
    });
  document
    .getElementById("lightSlideZ")
    .addEventListener("mousemove", function (ev) {
      if (ev.buttons == 1) {
        g_lightPos[2] = this.value / 100;
      }
    });
}

// Get the rendering context for WebGL
var gl = getContext();

const camera = new Camera([0, 1, 5], [0, 1, 0]);
camera.position.elements[1] = -1;

const controls = new Controls(gl, camera);

const ball = new Sphere(10, 100, 100); // radius 50, 20x20 resolution
ball.position.elements[2] = -40;
ball.position.elements[0] = -1;

const sky = new Cube(-100, new Vector3([1.0, 0.0, 0.0]));

const box = new Cube(1, new Vector3([0.0, 1.0, 0.0]));
box.position.elements[2] = -2;
box.position.elements[0] = 2;

const light = new Cube(1);

let objects = [sky, ball, box, light];

function updatePositions() {
  light.position.elements[0] = g_lightPos[0];
  light.position.elements[1] = g_lightPos[1];
  light.position.elements[2] = g_lightPos[2];
}

function toggleLighting() {
  objects.forEach((element) => {
    element.showLighting = !element.showLighting;
  });
}

function toggleShowNormals() {
  objects.forEach((element) => {
    element.showNormals = !element.showNormals;
  });
}

addHtmlActions();

function tick() {
  updatePositions();
  controls.update();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  objects.forEach((element) => {
    element.render(gl, camera);
  });

  requestAnimationFrame(tick);
}

tick();
