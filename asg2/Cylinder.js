class Cylinder {
  constructor() {
    this.type = "cylinder";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;         // radius
    this.height = 0.1;       // height along Z
    this.segments = 20;
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;
    const radius = this.size / 200;
    const height = this.height;
    const segments = this.segments;

    // Pass matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const angleStep = 360 / segments;

    for (let angle = 0; angle < 360; angle += angleStep) {
      const angle1 = angle * Math.PI / 180;
      const angle2 = (angle + angleStep) * Math.PI / 180;

      const x1 = Math.cos(angle1) * radius;
      const y1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius;
      const y2 = Math.sin(angle2) * radius;

      const zBase = 0.0;
      const zTop = height;

      const color_shade = 1.0;
      gl.uniform4f(
        u_FragColor,
        rgba[0] * color_shade,
        rgba[1] * color_shade,
        rgba[2] * color_shade,
        rgba[3]
      );

      drawTriangle3D([
        x1, y1, zBase,
        x2, y2, zBase,
        x1, y1, zTop
      ]);

      drawTriangle3D([
        x1, y1, zTop,
        x2, y2, zBase,
        x2, y2, zTop
      ]);

      drawTriangle3D([
        0, 0, zBase,
        x1, y1, zBase,
        x2, y2, zBase
      ]);

      drawTriangle3D([
        0, 0, zTop,
        x2, y2, zTop,
        x1, y1, zTop
      ]);
    }
  }
}
