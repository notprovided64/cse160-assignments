class Cube {
  constructor() {
    this.type = "cube";
    //this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    //this.size = 5.0;
    //this.segments = 10;
    this.matrix = new Matrix4();
  }

  render() {
    var rgba = this.color;

    var color_shade = 1

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0] * color_shade, rgba[1] * color_shade, rgba[2] * color_shade, rgba[3]);

    // pass matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements)

    // front of cube
    drawTriangle3D([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0]);
    drawTriangle3D([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0]);

    color_shade = 0.9
    gl.uniform4f(u_FragColor, rgba[0] * color_shade, rgba[1] * color_shade, rgba[2] * color_shade, rgba[3]);
    // back
    drawTriangle3D([0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0]);
    drawTriangle3D([0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0]);

    color_shade = 0.8
    gl.uniform4f(u_FragColor, rgba[0] * color_shade, rgba[1] * color_shade, rgba[2] * color_shade, rgba[3]);
    // top
    drawTriangle3D([0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0]);
    drawTriangle3D([0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0]);

    color_shade = 0.7
    gl.uniform4f(u_FragColor, rgba[0] * color_shade, rgba[1] * color_shade, rgba[2] * color_shade, rgba[3]);
    // bot
    drawTriangle3D([0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0]);
    drawTriangle3D([0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]);

    color_shade = 0.6
    gl.uniform4f(u_FragColor, rgba[0] * color_shade, rgba[1] * color_shade, rgba[2] * color_shade, rgba[3]);
    // right
    drawTriangle3D([1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0]);
    drawTriangle3D([1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0]);

    color_shade = 0.5
    gl.uniform4f(u_FragColor, rgba[0] * color_shade, rgba[1] * color_shade, rgba[2] * color_shade, rgba[3]);
    // left
    drawTriangle3D([0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0]);
    drawTriangle3D([0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0]);
    }
}
