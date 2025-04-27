class Triangle {
  constructor() {
    this.type = "triangle";
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
    this.colorPhase = 0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    // Pass the position of a point to a_Position variablek
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
    // Draw
    var d = this.size / 200;

    let angle = g_rotationAngle;

    let [x, y] = xy;
    const rotate = ([px, py]) => {
      let dx = px - x;
      let dy = py - y;
      let cosA = Math.cos(angle);
      let sinA = Math.sin(angle);
      return [x + dx * cosA - dy * sinA, y + dx * sinA + dy * cosA];
    };

    const p1 = rotate([x, y]);
    const p2 = rotate([x + d, y]);
    const p3 = rotate([x, y + d]);

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, size);
    drawTriangle([...p1, ...p2, ...p3]);
  }
}

function drawTriangle(vertices) {
  var n = 3;

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log("faileddddd to create buffer for triangle");
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  var a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("noaposss");
    return -1;
  }

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3D(vertices) {
  var n = 3;

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log("faileddddd to create buffer for triangle");
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  var a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("noaposss");
    return -1;
  }

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function hexToRgba(hex, alpha = 1.0) {
  hex = hex.replace(/^#/, "");

  let bigint = parseInt(hex, 16);
  let r = ((bigint >> 16) & 255) / 255.0;
  let g = ((bigint >> 8) & 255) / 255.0;
  let b = (bigint & 255) / 255.0;

  return [r, g, b, alpha];
}
