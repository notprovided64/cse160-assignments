// DrawTriangle.js (c) 2012 matsuda
function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById("example");
  if (!canvas) {
    console.log("Failed to retrieve the <canvas> element");
    return false;
  }

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext("2d");

  // draw background
  ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //v1
  let v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
}

function drawBackground() {
  const canvas = document.getElementById("example");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  const canvas = document.getElementById("example");
  const ctx = canvas.getContext("2d");
  let x = v.elements[0] * 20;
  let y = v.elements[1] * 20;

  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  // ctx.lineWidth = 10;
  ctx.strokeStyle = color;
  ctx.lineTo(cx + x, cy - y);
  ctx.stroke();
}

function handleDrawEvent() {
  drawBackground();

  let x = parseFloat(document.getElementById("xinput").value);
  let y = parseFloat(document.getElementById("yinput").value);
  let v1 = new Vector3([x, y, 0]);
  drawVector(v1, "red");

  let x2 = parseFloat(document.getElementById("xinput2").value);
  let y2 = parseFloat(document.getElementById("yinput2").value);
  let v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  drawBackground();

  let x = parseFloat(document.getElementById("xinput").value);
  let y = parseFloat(document.getElementById("yinput").value);
  let v1 = new Vector3([x, y, 0]);
  drawVector(v1, "red");

  let x2 = parseFloat(document.getElementById("xinput2").value);
  let y2 = parseFloat(document.getElementById("yinput2").value);
  let v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");

  const selectElement = document.getElementById("op");
  let scalar = parseFloat(document.getElementById("scalar").value);
  const selectedOp = selectElement.value;
  switch (selectedOp) {
    case "add":
      v1.add(v2);
      drawVector(v1, "green");
      break;
    case "sub":
      v1.sub(v2);
      drawVector(v1, "green");
      break;
    case "mul":
      v1.mul(scalar);
      drawVector(v1, "green");
      v2.mul(scalar);
      drawVector(v2, "green");
      break;
    case "div":
      v1.div(scalar);
      drawVector(v1, "green");
      v2.div(scalar);
      drawVector(v2, "green");
      break;
    case "mag":
      let magnitude = v1.magnitude();
      let magnitude2 = v2.magnitude();
      console.log("Magnitude v1:", magnitude);
      console.log("Magnitude v2:", magnitude2);
      break;
    case "nor":
      v1.normalize();
      drawVector(v1, "green");
      v2.normalize();
      drawVector(v2, "green");
      break;
    case "ang":
      console.log("Angle Between:", angleBetween(v1, v2));
      break;
    case "are":
      let area = Vector3.cross(v1, v2).magnitude();
      console.log("Area:", area);
      break;
    default:
      console.log("Invalid operation");
  }
}

function angleBetween(v1, v2) {
  let dot = Vector3.dot(v1, v2);
  let mag1 = v1.magnitude();
  let mag2 = v2.magnitude();
  let cosTheta = dot / (mag1 * mag2);
  return Math.acos(cosTheta) * (180 / Math.PI);
}
