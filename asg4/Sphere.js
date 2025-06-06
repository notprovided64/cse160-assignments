// Taken from previous lab code
//
class Sphere {
  constructor(
    radius = 0.5,
    widthSegments = 3,
    heightSegments = 2,
    color = new Vector3([1.0, 0.0, 1.0]),
  ) {
    // buffers
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.uvBuffer = null;
    this.normalBuffer = null;

    //shader programs
    this.vertexShader = ``;
    this.fragmentShader = ``;
    this.program = null;

    // data arrays
    this.vertices = null;
    this.indices = null;
    this.uvs = null;
    this.normals = null;

    // transformations
    this.position = new Vector3([0, 0, 0]);
    this.rotation = new Vector3([0, 0, 0]);
    this.scale = new Vector3([1, 1, 1]);
    this.modelMatrix = new Matrix4();
    this.normalMatrix = new Matrix4();

    this.showNormals = false;
    this.showLighting = true;
    this.color = color;

    widthSegments = Math.max(3, Math.floor(widthSegments));
    heightSegments = Math.max(2, Math.floor(heightSegments));

    this.generateSphere(radius, widthSegments, heightSegments);
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

    this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
    if (!this.program) console.error("couldn't compile shaders for ", this);
  }

  generateSphere(radius, widthSegments, heightSegments) {
    let index = 0;
    const grid = [];

    const vertex = new Vector3();
    const normal = new Vector3();

    // buffers

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];

    for (let j = 0; j <= heightSegments; j++) {
      const row = [];

      const v = j / heightSegments;

      let uOffset = 0;
      // special cases for poles
      if (j === 0) {
        uOffset = 0.5 / widthSegments;
      } else if (j === heightSegments) {
        uOffset = -0.5 / widthSegments;
      }

      for (let i = 0; i <= widthSegments; i++) {
        const u = i / widthSegments;

        vertex.elements[0] =
          -radius * Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI);

        vertex.elements[1] = radius * Math.cos(v * Math.PI);

        vertex.elements[2] =
          radius * Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI);

        vertices.push(...vertex.elements);
        normal.set(vertex).normalize();

        normals.push(...normal.elements);

        uvs.push(u + uOffset, 1 - v);

        row.push(index++);
      }

      grid.push(row);
    }

    for (let j = 0; j < heightSegments; j++) {
      for (let i = 0; i < widthSegments; i++) {
        const a = grid[j][i + 1];
        const b = grid[j][i];
        const c = grid[j + 1][i];
        const d = grid[j + 1][i + 1];

        if (j !== 0) indices.push(a, b, d);
        if (j !== heightSegments - 1) indices.push(b, c, d);
      }
    }

    this.vertices = new Float32Array(vertices);
    this.indices = new Uint16Array(indices);
    this.uvs = new Float32Array(uvs);
    this.normals = new Float32Array(normals);
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
