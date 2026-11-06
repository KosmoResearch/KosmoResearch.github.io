import { invert4, rotate4, translate4 } from './camera-math.mjs';

// Room-facing composition matched to the supplied reference image.
// Offsets are in the original camera's right/down/forward coordinate frame.
export function createInitialView(camera) {
  const pose = translate4(invert4(camera.view), -0.95, 1.85, 3);
  return {
    ...camera,
    view: invert4(rotate4(pose, 0.18, 1, 0, 0)),
    fx: camera.fx * 1.18,
    fy: camera.fy * 1.18,
    distance: 2.4,
  };
}
