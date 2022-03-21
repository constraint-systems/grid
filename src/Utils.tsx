import { State } from "./State";

export const pixelToWorld = (
  camera: THREE.PerspectiveCamera,
  initHeight: number,
  value: number
) => {
  const baseZ = 5;
  const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * baseZ;
  return value * (visibleHeight / initHeight);
};

export const setRay = (state: State, x: number, y: number) => {
  const { tempRay, ray } = state;
  const { canvas, camera } = state.gl;
  tempRay.set(
    (x / canvas.clientWidth) * 2 - 1,
    -(y / canvas.clientHeight) * 2 + 1,
    0.5
  );
  tempRay.unproject(camera!);
  tempRay.sub(camera!.position).normalize();
  const distance = -camera!.position.z / tempRay.z;
  ray.copy(camera!.position).add(tempRay.multiplyScalar(distance));
  return ray;
};

export const worldToCanvasPixel = (state: State, ray: THREE.Vector3) => {
  const { canvas, camera } = state.gl;
  const baseZ = 5;
  const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * baseZ;
  const basePixel = visibleHeight / state.initHeight;
  return [
    ray.x / basePixel + state.width / 2,
    state.height - (ray.y / basePixel + state.height / 2),
  ];
};
