export class MotionManager {
  constructor() {
    this.motion = {};
  }

  start() {
    globalThis.addEventListener("devicemotion", (e) => {
      this.motion = {
        x: e.acceleration.x,
        y: e.acceleration.y,
        z: e.acceleration.z,
      };
    });
  }

  get() {
    return this.motion;
  }
}
