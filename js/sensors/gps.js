export class GPSManager {

  start(callback){

    navigator.geolocation.watchPosition(
      pos => {

        callback({
          lat:pos.coords.latitude,
          lng:pos.coords.longitude,
          speed:pos.coords.speed
        });

      }
    );

  }

}