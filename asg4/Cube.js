// adapted from sphere.js
// (which was taken from lab code)
//
// import { Vector3, Matrix4 } from "../../lib/cuon-matrix-cse160";
// import { createProgram } from "../../lib/cuon-utils";

class Cube {
  constructor(size = 1.0, color = new Vector3([0.8, 0.8, 0, 1])) {
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.uvBuffer = null;
    this.normalBuffer = null;

    this.vertexShader = "";
    this.fragmentShader = "";
    this.program = null;

    this.vertices = null;
    this.indices = null;
    this.uvs = null;
    this.normals = null;

    this.color = color;

    this.position = new Vector3([0, 0, 0]);
    this.rotation = new Vector3([0, 0, 0]);
    this.scale = new Vector3([1, 1, 1]);
    this.modelMatrix = new Matrix4();
    this.normalMatrix = new Matrix4();

    this.showNormals = false;
    this.showLighting = true;

    this.generateCube(size);
  }

  setProgram(gl) {
    this.vertexShader = `
    precision mediump float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;

    uniform mat4 modelMatrix;
    uniform mat4 normalMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 projectionMatrix;

    varying vec3 vNormal;
    varying float vHeight;
    varying vec4 vPosition;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;

      vNormal = (normalMatrix * vec4(normal, 1.0)).xyz;

      vPosition = worldPosition;
    }`;

    this.fragmentShader = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec4 vPosition;

    uniform vec3 color;
    uniform vec3 lightPos;
    uniform vec3 cameraPos;
    uniform bool showNormals;
    uniform bool showLighting;


    void main() {
      if (showNormals) {
        gl_FragColor = vec4((vNormal+1.0)/2.0, 1.0);
      } else {
        gl_FragColor = vec4(color, 1.0);
      }

      if (showLighting) {
        vec3 lightVec =  lightPos - vec3(vPosition);

        // hacky distance visualization
        //
        // float r = length(lightVec);
        // if (r < 5.0) {
        //   gl_FragColor = vec4(1, 0, 0, 1.0);
        // } else if (r < 50.0) {
        //   gl_FragColor = vec4(0, 1, 0, 1.0);
        // }

        // non realistic lighting r^2ed
        //
        // gl_FragColor = vec4(vec3(gl_FragColor)/(r*r / 500.0), 1);
        
        // n dot l
        vec3 l = normalize(lightVec);
        vec3 n = normalize(vNormal);
        float prod = max(dot(n,l), 0.0);

        vec3 r = reflect(-l, n);
        vec3 e = normalize(cameraPos - vec3(vPosition));

        vec3 diffuse = vec3(gl_FragColor) * prod;
        vec3 ambient = vec3(gl_FragColor) * 0.3;
        float specular = pow(max(dot(e,r), 0.0), 100.0);

        gl_FragColor = vec4(diffuse+ambient+specular, 1.0);
      }

    }`;
    // old frag shader code
    // float h = (vHeight * 0.1 + 1.0) / 5.0;
    // h -= .2;
    // vec3 lowColor = vec3(1.0, 0.3, 0.3);
    // vec3 highColor = vec3(0.0, 0.0, 0.0);
    // vec3 color = mix(lowColor, highColor, h);

    this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
    if (!this.program) console.error("couldn't compile shaders for ", this);
  }

  generateCube(size) {
    const s = size / 2;

    // prettier-ignore
    const vertices = [
      // front
      -s, -s,  s,   s, -s,  s,   s,  s,  s,  -s,  s,  s,
      // back
      -s, -s, -s,  -s,  s, -s,   s,  s, -s,   s, -s, -s,
      // top
      -s,  s, -s,  -s,  s,  s,   s,  s,  s,   s,  s, -s,
      // bottom
      -s, -s, -s,   s, -s, -s,   s, -s,  s,  -s, -s,  s,
      // right
       s, -s, -s,   s,  s, -s,   s,  s,  s,   s, -s,  s,
      // left
      -s, -s, -s,  -s, -s,  s,  -s,  s,  s,  -s,  s, -s,
    ];

    // prettier-ignore
    const normals = [
      // front
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
      // back
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      // top
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
      // bottom
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // right
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
      // left
     -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ];

    const uvs = new Array(6 * 4 * 2).fill(0); // UVs can be added as needed
    const indices = [];
    for (let i = 0; i < 6; i++) {
      const offset = i * 4;
      indices.push(offset, offset + 1, offset + 2);
      indices.push(offset, offset + 2, offset + 3);
    }

    this.vertices = new Float32Array(vertices);
    this.normals = new Float32Array(normals);
    this.uvs = new Float32Array(uvs);
    this.indices = new Uint16Array(indices);
  }

  calculateMatrix() {
    let [x, y, z] = this.position.elements;
    let [rx, ry, rz] = this.rotation.elements;
    let [sx, sy, sz] = this.scale.elements;

    this.modelMatrix
      .setTranslate(x, y, z)
      .rotate(rx, 1, 0, 0)
      .rotate(ry, 0, 1, 0)
      .rotate(rz, 0, 0, 1)
      .scale(sx, sy, sz);

    this.normalMatrix.set(this.modelMatrix).invert().transpose();
  }

  render(gl, camera, lightpos1) {
    if (this.program === null) {
      this.setProgram(gl);
    }

    gl.useProgram(this.program);

    if (this.vertexBuffer === null) this.vertexBuffer = gl.createBuffer();
    if (this.indexBuffer === null) this.indexBuffer = gl.createBuffer();
    if (this.uvBuffer === null) this.uvBuffer = gl.createBuffer();
    if (this.normalBuffer === null) this.normalBuffer = gl.createBuffer();

    this.calculateMatrix();
    camera.calculateViewProjection();

    const position = gl.getAttribLocation(this.program, "position");
    const uv = gl.getAttribLocation(this.program, "uv");
    const normal = gl.getAttribLocation(this.program, "normal");
    const modelMatrix = gl.getUniformLocation(this.program, "modelMatrix");
    const normalMatrix = gl.getUniformLocation(this.program, "normalMatrix");
    const viewMatrix = gl.getUniformLocation(this.program, "viewMatrix");
    const projectionMatrix = gl.getUniformLocation(
      this.program,
      "projectionMatrix",
    );

    const showNormals = gl.getUniformLocation(this.program, "showNormals");
    const showLighting = gl.getUniformLocation(this.program, "showLighting");
    const color = gl.getUniformLocation(this.program, "color");
    const lightPos = gl.getUniformLocation(this.program, "lightPos");
    const cameraPos = gl.getUniformLocation(this.program, "cameraPos");

    gl.uniformMatrix4fv(modelMatrix, false, this.modelMatrix.elements);
    gl.uniformMatrix4fv(normalMatrix, false, this.normalMatrix.elements);
    gl.uniformMatrix4fv(viewMatrix, false, camera.viewMatrix.elements);
    gl.uniformMatrix4fv(
      projectionMatrix,
      false,
      camera.projectionMatrix.elements,
    );

    gl.uniform1i(showNormals, this.showNormals);
    gl.uniform1i(showLighting, this.showLighting);
    gl.uniform3f(color, ...this.color.elements);
    gl.uniform3f(lightPos, ...this.color.elements);
    gl.uniform3f(lightPos, ...lightpos1);
    gl.uniform3f(cameraPos, ...camera.position.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(uv);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.DYNAMIC_DRAW);

    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  }
}
