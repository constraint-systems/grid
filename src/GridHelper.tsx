import {
  LineSegments,
  LineBasicMaterial,
  Float32BufferAttribute,
  BufferGeometry,
} from "three";

class GridHelper extends LineSegments {
  constructor(
    sizeX = 10,
    sizeY = 10,
    divisionsX = 10,
    divisionsY = 10,
    color = 0x444444
  ) {
    const stepX = sizeX / divisionsX;
    const halfSizeX = sizeX / 2;
    const stepY = sizeY / divisionsY;
    const halfSizeY = sizeY / 2;

    const vertices = [];

    for (let r = 0; r <= divisionsY; r++) {
      for (let c = 0; c <= divisionsX; c++) {
        if (r !== divisionsY) {
          vertices.push(c * stepX - halfSizeX, r * stepY - halfSizeY, 0);
          vertices.push(
            c * stepX - halfSizeX,
            r * stepY + stepY - halfSizeY,
            0
          );
        }
        if (c !== divisionsX) {
          vertices.push(c * stepX - halfSizeX, r * stepY - halfSizeY, 0);
          vertices.push(
            c * stepX + stepX - halfSizeX,
            r * stepY - halfSizeY,
            0
          );
        }
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

    const material = new LineBasicMaterial({
      toneMapped: false,
      color,
    });

    super(geometry, material);
  }
}

export default GridHelper;
