export class GravityManager {

  constructor(){

    this.sensor = null;

  }

  start(callback){

    if('GravitySensor' in window){

      this.sensor = new GravitySensor({
        frequency:60
      });

      this.sensor.addEventListener(
        'reading',
        () => {

          callback({
            x:this.sensor.x,
            y:this.sensor.y,
            z:this.sensor.z
          });

        }
      );

      this.sensor.start();

    }

  }

}