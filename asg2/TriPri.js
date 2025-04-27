class TriangularPrism {
  constructor() {
    this.type = "triangular_prism";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const color_shade = 1.0;
    gl.uniform4f(
      u_FragColor,
      rgba[0] * color_shade,
      rgba[1] * color_shade,
      rgba[2] * color_shade,
      rgba[3]
    );

    const p1 = [-0.5, -0.5, 0.0];
    const p2 = [ 0.5, -0.5, 0.0];
    const p3 = [ 0.0,  0.5, 0.0];

    const p1t = [p1[0], p1[1], 1.0];
    const p2t = [p2[0], p2[1], 1.0];
    const p3t = [p3[0], p3[1], 1.0];

    // top bottom
    drawTriangle3D([...p1, ...p2, ...p3]);

    drawTriangle3D([...p1t, ...p3t, ...p2t]);

    // side faces
    drawTriangle3D([...p1, ...p2, ...p2t]);
    drawTriangle3D([...p1, ...p2t, ...p1t]);

    drawTriangle3D([...p2, ...p3, ...p3t]);
    drawTriangle3D([...p2, ...p3t, ...p2t]);

    drawTriangle3D([...p3, ...p1, ...p1t]);
    drawTriangle3D([...p3, ...p1t, ...p3t]);
  }
}
