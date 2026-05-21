export class GyroscopeManager {

  constructor(){

    this.data = {
      alpha:0,
      beta:0,
      gamma:0
    };

  }

  start(){

    window.addEventListener(
      'deviceorientation',
      e => {

        this.data.alpha = e.alpha;
        this.data.beta = e.beta;
        this.data.gamma = e.gamma;

      }
    );

  }

  getData(){

    return this.data;

  }

}