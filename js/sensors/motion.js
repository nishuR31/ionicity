export class MotionManager {

  constructor(){

    this.motion = {};

  }

  start(){

    window.addEventListener(
      'devicemotion',
      e => {

        this.motion = {
          x:e.acceleration.x,
          y:e.acceleration.y,
          z:e.acceleration.z
        };

      }
    );

  }

  get(){

    return this.motion;

  }

}