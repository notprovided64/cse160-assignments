// based on format of lab cube code and functionality of lab model.js
//
class Model {
  constructor(gl, filePath) {
    this.gl = gl;
    this.filePath = filePath;
    this.loader = new OBJLoader(filePath);

    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;

    this.vertexShader = "";
    this.fragmentShader = "";
    this.program = null;

    this.vertices = null;
    this.normals = null;
    this.indices = null;

    this.color = new Vector3([1.0, 1.0, 1.0]);
    this.position = new Vector3([0, 0, 0]);
    this.rotation = new Vector3([0, 0, 0]);
    this.scale = new Vector3([1, 1, 1]);

    this.modelMatrix = new Matrix4();
    this.normalMatrix = new Matrix4();

    this.showNormals = false;
    this.showLighting = true;

    this.loaded = false;

    this.loader.parseModel().then(() => {
      const data = this.loader.getModelData();
      this.vertices = new Float32Array(data.vertices);
      this.normals = new Float32Array(data.normals);

      this.loaded = true;
    });
  }

  setProgram(gl) {
    // since all these shaders are exactly the same everywhere, really should have put them somewhere else
    this.vertexShader = `
    precision mediump float;
    attribute vec3 position;
    attribute vec3 normal;

    uniform mat4 modelMatrix;
    uniform mat4 normalMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 projectionMatrix;

    varying vec3 vNormal;
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
        gl_FragColor = vec4((vNormal + 1.0) / 2.0, 1.0);
      } else {
        gl_FragColor = vec4(color, 1.0);
      }

      if (showLighting) {
        vec3 lightVec = normalize(lightPos - vec3(vPosition));
        vec3 n = normalize(vNormal);
        float diff = max(dot(n, lightVec), 0.0);

        vec3 r = reflect(-lightVec, n);
        vec3 e = normalize(cameraPos - vec3(vPosition));
        float spec = pow(max(dot(e, r), 0.0), 100.0);

        vec3 diffuse = vec3(gl_FragColor) * diff;
        vec3 ambient = vec3(gl_FragColor) * 0.3;

        gl_FragColor = vec4(diffuse + ambient + spec, 1.0);
      }
    }`;

    this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
    if (!this.program) {
      console.error("Failed to compile shaders for model:", this.filePath);
    }
  }

  calculateMatrix() {
    const [x, y, z] = this.position.elements;
    const [rx, ry, rz] = this.rotation.elements;
    const [sx, sy, sz] = this.scale.elements;

    this.modelMatrix
      .setTranslate(x, y, z)
      .rotate(rx, 1, 0, 0)
      .rotate(ry, 0, 1, 0)
      .rotate(rz, 0, 0, 1)
      .scale(sx, sy, sz);

    this.normalMatrix.set(this.modelMatrix).invert().transpose();
  }

  render(gl, camera, lightPos) {
    if (!this.loaded) return;

    if (this.program === null) this.setProgram(gl);
    gl.useProgram(this.program);

    if (this.vertexBuffer === null) this.vertexBuffer = gl.createBuffer();
    if (this.normalBuffer === null) this.normalBuffer = gl.createBuffer();
    if (this.indexBuffer === null) this.indexBuffer = gl.createBuffer();

    this.calculateMatrix();
    camera.calculateViewProjection();

    const position = gl.getAttribLocation(this.program, "position");
    const normal = gl.getAttribLocation(this.program, "normal");

    const uModel = gl.getUniformLocation(this.program, "modelMatrix");
    const uNormal = gl.getUniformLocation(this.program, "normalMatrix");
    const uView = gl.getUniformLocation(this.program, "viewMatrix");
    const uProj = gl.getUniformLocation(this.program, "projectionMatrix");

    const uColor = gl.getUniformLocation(this.program, "color");
    const uLight = gl.getUniformLocation(this.program, "lightPos");
    const uCamera = gl.getUniformLocation(this.program, "cameraPos");

    const uShowNormals = gl.getUniformLocation(this.program, "showNormals");
    const uShowLighting = gl.getUniformLocation(this.program, "showLighting");

    gl.uniformMatrix4fv(uModel, false, this.modelMatrix.elements);
    gl.uniformMatrix4fv(uNormal, false, this.normalMatrix.elements);
    gl.uniformMatrix4fv(uView, false, camera.viewMatrix.elements);
    gl.uniformMatrix4fv(uProj, false, camera.projectionMatrix.elements);

    gl.uniform3f(uColor, ...this.color.elements);
    gl.uniform3f(uLight, ...lightPos);
    gl.uniform3f(uCamera, ...camera.position.elements);
    gl.uniform1i(uShowNormals, this.showNormals);
    gl.uniform1i(uShowLighting, this.showLighting);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
  }
}
